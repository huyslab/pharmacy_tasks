/**
 * Session Feedback Timeline
 *
 * Asked once at the end of a session, about the session itself rather than any one game:
 * three ratings, then three open questions in the participant's own words.
 *
 * This is the participant's channel back to the researchers, so nothing here is compulsory
 * beyond the ratings, and the open questions can each be left blank. Its counterpart is the
 * acceptability judgment (tasks/acceptability-judgment/), which asks the same kind of thing
 * about a single game and is asked once per game.
 */

import { updateState, saveDataREDCap } from "@utils/index.js"

// Both difficulty questions share a scale, so a participant reads the same anchors twice
// rather than re-learning them; clarity gets its own.
const DIFFICULTY_LABELS = ["1<br>Not difficult at all", "2", "3", "4", "5<br>Very difficult"];
const CLARITY_LABELS = ["1<br>Not clear at all", "2", "3", "4", "5<br>Very clear"];

/**
 * The open questions, one per screen. Each is optional - a participant with nothing to add
 * should be able to pass through rather than be made to invent something.
 */
const OPEN_QUESTIONS = [
    {
        name: 'difficulties',
        prompt: 'What difficulties did you encounter completing this session?'
    },
    {
        name: 'strategy',
        prompt: 'Did you have any strategy that helped you complete the session?'
    },
    {
        name: 'message_to_researchers',
        prompt: 'Is there anything you would like to tell the researchers?'
    }
];

/**
 * Creates the complete timeline for the session feedback questionnaire
 *
 * @param {Object} settings - Task configuration settings
 * @param {string} settings.task_name - Name used for the state updates and data fields
 * @param {boolean} settings.include_intro - Whether to open with a short intro screen
 * @param {boolean} settings.require_text - Whether the open questions must be answered
 * @param {number} settings.text_rows - Height of each open answer box, in rows
 *
 * @returns {Array} Array of jsPsych timeline objects for the questionnaire
 */
export function createSessionFeedbackTimeline(settings) {
    const screens = [];

    if (settings.include_intro) {
        screens.push({
            type: jsPsychInstructions,
            css_classes: ['instructions'],
            pages: [
                `<p>Finally, we would like to hear how the session went for you.</p>
                <p>There are three quick ratings and three questions you can answer in your own words.
                Your answers help us improve the study for the people who take part after you.</p>`
            ],
            show_clickable_nav: true,
            data: { trialphase: `${settings.task_name}_intro` }
        });
    }

    screens.push({
        type: jsPsychSurveyLikert,
        // Scopes styles.css to this questionnaire's screens; the plugins are shared with
        // the acceptability judgment, whose own screens are left alone
        css_classes: ['session-feedback'],
        preamble: `<p>Please answer these questions about this session:</p>`,
        questions: [
            {
                prompt: 'How difficult was it to complete the tasks in this session?',
                labels: DIFFICULTY_LABELS,
                required: true,
                name: 'session_difficulty'
            },
            {
                prompt: 'How clear were the instructions?',
                labels: CLARITY_LABELS,
                required: true,
                name: 'instructions_clarity'
            },
            {
                prompt: 'How difficult was it to use the study website?',
                labels: DIFFICULTY_LABELS,
                required: true,
                name: 'website_difficulty'
            }
        ],
        data: { trialphase: `${settings.task_name}_ratings` },
        on_finish: () => { saveDataREDCap(); }
    });

    // One open question per screen: three boxes at once is a lot to meet at the end of a
    // session, and on a phone the on-screen keyboard would cover the ones lower down.
    OPEN_QUESTIONS.forEach(question => {
        screens.push({
            type: jsPsychSurveyText,
            css_classes: ['session-feedback'],
            questions: [{
                prompt: `<p>${question.prompt}</p>`,
                name: question.name,
                rows: settings.text_rows,
                columns: 60,
                required: settings.require_text
            }],
            data: { trialphase: `${settings.task_name}_${question.name}` },
            // Saved as we go, so a session abandoned part way through still carries whatever
            // the participant had already told us
            on_finish: () => { saveDataREDCap(); }
        });
    });

    return [{
        timeline: screens,
        on_timeline_start: () => { updateState(`${settings.task_name}_start`); },
        on_timeline_finish: () => {
            updateState(`${settings.task_name}_finish`, false);
            saveDataREDCap(3);
        }
    }];
}
