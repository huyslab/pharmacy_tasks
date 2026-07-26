import { expect, test } from '@playwright/test';
import { expectNoPageErrors, trackPageErrors } from './support/helpers.js';

/**
 * Regression guard for entry-time device logging clobbering per-trial columns.
 *
 * jsPsych merges jsPsych.data.addProperties() values OVER each trial's own result when the
 * trial is written (core/jspsych/jspsych.js write() -> Object.assign(result, dataProperties)),
 * and that write happens before on_finish. So any name passed to addProperties at experiment
 * entry silently overwrites a per-trial column of the same name for the whole session.
 *
 * logDeviceInfo() used to addProperties viewport_width/viewport_height/device_orientation,
 * which meant reversal's and vigour's freshly-measured per-trial viewport values never
 * reached the data - the entry-time snapshot won every time. Those now live on
 * window.deviceInfo as entry_* instead (core/utils/setup.js), and ship as their own
 * device_info field in the payload (core/utils/data-handling.js).
 *
 * Uses validation/fixtures/data-properties.html rather than a real task page: the bug is
 * only observable when the per-trial value differs from the entry-time one, and a sentinel
 * makes that difference unmistakable without depending on a mid-run viewport resize.
 */
test('entry-time device logging does not overwrite per-trial columns', async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto('/validation/fixtures/data-properties.html');
  await expect(page.locator('#fixture-done'), 'fixture timeline should run to completion').toBeAttached({
    timeout: 15000,
  });

  const { sentinel, trial, deviceInfo } = await page.evaluate(() => ({
    sentinel: window.SENTINEL,
    trial: window.jsPsych.data.get().filter({ trialphase: 'fixture_per_trial' }).values()[0],
    deviceInfo: window.deviceInfo,
  }));

  expect(trial, 'the fixture trial should have been recorded').toBeTruthy();

  // The actual regression: per-trial values must survive the write-time merge.
  expect(trial.viewport_width, 'per-trial viewport_width must not be overwritten by entry-time data').toBe(
    sentinel.viewport_width
  );
  expect(trial.viewport_height, 'per-trial viewport_height must not be overwritten by entry-time data').toBe(
    sentinel.viewport_height
  );

  // The entry-time snapshot is still captured - just namespaced, and off the per-trial path.
  expect(deviceInfo.entry_viewport_width, 'entry viewport width should be recorded on deviceInfo').toBe(
    await page.evaluate(() => window.innerWidth)
  );
  expect(deviceInfo.entry_viewport_height, 'entry viewport height should be recorded on deviceInfo').toBe(
    await page.evaluate(() => window.innerHeight)
  );
  expect(deviceInfo, 'entry orientation should be recorded on deviceInfo').toHaveProperty(
    'entry_device_orientation'
  );

  // Guards the general invariant, not just today's three names: no trial column may be
  // supplied by addProperties under a name a task also measures per trial.
  const forbidden = ['viewport_width', 'viewport_height', 'device_orientation'];
  const leaked = await page.evaluate(
    (names) => names.filter((n) => Object.prototype.hasOwnProperty.call(window.jsPsych.data.dataProperties ?? {}, n)),
    forbidden
  );
  expect(leaked, 'these names must not be registered as global jsPsych data properties').toEqual([]);

  expectNoPageErrors(errors);
});
