import { expect, test } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { armTapAfterAppearing } from './support/helpers.js';
import { READY_TAP_LOCKOUT_MS, TASKS } from './support/task-config.js';

// tasks/piggy-banks/vigour-instructions.js startConfirmation sets post_trial_gap: 300, so a
// trial started by a tap does not render immediately. Any "the tap was ignored" assertion has
// to outlast that gap, or it passes simply by looking too early.
const IGNORED_TAP_SETTLE_MS = 500;

async function advanceToVigourStartConfirmation(page, participantId, checkSecondaryButtons = false) {
  await page.goto(`/examples/vigour.html?participant_id=${participantId}`);
  await page.getByRole('button', { name: 'Got it' }).click();

  const piggy = page.locator('#piggy-container');
  await expect(piggy, 'the interactive instruction piggy should appear').toBeVisible({ timeout: 15000 });
  if (checkSecondaryButtons) {
    await piggy.dispatchEvent('pointerdown', { pointerType: 'mouse', isPrimary: true, button: 2 });
  }
  for (let i = 0; i < 5; i++) await piggy.tap();
  if (checkSecondaryButtons) {
    await expect(page.locator('#bottom-container'), 'a secondary button must not count toward the demo').toBeHidden();
  }
  await piggy.tap();
  await expect(page.locator('#bottom-container')).toBeVisible();
  await page.locator('#continue-button').click();

  await page.locator('#jspsych-instructions-next').click();
  await page.locator('#jspsych-instructions-next').click();
  await expect(piggy, 'the start-confirmation piggy should appear').toBeVisible({ timeout: 15000 });
  return piggy;
}

async function advanceToVigourTrial(page, participantId, checkSecondaryButtons = false) {
  const piggy = await advanceToVigourStartConfirmation(page, participantId, checkSecondaryButtons);

  await page.waitForTimeout(READY_TAP_LOCKOUT_MS); // taps before this are ignored
  // Deliberately after the lockout: inside it every tap is ignored, so a secondary-button
  // check there would pass even if the button filter itself were broken.
  if (checkSecondaryButtons) {
    await piggy.dispatchEvent('pointerdown', { pointerType: 'pen', isPrimary: true, button: 2 });
    await expect(page.getByText(/tap the piggy bank to begin/i)).toBeVisible();
  }
  await piggy.tap();

  const trialPiggy = page.locator('.experiment-wrapper:not(:has(#instruction-container)) #piggy-container');
  await expect(trialPiggy, 'a real vigour trial should begin').toBeVisible({ timeout: 15000 });
  return trialPiggy;
}

defineTaskRenderingTest('vigour', {
  ...TASKS.vigour,
  extraChecks: async (page) => {
    const loaded = await page
      .locator('#piggy-bank')
      .evaluate((img) => img.complete && img.naturalWidth > 0);
    expect(loaded, 'piggy bank image should load and render (not a broken image)').toBe(true);
  },
});

test('the vigour start confirmation ignores a tap inside the lockout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7', 'one touch project is sufficient for the tap lockout');

  // Fired from inside the page halfway into the lockout, so the tap's timing doesn't depend
  // on how fast this machine can drive the browser - see armTapAfterAppearing. #reread-button
  // is rendered by the start confirmation only; the demo screen has restart/continue instead.
  await armTapAfterAppearing(page, {
    appearsSelector: '#reread-button',
    tapSelector: '#piggy-container',
    delayMs: READY_TAP_LOCKOUT_MS / 2,
  });

  const piggy = await advanceToVigourStartConfirmation(page, 'vigour-tap-lockout-check');
  await expect
    .poll(() => page.evaluate(() => window.__lockoutTapFired === true), {
      message: 'the early tap should have been dispatched',
      timeout: 5000,
    })
    .toBe(true);

  await page.waitForTimeout(IGNORED_TAP_SETTLE_MS);
  // #piggy-container is on this screen too, so only the trial-only wrapper proves a trial began.
  await expect(
    page.locator(TASKS.vigour.readySelector),
    'a tap inside the lockout should not start the task'
  ).toHaveCount(0);
  await expect(
    page.locator('#reread-button'),
    'the start confirmation should still be the screen on show'
  ).toBeVisible();

  // The very same piggy bank starts the task once the lockout has passed.
  await page.waitForTimeout(READY_TAP_LOCKOUT_MS);
  await piggy.tap();
  await expect(
    page.locator(TASKS.vigour.readySelector),
    'a tap after the lockout should start the task'
  ).toBeVisible({ timeout: 15000 });
});

test('vigour preloads stimuli before showing the orientation hint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one touch project is sufficient for timeline ordering');

  await page.goto('/experiment.html?participant_id=timeline-order-check&context=relmed&task=vigour&session=Session%201');

  const firstTwoTrials = await page.evaluate(async () => {
    const { createTaskTimeline } = await import('/api/index.js');
    const timeline = await createTaskTimeline('vigour');
    return timeline.slice(0, 2).map((trial) => ({
      type: trial.type.info.name,
      trialphase: trial.data?.trialphase,
    }));
  });

  expect(firstTwoTrials).toEqual([
    { type: 'preload', trialphase: 'vigour_preload' },
    { type: 'html-button-response', trialphase: 'orientation_hint' },
  ]);
});

test('vigour ends on its closing page, before whatever follows the task', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one touch project is sufficient for timeline ordering');

  await page.goto('/experiment.html?participant_id=timeline-order-check&context=relmed&task=vigour&session=Session%201');

  // Every module runs rating questions straight after the vigour task (api/module-registry.js),
  // so the last trial the task itself contributes has to be the "you have finished" page.
  const lastTrial = await page.evaluate(async () => {
    const { createTaskTimeline } = await import('/api/index.js');
    const timeline = await createTaskTimeline('vigour');
    // On touch devices createTaskTimeline wraps everything after the preload in a nested
    // timeline (the orientation gate), so the task's own last trial is one level down there.
    const tail = timeline.at(-1);
    const last = tail.timeline ? tail.timeline.at(-1) : tail;
    return { type: last.type.info.name, trialphase: last.data?.trialphase };
  });

  expect(lastTrial).toEqual({ type: 'instructions', trialphase: 'vigour_ending' });
});

test('vigour keeps running while the phone is being rotated', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7', 'one phone project is sufficient for timer coverage');

  await advanceToVigourTrial(page, 'rotation-duration-check');
  const trialIndex = await page.evaluate(() => window.jsPsych.getProgress().current_trial_global);

  await page.setViewportSize({ width: 915, height: 412 });
  const overlay = page.locator('#rotate-overlay');
  await expect(overlay, 'landscape should gate this portrait task').toBeVisible();
  await expect(overlay.locator('.rotate-msg-portrait')).toContainText('The task is still running');

  // Vigour trials last at most 7.49 seconds. Waiting longer than that should advance the
  // timeline even though the rotate warning remains visible, preventing an unintended rest.
  await page.waitForTimeout(7800);
  expect(await page.evaluate(() => window.jsPsych.getProgress().current_trial_global)).toBeGreaterThan(trialIndex);
  await expect(overlay, 'the warning should remain while the task continues behind it').toBeVisible();

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(overlay).toBeHidden();
});

test('vigour ignores non-primary pointer buttons in every tap stage', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7', 'one pointer-capable project is sufficient');

  const trialPiggy = await advanceToVigourTrial(page, 'primary-pointer-check', true);
  await trialPiggy.dispatchEvent('pointerdown', { pointerType: 'mouse', isPrimary: true, button: 2 });
  await trialPiggy.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: false, button: 0 });
  expect(await page.evaluate(() => window.jsPsych.getCurrentTrial().data.trial_presses())).toBe(0);

  await trialPiggy.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, button: 0 });
  await expect.poll(() => page.evaluate(() => window.jsPsych.getCurrentTrial().data.trial_presses())).toBe(1);
});
