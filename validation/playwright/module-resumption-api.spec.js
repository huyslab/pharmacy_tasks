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
      await page.goto(`/experiment.html?module_state=${task}_trial_${completed}_finish&parent_origin=http%3A%2F%2Flocalhost%3A3000`);
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
      if (completed < count) expect(result.states).toContain(`${task}_trial_${completed + 1}_finish`);
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

test('trial resumption uses standard checkpoints without questionnaire fields', async ({ page }) => {
  await page.goto('/experiment.html');
  const remaining = await page.evaluate(async () => {
    const { applyWithinTaskResumptionRules } = await import('/core/utils/resumption.js');
    const trials = [{ name: 'first' }, { name: 'second' }, { name: 'third' }];
    return applyWithinTaskResumptionRules(trials, 'custom_trial_2_finish', 'custom', {
      enabled: true,
      granularity: 'trial',
    });
  });
  expect(remaining).toEqual([{ name: 'third' }]);
});

for (const moduleName of ['pilot_1', 'full_battery']) {
  for (const state of ['bonus_trial', 'bonus_trial_end']) {
    test(`${moduleName} skips completed questionnaires at ${state}`, async ({ page }) => {
      await page.goto(`/experiment.html?module_state=${state}`);
      const questionnaires = await page.evaluate(async moduleName => {
        const { createModuleTimeline } = await import('/api/index.js');
        const timeline = await createModuleTimeline(moduleName, { session: 'wk0' });
        const flatten = nodes => nodes.flatMap(node => Array.isArray(node) ? flatten(node) : node.timeline ? flatten(node.timeline) : [node]);
        return flatten(timeline).filter(trial =>
          /^(medication_questionnaire|demographics)_/.test(trial.data?.trialphase || '')
        ).length;
      }, moduleName);
      expect(questionnaires).toBe(0);
    });
  }
}

for (const task of ['medication_questionnaire', 'demographics']) {
  test(`${task} saves the current answer before its checkpoint`, async ({ page }) => {
    await page.goto('/experiment.html?parent_origin=http%3A%2F%2Flocalhost%3A3000');
    await page.evaluate(async task => {
      const { createTaskTimeline } = await import('/api/index.js');
      window.jsPsych = initJsPsych({ display_element: 'display_element' });
      const timeline = await createTaskTimeline(task, { include_intro: false, transition_duration: 0 });
      window.context = 'prolific';
      window.savedEvents = [];
      // Exercise the actual save serialization; local relmed launches bypass uploads.
      window.fetch = async (url, options) => {
        const record = JSON.parse(options.body)[0];
        const payload = JSON.parse(record.data)[0];
        window.savedEvents.push({ rows: JSON.parse(payload.jspsych_data) });
        return { status: 200, json: async () => ({}) };
      };
      window.postMessage = message => {
        if (message.state) window.savedEvents.push({ state: message.state });
      };
      void window.jsPsych.run(timeline);
    }, task);
    if (task === 'medication_questionnaire') {
      await page.locator('#qsc-text').fill('Example medicine');
    } else {
      await page.locator('#qsc-number').fill('34');
    }
    await page.locator('#qsc-continue').click();
    const checkpoint = `${task}_trial_1_finish`;
    await expect.poll(() => page.evaluate(checkpoint =>
      window.savedEvents.some(event => event.state === checkpoint), checkpoint
    )).toBe(true);
    const savedRows = await page.evaluate(checkpoint => {
      const index = window.savedEvents.findIndex(event => event.state === checkpoint);
      return window.savedEvents.slice(0, index).filter(event => event.rows).at(-1).rows;
    }, checkpoint);
    expect(savedRows).toHaveLength(1);
    expect(savedRows[0].response).toEqual(task === 'medication_questionnaire' ? 'Example medicine' : 34);
  });
}
