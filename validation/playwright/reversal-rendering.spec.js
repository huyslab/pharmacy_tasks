import { expect, test } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { patchWebkitTouchPoints } from './support/helpers.js';
import { TASKS } from './support/task-config.js';

async function advanceToReversalTrial(page, participantId) {
  await page.goto(`/examples/reversal.html?participant_id=${participantId}`);
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.locator('#jspsych-instructions-next').click();
  await page.locator('#jspsych-instructions-next').click();
  await page.locator('#rev-tap-left').tap();

  const stimulus = page.locator('.reversal-stimuli:has(#rev-coin-left)');
  await expect(stimulus, 'a real reversal trial should begin').toBeVisible({ timeout: 15000 });
  return stimulus;
}

defineTaskRenderingTest('reversal', {
  ...TASKS.reversal,
  extraChecks: async (page, { hasTouch }) => {
    // plugin-reversal.js only renders .rev-tap-zone elements on touch-capable devices;
    // desktop stays keyboard-only (see reversal-touchscreen-pending memory).
    const tapZoneCount = await page.locator('.rev-tap-zone').count();
    if (hasTouch) {
      expect(tapZoneCount, 'touch devices should render tap zones for reversal').toBeGreaterThan(0);
    } else {
      expect(tapZoneCount, 'non-touch (desktop) devices should not render tap zones').toBe(0);
    }
  },
});

test('website Session 2 selects the wk2 reversal sequence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one project is sufficient for session mapping');

  const sequenceRequest = page.waitForRequest((request) =>
    request.url().endsWith('/tasks/reversal/sequences/trial1_wk2.js')
  );

  await page.goto('/experiment.html?participant_id=session-mapping-check&context=relmed&task=reversal&session=Session%202');
  await sequenceRequest;

  await expect.poll(() => page.evaluate(() => window.session)).toBe('Session 2');
  await expect(page.locator('#jspsych-content')).toBeAttached({ timeout: 15000 });
});

test('simulate query parameter preserves the participant ID', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one project is sufficient for simulation routing');

  await page.goto('/experiment.html?participant_id=flag-check&context=relmed&task=reversal&session=Session%201&simulate=1');

  await expect.poll(() => page.evaluate(() => window.simulating)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.participantID)).toBe('flag-check');
  await expect(page.locator('#jspsych-content'), 'the routed task should initialize').toBeAttached({ timeout: 15000 });
});

test('reversal preloads stimuli before showing the orientation hint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one touch project is sufficient for timeline ordering');

  await page.goto('/experiment.html?participant_id=timeline-order-check&context=relmed&task=reversal&session=Session%201');

  const firstTwoTrials = await page.evaluate(async () => {
    const { createTaskTimeline } = await import('/api/index.js');
    const timeline = await createTaskTimeline('reversal', { sequence: 'wk0' });
    return timeline.slice(0, 2).map((trial) => ({
      type: trial.type.info.name,
      trialphase: trial.data?.trialphase,
    }));
  });

  expect(firstTwoTrials).toEqual([
    { type: 'preload', trialphase: 'reversal_preload' },
    { type: 'html-button-response', trialphase: 'orientation_hint' },
  ]);
});

test('a narrow tablet pane is not treated as a phone rotation gate', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iPad Pro 11', 'one tablet project is sufficient for split-view coverage');

  await patchWebkitTouchPoints(page);
  await page.addInitScript(() => {
    // Playwright couples `screen` to manual viewport changes, whereas a real iPad keeps its
    // physical screen dimensions when the browser is placed in Split View or Stage Manager.
    Object.defineProperties(window.screen, {
      width: { value: 834, configurable: true },
      height: { value: 1194, configurable: true },
    });
  });
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/examples/reversal.html?participant_id=tablet-split-view');

  await expect(page.getByText(/hold your tablet in whichever orientation/i)).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Got it' }).click();

  await expect(page.locator('#rotate-overlay'), 'the portrait tablet pane should remain usable').toBeHidden();
  await expect(page.locator('#jspsych-instructions-next'), 'the task should advance normally in the narrow pane').toBeVisible();
});

test('reversal response deadline pauses while the phone is being rotated', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Pixel 7 landscape', 'one phone project is sufficient for timer coverage');

  const stimulus = await advanceToReversalTrial(page, 'rotation-deadline-check');
  const trialIndex = await page.evaluate(() => window.jsPsych.getProgress().current_trial_global);

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.locator('#rotate-overlay'), 'portrait should gate this landscape task').toBeVisible();

  // The normal response deadline is 3.5 seconds. A key pressed behind the overlay should
  // neither answer the trial nor consume the persistent keyboard listener.
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(3900);
  expect(await page.evaluate(() => window.jsPsych.getProgress().current_trial_global)).toBe(trialIndex);
  await expect(stimulus, 'the blocked trial should not expire behind the overlay').toBeAttached();

  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.locator('#rotate-overlay')).toBeHidden();
  await page.locator('#rev-tap-left').tap();
  await expect(page.locator('#rev-coin-left'), 'the first post-rotation response should still be accepted').toHaveCSS(
    'opacity',
    '1'
  );

  await expect.poll(() => page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').length
  )).toBeGreaterThan(0);
  const result = await page.evaluate(() =>
    window.jsPsych.data.get().values().filter((trial) => trial.trial_type === 'reversal').at(-1)
  );
  expect(result).toMatchObject({
    response: 'left',
    response_deadline_warning: false,
    wrong_orientation: true,
  });
  expect(result.rt, 'time behind the rotate prompt should be excluded from RT').toBeLessThan(3500);
});
