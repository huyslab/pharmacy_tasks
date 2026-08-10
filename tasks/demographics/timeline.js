/**
 * Demographics Timeline
 *
 * Age, sex registered at birth, and gender, asked one question per screen on the shared
 * question-screen plugin (tasks/question-screen/) - the same cards, controls and slide
 * transitions as the medication questionnaire, so the two read as one questionnaire to a
 * participant who meets both in a session.
 *
 * Sex and gender are asked as two separate questions, in that order, following the wording
 * of the ONS census questions: the answers are not interchangeable, and a participant whose
 * gender differs from their registered sex has to be able to say so without being forced to
 * misreport either one.
 */

import { updateState, saveDataREDCap } from "@utils/index.js"

/**
 * Builds the list of question screens.
 *
 * @param {Object} settings - Task configuration settings
 * @returns {Array} Array of question definitions for the question-screen plugin
 */
function demographicQuestions(settings) {
    // Every question can be left unanswered, on the reasoning that a participant who does not
    // want to give a demographic detail should not have to abandon the session over it. On the
    // number screen that is a button; on the option screens it is one of the options.
    const decline = settings.allow_decline ? "I'd rather not say" : null;
    const declineChoice = settings.allow_decline
        ? [{ label: "I'd rather not say", value: 'declined' }]
        : [];

    const genderChoices = [
        { label: 'Woman', value: 'woman' },
        { label: 'Man', value: 'man' },
        { label: 'Non-binary', value: 'non_binary' }
    ];

    // Anything typed here is recorded in place of one of the values above, so an answer that
    // is not one of them is a self-description
    if (settings.allow_self_describe) {
        genderChoices.push({
            label: 'I describe it another way',
            value: null,
            reveals: 'text'
        });
    }

    return [
        {
            question_type: 'number',
            name: 'age',
            prompt: 'How old are you?',
            hint: 'In years, as of today.',
            placeholder: 'For example, 34',
            unit: 'years',
            allow_decimal: false,
            decline_label: decline
        },
        {
            question_type: 'choice',
            name: 'sex_at_birth',
            prompt: 'What was your sex registered at birth?',
            choices: [
                { label: 'Female', value: 'female' },
                { label: 'Male', value: 'male' },
                ...declineChoice
            ]
        },
        {
            question_type: 'choice',
            name: 'gender',
            prompt: 'What is your gender?',
            choices: [...genderChoices, ...declineChoice],
            entry_prompt: 'How would you describe your gender?',
            placeholder: 'Your answer'
        }
    ];
}

/**
 * Creates the complete timeline for the demographics questionnaire
 *
 * @param {Object} settings - Task configuration settings
 * @param {string} settings.task_name - Name used for the state updates and data fields
 * @param {boolean} settings.include_intro - Whether to open with a short welcome screen
 * @param {boolean} settings.allow_decline - Whether every question offers a way to answer
 *                                           without giving the detail
 * @param {boolean} settings.allow_self_describe - Whether the gender question offers an
 *                                                 option that opens a text field
 * @param {number} settings.transition_duration - Slide transition duration in ms
 * @param {string} settings.input_mode - 'touch', 'keyboard', or 'auto' to pick from the device
 *
 * @returns {Array} Array of jsPsych timeline objects for the questionnaire
 */
export function createDemographicsTimeline(settings) {
    const questions = demographicQuestions(settings);

    const screens = questions.map((question, i) => ({
        type: jsPsychQuestionScreen,
        question_index: i,
        n_questions: questions.length,
        transition_duration: settings.transition_duration,
        input_mode: settings.input_mode,
        ...question,
        data: {
            trialphase: `${settings.task_name}_${question.name}`
        },
        // Save as we go, so a session interrupted part way still has the earlier answers
        on_finish: () => { saveDataREDCap(); }
    }));

    if (settings.include_intro) {
        screens.unshift({
            type: jsPsychQuestionScreen,
            question_type: 'message',
            name: 'demographics_intro',
            prompt: 'Next, three questions about you.',
            hint: 'These help us describe who took part in the study. They are kept with the rest of your answers, under your participant number.',
            button_label: 'Start',
            transition_duration: settings.transition_duration,
            input_mode: settings.input_mode,
            data: { trialphase: `${settings.task_name}_intro` }
        });
    }

    return [{
        timeline: screens,
        on_timeline_start: () => { updateState(`${settings.task_name}_start`); },
        on_timeline_finish: () => {
            updateState(`${settings.task_name}_finish`, false);
            saveDataREDCap(3);
        }
    }];
}
