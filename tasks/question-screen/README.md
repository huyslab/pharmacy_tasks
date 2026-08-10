# Question Screen

## Overview
The shared plugin and stylesheet behind the questionnaires that ask one question per screen: the [medication questionnaire](../medication-questionnaire/README.md) and [demographics](../demographics/README.md). This directory is not a task and has no timeline of its own - it holds only what those tasks render through, so a question asked in one of them looks and behaves the same as a question asked in the other.

A screen is a card with progress dots, the question, an optional supporting line, a body determined by `question_type`, and a footer holding the forward button. The card slides in from the right on trial start and out to the left when answered; `transition_duration` controls both, and the transitions are skipped in simulation mode and for users who ask for reduced motion. There is no way back: each screen is its own jsPsych trial, and the answer is committed as the screen slides away.

The controls adapt to the device (`input_mode`, `'auto'` by default):

- **Touchscreen** - finger-sized controls and an on-screen keypad for numbers, which keeps the question visible instead of letting the device keyboard cover it. Nothing is focused on arrival, so the keyboard never opens over a question before it has been read.
- **Mouse and keyboard** - numbers are typed into a field rather than tapped on a keypad, the answer control is focused on arrival so typing can start immediately, Enter moves to the next question, Tab reaches every control with a visible focus ring, and on a list of options the arrow keys move between them while the number keys pick one outright.

Which set of controls a participant saw is recorded per screen as `input_mode`.

## File Structure

#### `plugin-question-screen.js`
**Purpose**: jsPsych plugin (`jsPsychQuestionScreen`) that renders a single questionnaire screen.

**Question types**:
- `message` - something to read, and a button to move on
- `text` - a single large text field
- `number` - an on-screen keypad with a running readout on a touchscreen, or a typed field with the unit beside it on a machine with a keyboard. Anything typed that cannot be part of a number is dropped as it is entered
- `choice` - one large button per option, each ending the trial on a single tap. An option with `reveals: 'number'` or `reveals: 'text'` swaps the same screen for that entry control instead, which is how "5 or more" and "I describe it another way" are handled. What is revealed always has to be filled in, and the question's own escape buttons are dropped from it
- `date` - day, month and year as native selects, so the device's own picker is used. All three are optional, so a year on its own is a valid answer
- `list` - a yes/no gate; answering yes reveals a text field, an add button, and the list of items added so far, each removable

**Escape buttons**: a screen can offer one or more quiet buttons beside the forward button, each recording a missing answer under its own flag, because the reasons an answer is missing are not interchangeable in the data:

| Parameter | Flag | Means |
| --- | --- | --- |
| `unsure_label` | `unsure` | The participant cannot give the answer - a package they cannot read |
| `decline_label` | `declined` | The participant could answer but would rather not |
| `not_started_label` | `not_started` | On a `date` screen, there is no date yet to give |

**Data recorded per screen**: `question_name`, `question_type`, `response`, `response_label` (a readable version of the answer), `unsure`, `declined`, `not_started`, `input_mode`, and `rt`. `response` is a string for `text`, a number for `number`, the chosen option's value for `choice` (or the typed answer, where the option revealed an entry control), a `{day, month, year}` object for `date` (with `null` for anything left blank), and an array of strings for `list` (empty when the answer was "no").

The plugin implements `simulate()` in both data-only and visual modes; visual mode drives the real controls.

#### `styles.css`
**Purpose**: Styling for the screens, scoped under `.qsc-*`.
- 64px minimum control height, `touch-action: manipulation`, and no tap highlight, so taps land where they are aimed
- Text fields never drop below 16px, which stops iOS Safari zooming in on focus
- `.qsc-keyboard` (set by the plugin on the screen) tightens the controls for a cursor, and a `(hover: hover) and (pointer: fine)` block adds hover states; `:focus-visible` rings apply everywhere
- The slide transitions, and a `prefers-reduced-motion` fallback that removes them

## Usage

A task using these screens declares the stylesheet in its registry entry:

```javascript
requirements: {
  css: ['@tasks/question-screen/styles.css'],
}
```

and the experiment page loads the plugin, as the task registry only loads CSS:

```html
<script src="tasks/question-screen/plugin-question-screen.js"></script>
```

The questions themselves live in the task's own `timeline.js`; see either task for a worked set.

## Notes
- The self-report battery (`tasks/self-report/`) renders its items through a plugin of its own, `.srq-*`, which deliberately shares this look. Its items are a fixed statement and one response scale rather than a question with a control chosen per screen, which is why it is a separate plugin rather than another `question_type` here.
