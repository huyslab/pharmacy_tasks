# Demographics

## Overview
Three questions about the participant - age, sex registered at birth, and gender - one per screen, with a slide transition between them and no way back to an earlier question.

The screens themselves, the controls they adapt to the device, and the data each records are the shared [question screen](../question-screen/README.md); this task supplies only the questions.

Sex and gender are asked as two separate questions, in that order, following the wording of the ONS census questions. The two answers are not interchangeable, and a participant whose gender differs from their registered sex has to be able to say so without misreporting either one.

## File Structure

### Core Files

#### `index.js`
**Purpose**: Main entry point that centralizes all exports from the task module.
- Re-exports all functions from `timeline.js`

#### `timeline.js`
**Purpose**: Defines the questions and assembles them into a timeline.

**Main Export Function**:
- **`createDemographicsTimeline(settings)`**: Returns the questionnaire as a single jsPsych timeline node
  - Optional intro screen, then the three question screens
  - Marks the questionnaire start and finish with `updateState()`
  - Saves to REDCap after every screen, so an interrupted session keeps the earlier answers

**Questions**:
1. `age` (number) - whole years, entered on the keypad or typed
2. `sex_at_birth` (choice) - `female`, `male`, or `declined`
3. `gender` (choice) - `woman`, `man`, `non_binary`, `declined`, or, where the participant chose to describe it themselves, whatever they typed

### Shared Files

The plugin (`jsPsychQuestionScreen`) and the `.qsc-*` stylesheet live in [`../question-screen/`](../question-screen/README.md), shared with the medication questionnaire.

## Data

`gender` is the one question whose recorded `response` is not always one of a fixed set of values. Choosing "I describe it another way" swaps the options for a text field on the same screen, and what is recorded is the typed words - so any `response` outside the four listed values is a self-description, and should be treated as free text.

Every question can be left unanswered, on the reasoning that a participant who does not want to give a demographic detail should not have to abandon the session over it. How that is recorded differs by screen, since the controls do:

- `age` records `null` with `declined: true`, from the quiet button beside Continue
- `sex_at_birth` and `gender` record the value `'declined'`, since on those screens it is one of the options

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `task_name` | `demographics` | Prefix for state updates and `trialphase` values |
| `include_intro` | `true` | Whether to open with a short welcome screen |
| `allow_decline` | `true` | Whether every question offers a way past without giving the detail |
| `allow_self_describe` | `true` | Whether the gender question offers an option that opens a text field |
| `transition_duration` | `350` | Slide transition duration in ms |
| `input_mode` | `auto` | `touch` for tap targets and the on-screen keypad, `keyboard` for typed entry, or `auto` to pick from the device |

## Usage

```javascript
const timeline = await createTaskTimeline('demographics', {});
```

The experiment page must load the plugin, as the task registry only loads CSS:

```html
<script src="tasks/question-screen/plugin-question-screen.js"></script>
```

An end-to-end example is in `examples/demographics.html`.

## Notes
- The questionnaire is deliberately not run in fullscreen in the example page: mobile browsers handle the on-screen keyboard better outside of fullscreen.
- Resumption is disabled. The questionnaire is short, and a resumed session would otherwise skip questions whose answers were never recorded.
- In `api/module-registry.js` the questionnaire runs in `pilot_1`, straight after the medication questionnaire, so both sets of questions are asked together at the start of the visit rather than interrupting it later.
