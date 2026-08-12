import { expect, test } from '@playwright/test';
import { defineTaskJourneyTest } from './support/journey-check.js';
import { TASKS } from './support/task-config.js';
import { patchWebkitTouchPoints, sanitize, trackPageErrors } from './support/helpers.js';

defineTaskJourneyTest('medication-questionnaire', TASKS.medication_questionnaire);

/**
 * The card scrolls vertically, which makes it clip horizontally too, so a focus ring on a
 * full-width control is only fully drawn if the card keeps a wide enough side gutter for it
 * (--qsc-gutter in tasks/question-screen/styles.css). Runs wherever a keyboard is
 * the input, since that is where focus rings are seen.
 */
test('focus rings are not clipped at the card edges', async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);
  await patchWebkitTouchPoints(page);

  const participantId = `journey_${sanitize(testInfo.project.name)}_medication-questionnaire-focus`;
  await page.goto(`${TASKS.medication_questionnaire.url}?participant_id=${participantId}`);

  const screen = page.locator('.qsc-screen');
  await expect(screen).toBeVisible({ timeout: 15000 });
  test.skip(
    !(await screen.evaluate((el) => el.classList.contains('qsc-keyboard'))),
    'focus rings only apply where a keyboard drives the questionnaire'
  );

  await page.keyboard.press('Enter'); // past the intro, onto the first question
  await expect(page.locator('#qsc-text')).toBeVisible({ timeout: 15000 });

  const clearance = await page.evaluate(() => {
    const card = document.querySelector('.qsc-screen');
    const cardBox = card.getBoundingClientRect();
    const ring =
      parseFloat(getComputedStyle(card).getPropertyValue('--qsc-focus-ring')) +
      parseFloat(getComputedStyle(card).getPropertyValue('--qsc-focus-offset'));

    return [...card.querySelectorAll('input, select, button')].map((control) => {
      const box = control.getBoundingClientRect();
      return {
        control: control.id || control.className,
        left: box.left - cardBox.left - ring,
        right: cardBox.right - box.right - ring,
      };
    });
  });

  expect(clearance.length, 'there should be controls on screen to check').toBeGreaterThan(0);
  for (const { control, left, right } of clearance) {
    expect(left, `${control} should leave room for its focus ring on the left`).toBeGreaterThanOrEqual(0);
    expect(right, `${control} should leave room for its focus ring on the right`).toBeGreaterThanOrEqual(0);
  }

  // A card that clips its ring horizontally would also be able to scroll sideways.
  const sideScroll = await screen.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(sideScroll, 'the card should not scroll sideways').toBeLessThanOrEqual(1);

  expect(errors, `no console/page errors expected, got:\n${errors.join('\n')}`).toEqual([]);
});

/**
 * The main journey answers the start date with the selects. This covers the other way off
 * that screen: a participant who has the medicine but has not taken any of it yet, whose
 * blank date has to be distinguishable in the data from a date simply left blank.
 */
test('"I haven\'t started taking it yet" records a blank start date flagged as not started', async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  await patchWebkitTouchPoints(page);

  const participantId = `journey_${sanitize(testInfo.project.name)}_medication-questionnaire-not-started`;
  await page.goto(`${TASKS.medication_questionnaire.url}?participant_id=${participantId}`);

  const screen = page.locator('.qsc-screen');
  await expect(screen, 'the first screen should appear').toBeVisible({ timeout: 15000 });
  const keyboardMode = await screen.evaluate((el) => el.classList.contains('qsc-keyboard'));

  const advance = () => page.locator('#qsc-continue').click();

  await advance(); // past the intro

  await page.locator('#qsc-text').fill('Sertraline');
  await advance();

  // The dose screen is a typed field with a keyboard and the on-screen keypad without one.
  const typedNumber = page.locator('#qsc-number');
  if (keyboardMode) {
    await expect(typedNumber).toBeVisible({ timeout: 15000 });
    await typedNumber.fill('50');
  } else {
    await expect(page.locator('.qsc-keypad')).toBeVisible({ timeout: 15000 });
    await page.locator('.qsc-key[data-key="5"]').click();
    await page.locator('.qsc-key[data-key="0"]').click();
  }
  await advance();

  await page.locator('.qsc-choice').first().click(); // one pill a day, ends the screen outright

  const notStarted = page.locator('#qsc-not-started');
  await expect(notStarted, 'the start date screen should offer a way out for an unstarted medicine').toBeVisible({
    timeout: 15000,
  });
  await notStarted.click();

  await expect(page.locator('#qsc-list-yes'), 'the questionnaire should move on to the last question').toBeVisible({
    timeout: 15000,
  });

  const date = await page.evaluate(
    () => window.jsPsych.data.get().filter({ question_name: 'medication_start_date' }).values()[0]
  );

  expect(date.response, 'no part of the date should be recorded').toEqual({ day: null, month: null, year: null });
  expect(date.not_started, 'the answer should be flagged as not started').toBe(true);
  expect(date.unsure, 'not started is a definite answer, not a missing one').toBe(false);
  expect(date.response_label, 'the readable answer should say the medicine has not been started').toContain(
    "haven't started"
  );

  expect(errors, `no console/page errors expected, got:\n${errors.join('\n')}`).toEqual([]);
});
