import { expect, test } from '@playwright/test';

for (const [state, expected] of [
  ['none', ['medication_questionnaire', 'demographics']],
  ['medication_questionnaire_start', ['medication_questionnaire', 'demographics']],
  ['medication_questionnaire_finish', ['demographics']],
  ['demographics_start', ['demographics']],
  ['demographics_finish', []],
  ['reversal_instructions_start', []],
  ['reversal_block_2_trial_3', []],
  ['unknown_task_start', ['medication_questionnaire', 'demographics']],
  ['no_resume_10_minutes', ['medication_questionnaire', 'demographics']],
]) {
  test(`pilot questionnaires resume from ${state}`, async ({ page }) => {
    await page.goto(`/experiment.html?module_state=${state}`);
    const result = await page.evaluate(async () => {
      const { createModuleTimeline } = await import('/api/index.js');
      const timeline = await createModuleTimeline('pilot_1', { session: 'wk0' });
      const flatten = nodes => nodes.flatMap(node => Array.isArray(node) ? flatten(node) : node.timeline ? flatten(node.timeline) : [node]);
      const trials = flatten(timeline);
      return {
        questionnaires: ['medication_questionnaire', 'demographics'].filter(name =>
          trials.some(trial => trial.data?.trialphase === `${name}_intro`)),
        hasReversal: trials.some(trial => trial.type?.info?.name === 'reversal'),
      };
    });
    expect(result.questionnaires).toEqual(expected);
    expect(result.hasReversal).toBe(true);
  });
}

test('completed-task skipping follows the registry rule', async ({ page }) => {
  await page.goto('/experiment.html?module_state=reversal_block_2_trial_3');
  const hasMedication = await page.evaluate(async () => {
    const { TaskRegistry } = await import('/api/task-registry.js');
    const { createModuleTimeline } = await import('/api/index.js');
    TaskRegistry.medication_questionnaire.resumptionRules.skipCompleted = false;
    const timeline = await createModuleTimeline('pilot_1', { session: 'wk0' });
    const flatten = nodes => nodes.flatMap(node => Array.isArray(node) ? flatten(node) : node.timeline ? flatten(node.timeline) : [node]);
    return flatten(timeline).some(trial => trial.data?.trialphase === 'medication_questionnaire_intro');
  });
  expect(hasMedication).toBe(true);
});

for (const [task, count] of [['medication_questionnaire', 5], ['demographics', 3]]) {
  for (const completed of [1, count - 1, count]) {
    test(`${task} resumes after item ${completed}`, async ({ page }) => {
      await page.goto(`/experiment.html?module_state=${task}_item_${completed}_finish&parent_origin=http%3A%2F%2Flocalhost%3A3000`);
      const result = await page.evaluate(async ({ task }) => {
        const { createTaskTimeline } = await import('/api/index.js');
        const timeline = await createTaskTimeline(task);
        const screens = timeline.flatMap(node => node.timeline || [node]);
        const posted = [];
        window.postMessage = message => posted.push(message.state);
        timeline[0]?.on_timeline_start?.();
        const startStates = [...posted];
        screens[0]?.on_finish?.();
        return {
          indices: screens.map(screen => screen.question_index),
          totals: screens.map(screen => screen.n_questions),
          startStates,
          states: posted,
        };
      }, { task });
      expect(result.indices).toEqual(Array.from({ length: count - completed }, (_, i) => completed + i));
      expect(result.totals).toEqual(Array(count - completed).fill(count));
      expect(result.startStates).not.toContain(`${task}_start`);
      if (completed < count) expect(result.states).toContain(`${task}_item_${completed + 1}_finish`);
    });
  }
}

for (const state of [
  'max_press_rate_start', 'max_press_rate_end',
  'pit_instructions_start', 'pit_task_start',
  'dd_instructions_start', 'dd_task_start',
  'prepilt_conditioning_start', 'pavlovian_lottery_last',
]) {
  test(`full battery skips medication after ${state}`, async ({ page }) => {
    await page.goto(`/experiment.html?module_state=${state}`);
    const hasMedication = await page.evaluate(async () => {
      const { createModuleTimeline } = await import('/api/index.js');
      const timeline = await createModuleTimeline('full_battery', { session: 'wk0' });
      const flatten = nodes => nodes.flatMap(node => Array.isArray(node) ? flatten(node) : node.timeline ? flatten(node.timeline) : [node]);
      return flatten(timeline).some(trial => trial.data?.trialphase === 'medication_questionnaire_intro');
    });
    expect(hasMedication).toBe(false);
  });
}
