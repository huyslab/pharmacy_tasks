import { expect, test } from '@playwright/test';
import { defineTaskJourneyTest } from './support/journey-check.js';
import { patchWebkitTouchPoints } from './support/helpers.js';
import { TASKS } from './support/task-config.js';

defineTaskJourneyTest('vigour', TASKS.vigour);

test('vigour warns against stylus use during the interactive instructions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iPad Pro 11 (journey)', 'one stylus-capable project is sufficient');
  await patchWebkitTouchPoints(page);

  await page.goto('/examples/vigour.html?participant_id=instruction-stylus-warning-check');
  await page.getByRole('button', { name: 'Got it' }).click();

  const piggy = page.locator('#piggy-container');
  await expect(piggy, 'the interactive instruction piggy should appear').toBeVisible({ timeout: 15000 });
  await piggy.dispatchEvent('pointerdown', { pointerType: 'pen', isPrimary: true, button: 0 });

  const warning = page.locator('#vigour-warning-temp');
  await expect(warning).toBeVisible();
  await expect(warning).toHaveText('Please tap with your finger, not a stylus (e.g., Apple Pencil)');
});
