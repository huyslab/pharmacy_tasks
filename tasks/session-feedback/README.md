# Session Feedback

## Overview
Asked once at the end of a session, about the session itself rather than about any one game: three ratings, then three open questions in the participant's own words. It is the participant's channel back to the researchers, so the open questions are optional by default - someone with nothing to add should be able to pass through rather than be made to invent something.

Its counterpart is the [acceptability judgment](../acceptability-judgment/), which asks the same kind of thing about a single game and is asked once per game.

## File Structure

#### `index.js`
**Purpose**: Main entry point that centralizes all exports from the task module.
- Re-exports all functions from `task.js`

#### `task.js`
**Purpose**: Defines the questions and assembles them into a timeline.

**Main Export Function**:
- **`createSessionFeedbackTimeline(settings)`**: Returns the questionnaire as a single jsPsych timeline node
  - Optional intro screen, one ratings screen, then one screen per open question
  - Marks the questionnaire start and finish with `updateState()`
  - Saves to REDCap after every screen, so a session abandoned part way still carries what the participant had already said

**Ratings** (one `jsPsychSurveyLikert` screen, all required):

| Field | Question | Scale |
| --- | --- | --- |
| `session_difficulty` | How difficult was it to complete the tasks in this session? | 1 Not difficult at all … 5 Very difficult |
| `instructions_clarity` | How clear were the instructions? | 1 Not clear at all … 5 Very clear |
| `website_difficulty` | How difficult was it to use the study website? | 1 Not difficult at all … 5 Very difficult |

Both difficulty questions share a scale so a participant reads the same anchors twice rather than re-learning them.

**Open questions** (one `jsPsychSurveyText` screen each, optional by default):

| Field | Question |
| --- | --- |
| `difficulties` | What difficulties did you encounter completing the session today? |
| `strategy` | Did you have any strategy that helped you complete the session? |
| `message_to_researchers` | Is there anything you would like to tell the researchers? |

One question per screen: three boxes at once is a lot to meet at the end of a session, and on a phone the on-screen keyboard would cover the ones lower down.

## Data

Each screen is one trial, tagged `trialphase`:

- `session_feedback_intro`
- `session_feedback_ratings` — `response` is `{session_difficulty, instructions_clarity, website_difficulty}`, each the **zero-based** index of the chosen point, as jsPsych's Likert plugin records it. A rating of "3" on screen is `2` in the data
- `session_feedback_difficulties`, `session_feedback_strategy`, `session_feedback_message_to_researchers` — `response` is `{<field>: "<what was typed>"}`, an empty string where the question was left blank

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `task_name` | `session_feedback` | Prefix for state updates and `trialphase` values |
| `include_intro` | `true` | Whether to open with a short screen explaining what the questions are for |
| `require_text` | `false` | Whether the three open questions must be answered before moving on |
| `text_rows` | `5` | Height of each open answer box, in rows |

## Usage

```javascript
const timeline = await createTaskTimeline('session_feedback', {});
```

The task is built from stock jsPsych survey plugins, so the experiment page must load both:

```html
<script src="core/jspsych/plugin-survey-likert.js"></script>
<script src="core/jspsych/plugin-survey-text.js"></script>
```

An end-to-end example is in `examples/session-feedback.html`.

## Notes
- In `api/module-registry.js` the questionnaire runs at the end of `pilot_2`, after the self-report questionnaires and **before** the bonus reveal: once the payment is on screen there is little reason left to answer them.
- Resumption is disabled. A resumed run would skip whichever questions were already passed, and the ratings are about the session as a whole, so it is asked once or not at all.
