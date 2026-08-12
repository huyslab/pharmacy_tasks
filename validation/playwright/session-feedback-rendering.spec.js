import { expect } from '@playwright/test';
import { defineTaskRenderingTest } from './support/render-check.js';
import { TASKS } from './support/task-config.js';

defineTaskRenderingTest('session-feedback', {
  ...TASKS.session_feedback,
  extraChecks: async (page) => {
    // A Likert row is five options laid out across the screen, which is the layout most at
    // risk of being squeezed unreadably on a narrow phone. Left to the plugin's own CSS the
    // options size themselves to their labels, which on a phone makes the row wider than
    // the screen - and since the content is centred with `margin: auto`, an overflowing row
    // is clipped on the left, taking the question text off the edge with it
    // (tasks/session-feedback/styles.css).
    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const width = doc.clientWidth;
      const edges = (el) => {
        const box = el.getBoundingClientRect();
        return { left: box.left, right: width - box.right };
      };

      return {
        sideScroll: doc.scrollWidth - doc.clientWidth,
        statements: [...document.querySelectorAll('.jspsych-survey-likert-statement')].map(edges),
        rows: [...document.querySelectorAll('.jspsych-survey-likert-opts')].map(edges),
        options: [...document.querySelectorAll('.jspsych-survey-likert-opts')].map((row) => {
          const inputs = [...row.querySelectorAll('input[type="radio"]')];
          return {
            count: inputs.length,
            boxes: inputs.map((input) => {
              const box = input.getBoundingClientRect();
              return { width: box.width, height: box.height, left: box.left, right: width - box.right };
            }),
          };
        }),
      };
    });

    expect(layout.sideScroll, 'the ratings screen should not scroll sideways').toBeLessThanOrEqual(1);

    // A margin either side, not merely "not clipped": text hard against the edge of a phone
    // is what this stylesheet exists to prevent.
    for (const [i, statement] of layout.statements.entries()) {
      expect(statement.left, `question ${i + 1} should keep a margin on the left`).toBeGreaterThan(0);
      expect(statement.right, `question ${i + 1} should keep a margin on the right`).toBeGreaterThan(0);
    }
    for (const [i, row] of layout.rows.entries()) {
      expect(row.left, `scale ${i + 1} should keep a margin on the left`).toBeGreaterThan(0);
      expect(row.right, `scale ${i + 1} should keep a margin on the right`).toBeGreaterThan(0);
    }

    const options = layout.options;

    expect(options.length, 'the ratings screen should show all three scales').toBe(3);
    for (const [row, scale] of options.entries()) {
      expect(scale.count, `scale ${row + 1} should offer all five points`).toBe(5);
      for (const [point, box] of scale.boxes.entries()) {
        // A browser's default radio is around 13px, which is fiddly with a fingertip or a
        // mouse; the stylesheet takes them to 24px.
        const where = `scale ${row + 1}, point ${point + 1}`;
        expect(box.width, `${where} should be wide enough to hit comfortably`).toBeGreaterThanOrEqual(20);
        expect(box.height, `${where} should be tall enough to hit comfortably`).toBeGreaterThanOrEqual(20);
        expect(box.left, `${where} should not be cut off the left of the screen`).toBeGreaterThanOrEqual(0);
        expect(box.right, `${where} should not be cut off the right of the screen`).toBeGreaterThanOrEqual(0);
      }
    }
  },
});
