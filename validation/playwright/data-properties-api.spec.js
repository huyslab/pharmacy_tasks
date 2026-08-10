import { expect, test } from '@playwright/test';
import { expectNoPageErrors, trackPageErrors } from './support/helpers.js';

test('keeps entry viewport device info separate from per-trial viewport data', async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto('/validation/fixtures/data-properties.html');
  await page.waitForFunction(() => window.RESIZE_READY === true);

  const entryDeviceInfo = await page.evaluate(() => window.deviceInfo);
  const resizedViewport = { width: 600, height: 900 };
  await page.setViewportSize(resizedViewport);
  await page.evaluate(() => window.RESUME_AFTER_RESIZE());

  await expect(page.locator('#fixture-done')).toBeAttached({ timeout: 15000 });

  const { beforeResize, afterResize, deviceInfo, globalProperties } = await page.evaluate(() => ({
    beforeResize: window.jsPsych.data.get().filter({ trialphase: 'fixture_before_resize' }).values()[0],
    afterResize: window.jsPsych.data.get().filter({ trialphase: 'fixture_after_resize' }).values()[0],
    deviceInfo: window.deviceInfo,
    globalProperties: window.jsPsych.data.dataProperties
  }));

  expect(beforeResize.viewport_width).toBe(entryDeviceInfo.entry_viewport_width);
  expect(beforeResize.viewport_height).toBe(entryDeviceInfo.entry_viewport_height);
  expect(afterResize.viewport_width).toBe(resizedViewport.width);
  expect(afterResize.viewport_height).toBe(resizedViewport.height);

  expect(deviceInfo.entry_viewport_width).toBe(entryDeviceInfo.entry_viewport_width);
  expect(deviceInfo.entry_viewport_height).toBe(entryDeviceInfo.entry_viewport_height);
  expect(deviceInfo).toHaveProperty('entry_device_orientation');

  expect(globalProperties).not.toHaveProperty('viewport_width');
  expect(globalProperties).not.toHaveProperty('viewport_height');
  expect(globalProperties).not.toHaveProperty('device_orientation');

  expectNoPageErrors(errors);
});
