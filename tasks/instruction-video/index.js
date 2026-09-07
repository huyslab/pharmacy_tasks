import { updateState, saveDataREDCap } from '@utils/index.js';

const videoURL = new URL('../../assets/videos/Mymeds_1_faststart.mp4', import.meta.url).href;

export function createInstructionVideoTimeline(settings) {
    return [{
        timeline: [
            {
                type: jsPsychPreload,
                video: [videoURL],
                show_progress_bar: true,
                message: '<p>Loading the introductory video. This may take up to a minute.</p>',
                // A failed download must not silently skip the instructions.
                continue_after_error: false,
                error_message: '<p>The video could not load. Please check your connection and reload this page to try again.</p>',
                data: { trialphase: `${settings.task_name}_preload` }
            },
            {
                type: jsPsychInstructions,
                css_classes: ['instructions'],
                pages: ['<p>Please watch this introductory video before starting the games.</p><p>Press play to begin. Once the video ends, select Continue.</p>'],
                show_clickable_nav: true,
                data: { trialphase: `${settings.task_name}_intro` }
            },
            {
                type: jsPsychVideoButtonResponse,
                css_classes: ['instruction-video'],
                stimulus: [videoURL],
                choices: ['Continue'],
                controls: true,
                autoplay: false,
                trial_ends_after_video: false,
                response_allowed_while_playing: false,
                data: { trialphase: `${settings.task_name}_play` },
                on_load: () => {
                    document.querySelector('#jspsych-video-button-response-stimulus').setAttribute('playsinline', '');
                }
            }
        ],
        on_timeline_start: () => { updateState(`${settings.task_name}_start`); },
        on_timeline_finish: () => {
            updateState(`${settings.task_name}_finish`, false);
            saveDataREDCap(3);
        }
    }];
}
