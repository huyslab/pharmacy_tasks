import { applyWithinTaskResumptionRules, updateState } from "@utils/index.js"

/**
 * Builds the stateful question loop shared by the medication and demographics tasks.
 *
 * Each visit to a question is still a separate jsPsych trial. Moving back therefore keeps
 * the original answer and the navigation step in the data, then records the revised answer
 * as a later trial instead of overwriting research data.
 *
 * @param {Array<Object>} questions - Ordered question-screen parameter objects
 * @param {Object} settings - Task settings, including task_name and resumption rules
 * @returns {{timeline: Object, resuming: boolean}|null} The loop and resumption state
 */
export function createQuestionnaireLoop(questions, settings) {
    const remaining = applyWithinTaskResumptionRules(
        questions, window.last_state, settings.task_name, settings.__task?.resumptionRules
    );
    if (remaining.length === 0) return null;

    let questionIndex = questions.length - remaining.length;
    const resuming = questionIndex > 0;

    // A loop instantiates this trial again after every forward or back action. Its plugin
    // parameters are functions so each visit reads the question at the current index.
    const questionParameters = [...new Set(questions.flatMap(question => Object.keys(question)))];
    const screen = {
        type: jsPsychQuestionScreen,
        ...Object.fromEntries(questionParameters.map(parameter => [
            parameter,
            () => questions[questionIndex][parameter]
        ])),
        question_index: () => questionIndex,
        n_questions: questions.length,
        transition_duration: settings.transition_duration,
        input_mode: settings.input_mode,
        back_label: () => questionIndex > 0 ? 'Back' : null,
        data: {
            trialphase: () => `${settings.task_name}_${questions[questionIndex].name}`
        },
        on_finish: data => {
            if (data.navigation === 'back') {
                questionIndex -= 1;

                // The checkpoint identifies the last item before the one now being revised.
                // Returning to item one therefore uses the task's start checkpoint.
                const checkpoint = questionIndex === 0
                    ? `${settings.task_name}_start`
                    : `${settings.task_name}_trial_${questionIndex}_finish`;
                updateState(checkpoint);
                return;
            }

            const completedQuestion = questionIndex + 1;
            questionIndex += 1;
            updateState(`${settings.task_name}_trial_${completedQuestion}_finish`);
        }
    };

    return {
        timeline: {
            timeline: [screen],
            loop_function: () => questionIndex < questions.length
        },
        resuming
    };
}
