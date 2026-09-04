// A module is a collection of tasks to be completed in a single sitting.
// Each module can contain one or more tasks, and each task can have its own configuration settings.
//
// A module does not declare a session. The session comes from the launch URL, is resolved
// once against the session registry (api/session-registry.js), and is applied to every task
// in the module - so the same module definition serves every session the study runs.

export const ModuleRegistry = {
    full_battery: {
        name: "Full RELEMD Task Battery",
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "medication_questionnaire" },
            { type: "task", name: "reversal"},
            { type: "task", name: "acceptability_judgment", config: { task_name: "reversal", game_description: "squirrel game" } },
            { type: "task", name: "max_press_test" },
            { type: "task", name: "pavlovian_lottery" },
            { type: "task", name: "PILT" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "PILT", game_description: "card choosing game" } },
            { type: "task", name: "vigour" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "vigour", game_description: "piggy-bank game" } },
            { type: "task", name: "PIT"},
            { type: "task", name: "acceptability_judgment", config: { task_name: "PIT", game_description: "piggy-bank game in cloudy space" } },
            { type: "task", name: "vigour_test"},
            { type: "task", name: "post_PILT_test"},
            { type: "instructions", config: { text: "break_message" } },
            { type: "task", name: "control"},
            { type: "task", name: "acceptability_judgment", config: { task_name: "control", game_description: "shipping game" } },
            { type: "instructions", config: { text: "break_message" } },
            { type: "task", name: "WM" },
            { type: "task", name: "post_WM_test"},
            { type: "task", name: "acceptability_judgment", config: { task_name: "wm", game_description: "one-card game you just completed" } },
            { type: "task", name: "open_text" },
            { type: "task", name: "delay_discounting" },
            { type: "bonus" },
            { type: "instructions", config: { text: "end_message" } },
        ],
        max_bonus: 5.0,
        min_prop_bonus: 0.6
    },
    // The pilot runs as three modules, sat one after the other in a single visit. They are
    // separate so a participant can stop between them, and so the site can report progress
    // through the visit - each ends with its own data upload, and the two that contain a
    // game with its own bonus reveal.
    pilot_1: {
        name: "Pilot Module 1",
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "medication_questionnaire" },
            { type: "task", name: "demographics" },
            { type: "task", name: "reversal" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "reversal", game_description: "squirrel game" } },
            { type: "bonus" },
            { type: "instructions", config: { text: "signposting_message" } },
            { type: "instructions", config: { text: "end_message" } }
        ],
        // The game promises a bonus in its instructions, so the module reveals one. Pays
        // £1.80-£3.00, matching the participant information sheet, so a participant who
        // completes both games earns £3.60-£6.00.
        max_bonus: 3.0,
        min_prop_bonus: 0.6
    },
    pilot_2: {
        name: "Pilot Module 2",
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "vigour" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "vigour", game_description: "piggy-bank game" } },
            { type: "task", name: "self_report", config: { questionnaires: ["PHQ9", "GAD7"] } },
            { type: "bonus" },
            { type: "instructions", config: { text: "signposting_message" } },
            { type: "instructions", config: { text: "end_message" } }
        ],
        // See pilot_1: one game, half the pilot's total bonus
        max_bonus: 3.0,
        min_prop_bonus: 0.6
    },
    // The last leg of the visit: how the session went for the participant, asked on its own
    // so the ratings are about the visit as a whole rather than about the game just played,
    // and so they are not competing with the bonus reveal of pilot_2 for attention. No games,
    // so nothing to earn: no max_bonus and no bonus element.
    pilot_3: {
        name: "Pilot Module 3",
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            // The questionnaire is the whole module, so its own intro screen would be the
            // second page of an opening it has nothing to follow on from. The start message
            // introduces the questions instead (see pilot_3 in api/messages.js)
            { type: "task", name: "session_feedback", config: { include_intro: false } },
            { type: "instructions", config: { text: "signposting_message" } },
            { type: "instructions", config: { text: "end_message" } }
        ]
    },
    // Sat on its own at a later visit, to follow up on how a participant has been since the
    // pilot. No games, so nothing to earn: it declares no max_bonus and has no bonus element,
    // and its opening pages leave out the response-deadline warning, which is about the games.
    pilot_followup: {
        name: "Pilot Follow-Up",
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "self_report", config: { questionnaires: ["PHQ9", "GAD7"] } },
            { type: "instructions", config: { text: "signposting_message" } },
            { type: "instructions", config: { text: "end_message" } }
        ]
    },
    screening: {
        name: "Screening Module",
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "max_press_test" },
            { type: "task", name: "PILT", config: {present_pavlovian: false} },
            { type: "task", name: "acceptability_judgment", config: { task_name: "PILT", game_description: "card choosing game" } },
            { type: "task", name: "control" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "control", game_description: "shipping game" } },
            { type: "task", name: "reversal", config: { n_trials: 50 } },
            { type: "task", name: "acceptability_judgment", config: { task_name: "reversal", game_description: "squirrel game" } },
            { type: "instructions", config: { text: "end_message" } }
        ]
    }
};

