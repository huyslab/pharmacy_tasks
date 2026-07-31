var jsPsychMedicationQuestion = (function (jspsych) {
    "use strict";

    const MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const info = {
        name: "medication-question",
        version: "0.1.0",
        parameters: {
            /** Which kind of screen to render: 'message', 'text', 'number', 'choice', 'date' or 'list' */
            question_type: {
                type: jspsych.ParameterType.STRING,
                default: "text"
            },
            /** The question itself, shown large at the top of the card */
            prompt: {
                type: jspsych.ParameterType.HTML_STRING,
                default: undefined
            },
            /** Smaller supporting line shown under the question */
            hint: {
                type: jspsych.ParameterType.HTML_STRING,
                default: ""
            },
            /** Field name the response is stored under */
            name: {
                type: jspsych.ParameterType.STRING,
                default: "response"
            },
            /** Placeholder for the text field ('text' and 'list' types) */
            placeholder: {
                type: jspsych.ParameterType.STRING,
                default: ""
            },
            /** Whether an answer is needed before the continue button becomes active */
            required: {
                type: jspsych.ParameterType.BOOL,
                default: true
            },
            /** Label of the escape button ('text' and 'number' types). Null hides it */
            unsure_label: {
                type: jspsych.ParameterType.STRING,
                default: null
            },
            /** Options for the 'choice' type. Each is {label, value, reveals}, where reveals:
             *  'number' swaps the screen for the keypad instead of finishing the trial */
            choices: {
                type: jspsych.ParameterType.COMPLEX,
                array: true,
                default: [],
                nested: {
                    label: {
                        type: jspsych.ParameterType.STRING,
                        default: undefined
                    },
                    value: {
                        type: jspsych.ParameterType.STRING,
                        default: undefined
                    },
                    reveals: {
                        type: jspsych.ParameterType.STRING,
                        default: null
                    }
                }
            },
            /** Unit shown next to the keypad readout, e.g. 'mg' */
            unit: {
                type: jspsych.ParameterType.STRING,
                default: ""
            },
            /** Whether the keypad offers a decimal point */
            allow_decimal: {
                type: jspsych.ParameterType.BOOL,
                default: true
            },
            /** Prompt shown on the keypad screen when it is revealed by a choice option */
            keypad_prompt: {
                type: jspsych.ParameterType.HTML_STRING,
                default: ""
            },
            /** Labels for the 'list' type screens */
            list_labels: {
                type: jspsych.ParameterType.OBJECT,
                default: {
                    yes: "Yes",
                    no: "No",
                    add: "Add",
                    add_prompt: "Add each medicine, one at a time.",
                    empty: "Nothing added yet."
                }
            },
            /** Earliest year offered by the 'date' type */
            earliest_year: {
                type: jspsych.ParameterType.INT,
                default: 1970
            },
            /** Label of the main forward button */
            button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Continue"
            },
            /** Position of this question in the questionnaire, used for the progress dots */
            question_index: {
                type: jspsych.ParameterType.INT,
                default: null
            },
            /** Total number of questions, used for the progress dots */
            n_questions: {
                type: jspsych.ParameterType.INT,
                default: null
            },
            /** Duration of the slide in / slide out transitions, in ms */
            transition_duration: {
                type: jspsych.ParameterType.INT,
                default: 350
            }
        },
        data: {
            /** Field name the response is stored under */
            question_name: {
                type: jspsych.ParameterType.STRING
            },
            /** Which kind of screen was shown */
            question_type: {
                type: jspsych.ParameterType.STRING
            },
            /** The answer: string ('text'), number ('number', 'choice'), object ('date'), array ('list') */
            response: {
                type: jspsych.ParameterType.OBJECT
            },
            /** Human-readable version of the answer, for quick inspection of the data */
            response_label: {
                type: jspsych.ParameterType.STRING
            },
            /** Whether the participant tapped the "I'm not sure" escape button */
            unsure: {
                type: jspsych.ParameterType.BOOL
            },
            /** Time from screen onset to the response that ended the trial */
            rt: {
                type: jspsych.ParameterType.INT
            }
        }
    };

    /**
     * **medication-question**
     *
     * jsPsych plugin presenting a single questionnaire screen designed for touchscreens:
     * one question per screen, finger-sized controls, an on-screen keypad for numbers, and
     * a slide-in / slide-out transition between screens. There is no way back to a previous
     * screen - each screen is its own trial and answers are committed when it slides away.
     *
     * @author {Yaniv Abir}
     */
    class MedicationQuestionPlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
        }

        trial(display_element, trial) {
            // Skip the transitions when running in simulation mode, so tests don't wait on them
            const simulating = window.simulating || false;
            const duration = simulating ? 0 : trial.transition_duration;

            const startTime = performance.now();

            display_element.innerHTML = this.buildFrame(trial);

            const screen = display_element.querySelector('.medq-screen');
            const body = display_element.querySelector('.medq-body');
            const footer = display_element.querySelector('.medq-footer');
            screen.style.setProperty('--medq-transition', duration + 'ms');

            // Slide the screen in from the right on the frame after it is in the DOM
            requestAnimationFrame(() => screen.classList.add('medq-screen-in'));

            /**
             * Slides the screen out to the left, then hands the answer to jsPsych.
             * @param {Object} response - {response, response_label, unsure} for this screen
             */
            const endTrial = (response) => {
                const trial_data = {
                    question_name: trial.name,
                    question_type: trial.question_type,
                    response: response.response,
                    response_label: response.response_label,
                    unsure: response.unsure || false,
                    rt: Math.round(performance.now() - startTime)
                };

                screen.classList.remove('medq-screen-in');
                screen.classList.add('medq-screen-out');

                this.jsPsych.pluginAPI.setTimeout(
                    () => this.jsPsych.finishTrial(trial_data),
                    duration
                );
            };

            // Each screen type wires up its own controls and calls endTrial when done
            switch (trial.question_type) {
                case 'message':
                    this.setupMessage(body, footer, trial, endTrial);
                    break;
                case 'text':
                    this.setupText(body, footer, trial, endTrial);
                    break;
                case 'number':
                    this.setupNumber(body, footer, trial, endTrial);
                    break;
                case 'choice':
                    this.setupChoice(body, footer, trial, endTrial);
                    break;
                case 'date':
                    this.setupDate(body, footer, trial, endTrial);
                    break;
                case 'list':
                    this.setupList(body, footer, trial, endTrial);
                    break;
                default:
                    throw new Error(`Unknown question_type "${trial.question_type}" in medication-question plugin.`);
            }
        }

        /**
         * Builds the shared card: progress dots, question, hint, and empty body/footer slots
         * that the per-type setup functions fill in.
         */
        buildFrame(trial) {
            let progress = '';
            if (trial.question_index !== null && trial.n_questions !== null) {
                const dots = Array.from({ length: trial.n_questions }, (_, i) => {
                    const state = i < trial.question_index ? ' medq-dot-done'
                        : (i === trial.question_index ? ' medq-dot-current' : '');
                    return `<span class="medq-dot${state}"></span>`;
                }).join('');
                progress = `<div class="medq-progress" aria-hidden="true">${dots}</div>`;
            }

            const hint = trial.hint ? `<div class="medq-hint">${trial.hint}</div>` : '';

            return `<div class="medq-screen">
                ${progress}
                <div class="medq-card">
                    <div class="medq-prompt">${trial.prompt}</div>
                    ${hint}
                    <div class="medq-body"></div>
                    <div class="medq-footer"></div>
                </div>
            </div>`;
        }

        /** Creates the large forward button, disabled until the screen has a usable answer */
        addContinueButton(footer, trial, enabled, onClick) {
            footer.insertAdjacentHTML('beforeend',
                `<button type="button" class="medq-btn medq-btn-primary" id="medq-continue"${enabled ? '' : ' disabled'}>${trial.button_label}</button>`);
            const button = footer.querySelector('#medq-continue');
            button.addEventListener('click', onClick);
            return button;
        }

        /** Creates the quieter "I'm not sure" escape button, when the question allows one */
        addUnsureButton(footer, trial, onClick) {
            if (!trial.unsure_label) return null;
            footer.insertAdjacentHTML('beforeend',
                `<button type="button" class="medq-btn medq-btn-quiet" id="medq-unsure">${trial.unsure_label}</button>`);
            const button = footer.querySelector('#medq-unsure');
            button.addEventListener('click', onClick);
            return button;
        }

        /** Screen with no question, just something to read and a button to move on */
        setupMessage(body, footer, trial, endTrial) {
            this.addContinueButton(footer, trial, true, () => {
                endTrial({ response: null, response_label: null });
            });
        }

        /** Free text answer, using the device's own keyboard */
        setupText(body, footer, trial, endTrial) {
            body.innerHTML = `<input type="text" class="medq-input" id="medq-text"
                placeholder="${trial.placeholder}" autocomplete="off" autocapitalize="words"
                autocorrect="off" spellcheck="false" enterkeyhint="done">`;

            const input = body.querySelector('#medq-text');

            const answer = () => input.value.trim();
            const submit = () => {
                if (trial.required && answer() === '') return;
                endTrial({ response: answer() || null, response_label: answer() || null });
            };

            const continueButton = this.addContinueButton(footer, trial, !trial.required, submit);
            this.addUnsureButton(footer, trial, () => {
                endTrial({ response: null, response_label: trial.unsure_label, unsure: true });
            });

            input.addEventListener('input', () => {
                continueButton.disabled = trial.required && answer() === '';
            });

            // The on-screen keyboard covers the lower half of the screen on phones, so bring
            // the field back into view once it has opened
            input.addEventListener('focus', () => {
                setTimeout(() => input.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
            });

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    input.blur();
                    submit();
                }
            });
        }

        /** Number answer, using a large on-screen keypad rather than the device keyboard */
        setupNumber(body, footer, trial, endTrial) {
            this.renderKeypad(body, trial);

            const readout = body.querySelector('#medq-keypad-value');
            let digits = '';

            const submit = () => {
                if (trial.required && digits === '') return;
                // "50." is a valid state to be in mid-entry, but not to record
                const entered = digits.replace(/\.$/, '');
                const value = entered === '' ? null : parseFloat(entered);
                endTrial({
                    response: value,
                    response_label: value === null ? null : `${entered}${trial.unit ? ' ' + trial.unit : ''}`
                });
            };

            const continueButton = this.addContinueButton(footer, trial, !trial.required, submit);
            this.addUnsureButton(footer, trial, () => {
                endTrial({ response: null, response_label: trial.unsure_label, unsure: true });
            });

            const render = () => {
                readout.textContent = digits === '' ? '–' : digits;
                readout.classList.toggle('medq-keypad-empty', digits === '');
                continueButton.disabled = trial.required && digits === '';
            };

            body.querySelectorAll('.medq-key').forEach(key => {
                key.addEventListener('click', () => {
                    const value = key.dataset.key;
                    if (value === 'del') {
                        digits = digits.slice(0, -1);
                    } else if (value === '.') {
                        // Only one decimal point, and never as the first character
                        if (digits !== '' && !digits.includes('.')) digits += '.';
                    } else if (digits.replace('.', '').length < 6) {
                        // Drop a leading zero so "0" then "5" reads as 5, not 05
                        digits = digits === '0' ? value : digits + value;
                    }
                    render();
                });
            });

            render();
        }

        /** Draws the keypad markup into a body element */
        renderKeypad(body, trial) {
            const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
            keys.push(trial.allow_decimal ? '.' : '');
            keys.push('0');

            const keyButtons = keys.map(key => key === ''
                ? `<span class="medq-key medq-key-blank" aria-hidden="true"></span>`
                : `<button type="button" class="medq-key" data-key="${key}">${key}</button>`
            ).join('');

            const unit = trial.unit ? `<span class="medq-keypad-unit">${trial.unit}</span>` : '';
            const keypadPrompt = trial.keypad_prompt ? `<div class="medq-hint">${trial.keypad_prompt}</div>` : '';

            body.innerHTML = `${keypadPrompt}
                <div class="medq-keypad-readout">
                    <span id="medq-keypad-value" class="medq-keypad-empty">–</span>${unit}
                </div>
                <div class="medq-keypad">
                    ${keyButtons}
                    <button type="button" class="medq-key medq-key-del" data-key="del" aria-label="Delete">⌫</button>
                </div>`;
        }

        /** One tap per answer: the options are the buttons, so there is nothing else to press */
        setupChoice(body, footer, trial, endTrial) {
            body.innerHTML = `<div class="medq-choices">${trial.choices.map((choice, i) =>
                `<button type="button" class="medq-btn medq-choice" data-index="${i}">${choice.label}</button>`
            ).join('')}</div>`;

            body.querySelectorAll('.medq-choice').forEach(button => {
                button.addEventListener('click', () => {
                    const choice = trial.choices[parseInt(button.dataset.index)];

                    // An option such as "5 or more" hands over to the keypad on this same
                    // screen, rather than ending the trial
                    if (choice.reveals === 'number') {
                        footer.innerHTML = '';
                        this.setupNumber(body, footer, { ...trial, required: true, unit: '', allow_decimal: false }, endTrial);
                        return;
                    }

                    endTrial({ response: choice.value, response_label: choice.label });
                });
            });
        }

        /** Day, month and year, each optional - a year on its own is a valid answer */
        setupDate(body, footer, trial, endTrial) {
            const thisYear = new Date().getFullYear();

            const options = (items) => items.map(item =>
                `<option value="${item.value}">${item.label}</option>`).join('');

            const days = [{ value: '', label: '–' }].concat(
                Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })));
            const months = [{ value: '', label: '–' }].concat(
                MONTHS.map((month, i) => ({ value: String(i + 1), label: month })));
            const years = [{ value: '', label: '–' }].concat(
                Array.from({ length: thisYear - trial.earliest_year + 1 },
                    (_, i) => ({ value: String(thisYear - i), label: String(thisYear - i) })));

            body.innerHTML = `<div class="medq-date">
                <label class="medq-date-field">
                    <span class="medq-date-label">Month</span>
                    <select class="medq-select" id="medq-month">${options(months)}</select>
                </label>
                <label class="medq-date-field">
                    <span class="medq-date-label">Year</span>
                    <select class="medq-select" id="medq-year">${options(years)}</select>
                </label>
                <label class="medq-date-field">
                    <span class="medq-date-label">Day</span>
                    <select class="medq-select" id="medq-day">${options(days)}</select>
                </label>
            </div>`;

            const day = body.querySelector('#medq-day');
            const month = body.querySelector('#medq-month');
            const year = body.querySelector('#medq-year');

            this.addContinueButton(footer, trial, true, () => {
                const parts = {
                    day: day.value === '' ? null : parseInt(day.value),
                    month: month.value === '' ? null : parseInt(month.value),
                    year: year.value === '' ? null : parseInt(year.value)
                };

                // Readable version, dropping whichever parts were left blank
                const label = [
                    parts.day === null ? null : String(parts.day),
                    parts.month === null ? null : MONTHS[parts.month - 1],
                    parts.year === null ? null : String(parts.year)
                ].filter(part => part !== null).join(' ');

                endTrial({ response: parts, response_label: label || null });
            });
        }

        /** A yes/no gate, then a chip list built one item at a time */
        setupList(body, footer, trial, endTrial) {
            const labels = trial.list_labels;

            body.innerHTML = `<div class="medq-choices">
                <button type="button" class="medq-btn medq-choice" id="medq-list-yes">${labels.yes}</button>
                <button type="button" class="medq-btn medq-choice" id="medq-list-no">${labels.no}</button>
            </div>`;

            body.querySelector('#medq-list-no').addEventListener('click', () => {
                endTrial({ response: [], response_label: labels.no });
            });

            body.querySelector('#medq-list-yes').addEventListener('click', () => {
                this.setupListEditor(body, footer, trial, endTrial);
            });
        }

        /** The second half of the 'list' screen: text field, add button, and the chips */
        setupListEditor(body, footer, trial, endTrial) {
            const labels = trial.list_labels;
            const items = [];

            body.innerHTML = `<div class="medq-hint">${labels.add_prompt}</div>
                <div class="medq-add-row">
                    <input type="text" class="medq-input" id="medq-list-input"
                        placeholder="${trial.placeholder}" autocomplete="off" autocapitalize="words"
                        autocorrect="off" spellcheck="false" enterkeyhint="done">
                    <button type="button" class="medq-btn medq-btn-add" id="medq-list-add" disabled>${labels.add}</button>
                </div>
                <ul class="medq-chips" id="medq-chips"><li class="medq-chips-empty">${labels.empty}</li></ul>`;

            const input = body.querySelector('#medq-list-input');
            const addButton = body.querySelector('#medq-list-add');
            const chips = body.querySelector('#medq-chips');

            footer.innerHTML = '';
            const continueButton = this.addContinueButton(footer, trial, !trial.required, () => {
                if (trial.required && items.length === 0) return;
                endTrial({
                    response: items.slice(),
                    // Distinguishes an empty list reached through "yes" from an outright "no"
                    response_label: items.join(', ') || `${labels.yes}, but none listed`
                });
            });

            const renderChips = () => {
                chips.innerHTML = items.length === 0
                    ? `<li class="medq-chips-empty">${labels.empty}</li>`
                    : items.map((item, i) =>
                        `<li class="medq-chip">${item}<button type="button" class="medq-chip-remove"
                            data-index="${i}" aria-label="Remove ${item}">×</button></li>`).join('');

                chips.querySelectorAll('.medq-chip-remove').forEach(button => {
                    button.addEventListener('click', () => {
                        items.splice(parseInt(button.dataset.index), 1);
                        renderChips();
                    });
                });

                continueButton.disabled = trial.required && items.length === 0;
            };

            const addItem = () => {
                const value = input.value.trim();
                if (value === '') return;
                items.push(value);
                input.value = '';
                addButton.disabled = true;
                renderChips();
                input.focus();
            };

            addButton.addEventListener('click', addItem);
            input.addEventListener('input', () => { addButton.disabled = input.value.trim() === ''; });
            input.addEventListener('focus', () => {
                setTimeout(() => input.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
            });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addItem();
                }
            });

            renderChips();
        }

        create_simulation_data(trial, simulation_options) {
            // A plausible answer per screen type, so a simulated run produces usable data
            const responses = {
                message: { response: null, response_label: null },
                text: { response: 'Sertraline', response_label: 'Sertraline' },
                number: { response: 50, response_label: `50${trial.unit ? ' ' + trial.unit : ''}` },
                choice: {
                    response: trial.choices.length ? trial.choices[0].value : null,
                    response_label: trial.choices.length ? trial.choices[0].label : null
                },
                date: {
                    response: { day: null, month: 3, year: new Date().getFullYear() - 1 },
                    response_label: `March ${new Date().getFullYear() - 1}`
                },
                list: { response: [], response_label: trial.list_labels.no }
            };

            const default_data = {
                question_name: trial.name,
                question_type: trial.question_type,
                unsure: false,
                rt: this.jsPsych.randomization.sampleExGaussian(2000, 400, 1 / 800, true),
                ...responses[trial.question_type]
            };

            const data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);
            this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);
            return data;
        }

        simulate(trial, simulation_mode, simulation_options, load_callback) {
            if (simulation_mode == 'data-only') {
                load_callback();
                this.simulate_data_only(trial, simulation_options);
            }
            if (simulation_mode == 'visual') {
                this.simulate_visual(trial, simulation_options, load_callback);
            }
        }

        simulate_data_only(trial, simulation_options) {
            const data = this.create_simulation_data(trial, simulation_options);
            this.jsPsych.finishTrial(data);
        }

        simulate_visual(trial, simulation_options, load_callback) {
            const data = this.create_simulation_data(trial, simulation_options);
            const display_element = this.jsPsych.getDisplayElement();

            this.trial(display_element, trial);
            load_callback();

            // Drive the real controls, so simulated runs exercise the same code paths
            this.jsPsych.pluginAPI.setTimeout(() => {
                const click = (selector) => {
                    const element = display_element.querySelector(selector);
                    if (element) this.jsPsych.pluginAPI.clickTarget(element);
                };

                if (trial.question_type === 'text') {
                    const input = display_element.querySelector('#medq-text');
                    input.value = data.response === null ? '' : data.response;
                    input.dispatchEvent(new Event('input'));
                } else if (trial.question_type === 'number') {
                    String(data.response === null ? '' : data.response).split('')
                        .forEach(digit => click(`.medq-key[data-key="${digit}"]`));
                } else if (trial.question_type === 'choice') {
                    click('.medq-choice');
                    return;
                } else if (trial.question_type === 'date') {
                    const month = display_element.querySelector('#medq-month');
                    const year = display_element.querySelector('#medq-year');
                    if (data.response) {
                        month.value = data.response.month === null ? '' : String(data.response.month);
                        year.value = data.response.year === null ? '' : String(data.response.year);
                    }
                } else if (trial.question_type === 'list') {
                    click('#medq-list-no');
                    return;
                }

                click('#medq-continue');
            }, data.rt);
        }
    }
    MedicationQuestionPlugin.info = info;

    return MedicationQuestionPlugin;
})(jsPsychModule);
