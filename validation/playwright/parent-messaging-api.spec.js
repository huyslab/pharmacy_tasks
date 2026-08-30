import { expect, test } from '@playwright/test';

test('load success uses the explicit parent origin when referrer data is suppressed', async ({ page }) => {
  await page.goto(
    '/validation/fixtures/load-success.html?parent_origin=http%3A%2F%2Flocalhost%3A3000'
  );

  const posted = await page.evaluate(async () => {
    const messages = [];
    const originalPostMessage = window.postMessage;
    window.jsPsychFullscreen = {};
    window.jsPsychHtmlButtonResponse = {};
    window.jsPsychHtmlKeyboardResponse = {};
    window.postMessage = (message, targetOrigin) => {
      messages.push({ message, targetOrigin });
    };

    try {
      const { signalLoadSuccess } = await import('/core/utils/data-handling.js');
      signalLoadSuccess();
      return messages;
    } finally {
      window.postMessage = originalPostMessage;
    }
  });

  expect(posted).toEqual([
    {
      message: { message: 'load_successful' },
      targetOrigin: 'http://localhost:3000',
    },
  ]);
});

test('opaque parent origins are normalized to null', async ({ page }) => {
  await page.goto('/validation/fixtures/load-success.html');

  const parentOrigin = await page.evaluate(async () => {
    window.jsPsychFullscreen = {};
    window.jsPsychHtmlButtonResponse = {};
    window.jsPsychHtmlKeyboardResponse = {};
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: { location: { origin: 'null' } },
    });

    const { getParentOrigin } = await import('/core/utils/data-handling.js');
    return getParentOrigin();
  });

  expect(parentOrigin).toBeNull();
});

test('pilot module reports successful startup through the explicit parent origin', async ({ page }) => {
  await page.addInitScript(() => {
    window.parentMessages = [];
    window.postMessage = (message, targetOrigin) => {
      window.parentMessages.push({ message, targetOrigin });
    };
  });

  await page.goto(
    '/experiment.html?participant_id=message-check&context=relmed&module=pilot_1&session=Session%201&parent_origin=http%3A%2F%2Flocalhost%3A3000'
  );

  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.parentMessages.some(
            ({ message, targetOrigin }) =>
              message?.message === 'load_successful' && targetOrigin === 'http://localhost:3000'
          )
        ),
      { timeout: 5_000 }
    )
    .toBe(true);
});
