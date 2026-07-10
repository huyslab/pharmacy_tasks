import { expect } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { TASKS } from './support/task-config.js';

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
