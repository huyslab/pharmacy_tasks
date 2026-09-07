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
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(391);
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

test('preload timeout allows streaming or continuing and records an unwatched video', async ({ page }) => {
    await page.goto('/experiment.html');
    await page.route('**/assets/videos/*.mp4', () => {});
    const config = await page.evaluate(async () => {
        const { createTaskTimeline } = await import('/api/index.js');
        const timeline = (await createTaskTimeline('instruction_video'))[0].timeline;
        const configuredLimit = timeline[0].max_load_time;
        timeline[0].max_load_time = 100;
        window.videoTest = initJsPsych({ display_element: 'display_element' });
        window.videoTest.run(timeline);
        return configuredLimit;
    });
    expect(config).toBe(60000);
    await expect(page.getByText('The video is taking a little longer to load.')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('video source')).toHaveAttribute('src', /Mymeds_1_faststart.mp4$/);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const data = await page.evaluate(() => window.videoTest.data.get().values());
    expect(data[0].success).toBe(false);
    expect(data[0].timeout).toBe(true);
    expect(data.at(-1)).toMatchObject({ preload_success: false, playback_started: false, playback_completed: false, playback_error: null });
});

test('playback failure offers Continue and records the error', async ({ page }) => {
    await page.goto('/experiment.html');
    await page.evaluate(async () => {
        const { createTaskTimeline } = await import('/api/index.js');
        const timeline = (await createTaskTimeline('instruction_video'))[0].timeline;
        window.videoTest = initJsPsych({ display_element: 'display_element' });
        window.videoTest.run(timeline);
    });
    await page.getByRole('button', { name: 'Next' }).click();
    await page.locator('video').evaluate(el => el.dispatchEvent(new Event('error')));
    await expect(page.getByText('The video could not play. Please select Continue to start the games.')).toBeVisible();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const data = await page.evaluate(() => window.videoTest.data.get().values().at(-1));
    expect(data.playback_error).toBe(0);
    expect(data.playback_completed).toBe(false);
});

test('missing video markup does not block continuing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/experiment.html');
    await page.evaluate(async () => {
        const { createTaskTimeline } = await import('/api/index.js');
        const timeline = (await createTaskTimeline('instruction_video'))[0].timeline;
        const playback = timeline.at(-1);
        const onLoad = playback.on_load;
        playback.on_load = () => {
            document.querySelector('video').remove();
            onLoad();
        };
        window.videoTest = initJsPsych({ display_element: 'display_element' });
        window.videoTest.run(timeline);
    });
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('The video could not play. Please select Continue to start the games.')).toBeVisible();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const data = await page.evaluate(() => window.videoTest.data.get().values().at(-1));
    expect(data.playback_error).toBe(0);
    expect(data.playback_completed).toBe(false);
    expect(errors).toEqual([]);
});
