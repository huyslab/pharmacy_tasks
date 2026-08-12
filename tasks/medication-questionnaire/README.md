# Medication Questionnaire

## Overview
A short questionnaire, asked at the start of a session, about the medication the participant was invited to the study for. One question per screen, a slide transition between screens, and no way back to an earlier question - each screen is its own jsPsych trial, and the answer is committed as the screen slides away.

The screens themselves, the controls they adapt to the device, and the data each records are the shared [question screen](../question-screen/README.md); this task supplies only the questions.

## File Structure

### Core Files

#### `index.js`
**Purpose**: Main entry point that centralizes all exports from the task module.
- Re-exports all functions from `timeline.js`

#### `timeline.js`
**Purpose**: Defines the questions and assembles them into a timeline.

**Main Export Function**:
- **`createMedicationQuestionnaireTimeline(settings)`**: Returns the full questionnaire as a single jsPsych timeline node
  - Optional intro screen, then the five question screens
  - Marks the questionnaire start and finish with `updateState()`
  - Saves to REDCap after every screen, so an interrupted session keeps the earlier answers

**Questions**:
1. `medication_name` (text) - the name of the medicine, copied from the package
2. `medication_dose_mg` (number) - the strength of one pill, in mg, entered on the keypad
3. `pills_per_day` (choice) - buttons 1-4, plus "5 or more" which opens the keypad on the same screen
4. `medication_start_date` (date) - day, month and year, each optional, plus a way to say the medicine has not been started yet
5. `other_medications` (list) - a yes/no question, and if yes, a list built one item at a time

### Shared Files

The plugin (`jsPsychQuestionScreen`) and the `.qsc-*` stylesheet live in [`../question-screen/`](../question-screen/README.md), shared with the demographics questionnaire. Two of its escape buttons are used here:

- **"I'm not sure"** (`unsure_label`) on the name and dose questions, recording a missing answer with `unsure: true` rather than leaving a participant stuck on a package they cannot read.
- **"I haven't started taking it yet"** (`not_started_label`) on the start date, recording a blank date with `not_started: true` - a date that does not exist yet, as opposed to one that cannot be remembered and is simply left blank.

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `task_name` | `medication_questionnaire` | Prefix for state updates and `trialphase` values |
| `include_intro` | `true` | Whether to open with a short welcome screen |
| `allow_unsure` | `true` | Whether the name and dose questions offer an "I'm not sure" button |
| `allow_not_started` | `true` | Whether the start date question offers an "I haven't started taking it yet" button |
| `max_pill_buttons` | `5` | Pills-per-day is answered with buttons 1 to this number minus one, plus an "N or more" button that opens the keypad |
| `earliest_year` | `1970` | Earliest year offered in the start date question |
| `transition_duration` | `350` | Slide transition duration in ms |
| `input_mode` | `auto` | `touch` for tap targets and the on-screen keypad, `keyboard` for typed entry, or `auto` to pick from the device |

## Usage

```javascript
const timeline = await createTaskTimeline('medication_questionnaire', {});
```

The experiment page must load the plugin, as the task registry only loads CSS:

```html
<script src="tasks/question-screen/plugin-question-screen.js"></script>
```

An end-to-end example is in `examples/medication-questionnaire.html`.

## Notes
- The questionnaire is deliberately not run in fullscreen in the example page: mobile browsers handle the on-screen keyboard better outside of fullscreen.
- Resumption is disabled. The questionnaire is short, and a resumed session would otherwise skip questions whose answers were never recorded.
