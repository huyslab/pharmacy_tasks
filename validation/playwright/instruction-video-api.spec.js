import { expect, test } from '@playwright/test';

test('pilot 1 places the video between demographics and reversal', async ({ page }) => {
    await page.goto('/experiment.html');
    const names = await page.evaluate(async () => {
        const { ModuleRegistry } = await import('/api/module-registry.js');
        return ModuleRegistry.pilot_1.elements.map(element => element.name);
    });
    const index = names.indexOf('demographics');
    expect(names.slice(index, index + 3)).toEqual(['demographics', 'instruction_video', 'reversal']);
});

test('video loads, fits a phone, and enables Continue only after ending', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto('/experiment.html');
    await page.evaluate(async () => {
        const { createTaskTimeline } = await import('/api/index.js');
        const timeline = await createTaskTimeline('instruction_video');
        window.videoTest = initJsPsych({ display_element: 'display_element' });
        // Isolate playback from the host's data-upload callbacks.
        window.videoTest.run(timeline[0].timeline);
    });
    await page.getByRole('button', { name: 'Next' }).click();
    const video = page.locator('video');
    await expect(video).toBeVisible();
    const next = page.getByRole('button', { name: 'Continue', exact: true });
    await expect(next).toBeDisabled();
    await expect(video).toHaveAttribute('playsinline', '');
    await expect.poll(() => video.evaluate(el => el.readyState)).toBeGreaterThanOrEqual(1);
    const box = await video.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await video.evaluate(async el => {
        await el.play();
        el.currentTime = el.duration - 0.25;
    });
    await expect(next).toBeEnabled();
    await next.click();
    const data = await page.evaluate(() => window.videoTest.data.get().values());
    expect(data.at(-1).trialphase).toBe('instruction_video_play');
    expect(data.at(-1).response).toBe(0);
});
