// Mirrors api/utils.js' physical-screen phone threshold. CSS still checks the viewport's
// live orientation, but this threshold decides whether the body gate is enabled at all.
export const GATE_MIN_DIMENSION_THRESHOLD = 500;

// Mirrors START_TAP_LOCKOUT_MS in tasks/reversal/task.js and tasks/piggy-banks/vigour-instructions.js:
// on touch devices the "ready to begin" screens ignore taps for this long, so a tap carried
// over from the preceding instructions page can't start the task.
// Any test driving those screens with a real tap has to wait it out first.
export const READY_TAP_LOCKOUT_MS = 200;

export const TASKS = {
  // readySelector must uniquely match the real per-trial stimulus - both tasks reuse markup
  // across instructions/ready/trial screens, so each selector below adds whatever DOM feature
  // only the real trial has (vigour: excludes the instructions wrapper; reversal: requires the
  // coin divs). Keep this in mind if a future task's readySelector needs the same treatment.
  vigour: {
    url: '/examples/vigour.html',
    preferredOrientation: 'portrait',
    rotateMessageSelector: '.rotate-msg-portrait',
    // #piggy-container also appears in the instructions demo (generateInstructStimulus)
    // and the "tap to begin" confirmation screen (startConfirmation) - both wrap it in
    // #instruction-container, which the real per-trial stimulus (generateTrialStimulus)
    // never has. Excluding that is required to land on the actual trial, not instructions.
    readySelector: '.experiment-wrapper:not(:has(#instruction-container)) #piggy-container',
  },
  reversal: {
    url: '/examples/reversal.html',
    preferredOrientation: 'landscape',
    rotateMessageSelector: '.rotate-msg-landscape',
    // .reversal-stimuli also appears in the touch "tap either squirrel to begin" ready
    // screen (task.js touchReadyTrial re-uses the same squirrel markup) - only the real
    // per-trial stimulus (plugin-reversal.js create_stimuli) additionally renders the coin
    // divs, so requiring one of those is what actually pins this to a real trial.
    readySelector: '.reversal-stimuli:has(#rev-coin-left)',
  },
  // The questionnaire declares no preferredOrientation - it reads and types equally well
  // either way up - so it is never orientation-gated, and rotateMessageSelector is unused.
  medication_questionnaire: {
    url: '/examples/medication-questionnaire.html',
    preferredOrientation: null,
    journeyTitle: 'medication questionnaire records every answer on this device',
    // .qsc-screen wraps every screen including the intro message, whose .qsc-body is
    // empty. Requiring a child of the body is what pins this to a real question screen.
    readySelector: '.qsc-screen:has(.qsc-body > *)',
  },
  // Built on the same question-screen plugin as the medication questionnaire, so the same
  // .qsc-* selectors pin it to a real question screen, and it is never orientation-gated.
  demographics: {
    url: '/examples/demographics.html',
    preferredOrientation: null,
    journeyTitle: 'demographics questionnaire records every answer on this device',
    readySelector: '.qsc-screen:has(.qsc-body > *)',
  },
  // Like the medication questionnaire, the self-report battery reads and taps equally well
  // either way up, so it declares no preferredOrientation and is never orientation-gated.
  self_report: {
    url: '/examples/self-report.html',
    preferredOrientation: null,
    journeyTitle: 'self-report questionnaires record every answer on this device',
    // .srq-screen also wraps the intro and per-questionnaire instructions screens, whose
    // body holds a single continue button. Only a real item screen renders the options.
    readySelector: '.srq-screen:has(.srq-options)',
  },
  // Built from stock jsPsych survey plugins rather than a plugin of its own, so it is read
  // and typed either way up and is never orientation-gated.
  session_feedback: {
    url: '/examples/session-feedback.html',
    preferredOrientation: null,
    journeyTitle: 'session feedback records every rating and every answer on this device',
    // The intro is a plain instructions screen, so requiring the Likert form is what pins
    // this to the ratings screen - the first screen that actually asks something. The form
    // rather than its statements, since readySelector has to match exactly one element.
    readySelector: '#jspsych-survey-likert-form',
  },
};
