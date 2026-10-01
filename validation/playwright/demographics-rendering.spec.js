import { expect } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { TASKS } from './support/task-config.js';

defineTaskRenderingTest('demographics', {
  ...TASKS.demographics,
  extraChecks: async (page) => {
    // The device branch and the transition wiring are covered once, on the medication
    // questionnaire, since both tasks render through the same plugin. What is worth
    // checking here is that this questionnaire is the length it claims: three questions,
    // which is what the progress dots promise a participant on the first screen.
    const dots = await page.locator('.qsc-progress .qsc-dot').count();
    expect(dots, 'the progress dots should count the three demographic questions').toBe(3);
  },
});
