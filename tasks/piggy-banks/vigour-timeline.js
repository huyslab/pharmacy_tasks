import { createVigourCoreTimeline, VIGOUR_PRELOAD_IMAGES } from './vigour-utils.js';
import { vigour_instructions } from './vigour-instructions.js';
import { createPreloadTrial, updateState } from '../../core/utils/index.js';

/**
 * Creates the closing screen shown after the last piggy bank trial
 *
 * Every module follows the task with rating questions (see api/module-registry.js), so
 * without this the last trial ran straight into them and the participant had no way of
 * knowing the game was over. Mirrors the reversal task's closing page (reversalEnding in
 * tasks/reversal/task.js) down to the wording, so the two games end the same way. It does
 * report the end of the task, which reversal's page cannot: reversal resumes by parsing its
 * own last `reversal_block_*_trial_*` state, while vigour has no resumption to break.
 *
 * @param {Object} settings - Task configuration settings
 * @param {Object} [settings.sessionInfo] - Resolved session; the screening module reveals no bonus
 * @returns {Object} jsPsych instructions trial closing the task
 */
function vigourEnding(settings) {
    // See reversalEnding: the screening module has no bonus element, so nothing is ever
    // revealed there (api/module-registry.js)
    const paysBonus = settings.sessionInfo?.variant !== 'screening';

    return {
        type: jsPsychInstructions,
        css_classes: ['instructions'],
        show_clickable_nav: true,
        data: { trialphase: 'vigour_ending' },
        pages: [
            `<p><strong>Congratulations! You have completed the piggy-bank game.</strong></p>` +
            (paysBonus
                ? `<p>You will be paid a bonus based on the coins you collected.
                    Your total bonus payment will be revealed at the end of this module.</p>
                <p>Before that, we will ask you a few short questions and for your feedback.</p>`
                : `<p>Next, we will ask you a few short questions and for your feedback.</p>`)
        ],
        // The last trial of the task has just saved, so this only reports the state
        on_start: () => { updateState(`vigour_task_end`, false) }
    };
}

/**
 * Creates the complete timeline for the vigour task (piggy bank shaking)
 * @param {Object} settings - Configuration object containing task parameters
 * @returns {Array} Array of jsPsych timeline objects for the vigour task
 */
export function createVigourTimeline(settings) {
    const vigourTimeline = [
        // Preload all images required for the vigour task
        createPreloadTrial(VIGOUR_PRELOAD_IMAGES, settings.task_name),
        // Show interactive instructions with practice demo
        vigour_instructions,
        // Run the main vigour task trials (spread to flatten the array)
        ...createVigourCoreTimeline(settings),
        // Tell the participant the game is over before the questions that follow
        vigourEnding(settings),
    ];
    
    return vigourTimeline;
}
