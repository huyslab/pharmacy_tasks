import { expect, test } from '@playwright/test';

/**
 * A module is a list of elements, and each kind of element is looked up somewhere else at
 * build time: tasks in the task registry, instruction screens in messages.js under the
 * module's own name. Neither lookup fails loudly - a missing message logs a warning and
 * returns an empty string, which reaches the participant as a blank screen with a Next
 * button. These checks make both lookups fail here instead.
 *
 * Device-independent, so this runs once (see the `api` project in playwright.config.js).
 */

test('every module element resolves to something to show', async ({ page }) => {
  await page.goto('/experiment.html');

  const unresolved = await page.evaluate(async () => {
    const { ModuleRegistry } = await import('/api/module-registry.js');
    const { TaskRegistry } = await import('/api/task-registry.js');
    const { getMessage } = await import('/api/index.js');
    const problems = [];

    for (const [moduleName, module] of Object.entries(ModuleRegistry)) {
      for (const [index, element] of module.elements.entries()) {
        const where = `${moduleName}[${index}]`;

        if (element.type === 'task') {
          if (!(element.name in TaskRegistry)) problems.push(`${where}: no task "${element.name}"`);
          continue;
        }

        if (element.type === 'instructions') {
          const trial = getMessage(moduleName, element.config.text, {});
          const pages = trial?.pages;
          if (!Array.isArray(pages) || pages.length === 0 || pages.some((p) => !p || !String(p).trim())) {
            problems.push(`${where}: "${element.config.text}" has nothing to show`);
          }
          continue;
        }

        if (element.type !== 'bonus') problems.push(`${where}: unknown element type "${element.type}"`);
      }
    }

    return problems;
  });

  expect(unresolved, 'every task and instruction screen should resolve').toEqual([]);
});

test('a module that reveals a bonus declares what it can pay', async ({ page }) => {
  await page.goto('/experiment.html');

  const mismatched = await page.evaluate(async () => {
    const { ModuleRegistry } = await import('/api/module-registry.js');
    return Object.entries(ModuleRegistry)
      .map(([name, module]) => ({
        name,
        revealsBonus: module.elements.some((element) => element.type === 'bonus'),
        declaresBonus: typeof module.max_bonus === 'number' && typeof module.min_prop_bonus === 'number',
      }))
      // computeTotalBonus reads both off the module, so a bonus screen without them would
      // reveal NaN to a participant
      .filter((module) => module.revealsBonus !== module.declaresBonus);
  });

  expect(mismatched, 'bonus element and bonus settings should go together').toEqual([]);
});

test('the follow-up module is the questionnaires alone', async ({ page }) => {
  await page.goto('/experiment.html');

  const followup = await page.evaluate(async () => {
    const { ModuleRegistry } = await import('/api/module-registry.js');
    const { createModuleTimeline } = await import('/api/index.js');
    const module = ModuleRegistry.pilot_followup;

    // Built without a session: the follow-up asks nothing that varies by visit, and the
    // questionnaires read no sequence, so it has to stand up on its own.
    const timeline = await createModuleTimeline('pilot_followup', {});
    const flatten = (nodes) => nodes.flatMap((node) => (node.timeline ? flatten(node.timeline) : [node]));
    const trials = flatten(timeline);

    return {
      elements: module.elements.map((element) => element.type === 'task' ? `task:${element.name}` : element.type),
      questionnaires: module.elements.find((element) => element.name === 'self_report')?.config?.questionnaires,
      max_bonus: module.max_bonus,
      plugins: [...new Set(trials.map((trial) => trial.type?.info?.name).filter(Boolean))].sort(),
      bonusTrials: trials.filter((trial) => trial.data?.trialphase === 'bonus_trial').length,
    };
  });

  expect(followup.elements, 'instructions, the questionnaires, signposting, end - and no bonus').toEqual([
    'instructions',
    'task:self_report',
    'instructions',
    'instructions',
  ]);
  expect(followup.questionnaires).toEqual(['PHQ9', 'GAD7']);
  expect(followup.max_bonus, 'nothing is earned, so nothing is declared').toBeUndefined();
  expect(followup.bonusTrials, 'no bonus should be revealed').toBe(0);
  // Only the two plugins the questionnaires and the instruction screens need: any game
  // plugin here would mean a task crept in.
  expect(followup.plugins).toEqual(['instructions', 'self-report-item']);
});
