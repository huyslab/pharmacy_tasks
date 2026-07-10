import { expect } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { TASKS } from './support/task-config.js';

defineTaskRenderingTest('vigour', {
  ...TASKS.vigour,
  extraChecks: async (page) => {
    const loaded = await page
      .locator('#piggy-bank')
      .evaluate((img) => img.complete && img.naturalWidth > 0);
    expect(loaded, 'piggy bank image should load and render (not a broken image)').toBe(true);
  },
});
