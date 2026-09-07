import { updateState, saveDataREDCap } from '@utils/index.js';

const videoURL = new URL('../../assets/videos/Mymeds_1_faststart.mp4', import.meta.url).href;

export function createInstructionVideoTimeline(settings) {
    let preloadSuccess = false;
    let playbackStarted = false;
    let playbackCompleted = false;
    let playbackError = null;

    return [{
        timeline: [
            {
                type: jsPsychPreload,
                video: [videoURL],
                show_progress_bar: true,
                message: '<p>Loading the introductory video. This may take up to a minute.</p>',
                max_load_time: 60000,
                continue_after_error: true,
                data: { trialphase: `${settings.task_name}_preload` },
                on_finish: data => { preloadSuccess = data.success === true; }
            },
            {
                type: jsPsychInstructions,
                css_classes: ['instructions'],
                pages: () => [preloadSuccess
                    ? '<p>Please watch this introductory video before starting the games.</p><p>Press play to begin. Once the video ends, select Continue.</p>'
                    : '<p>The video is taking a little longer to load.</p><p>You can try playing it on the next screen, or select Continue to start the games.</p>'],
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
                response_allowed_while_playing: () => !preloadSuccess,
                prompt: '<p id="instruction-video-status" aria-live="polite"></p>',
                data: { trialphase: `${settings.task_name}_play` },
                on_load: () => {
                    const video = document.querySelector('#jspsych-video-button-response-stimulus');
                    const handleError = () => {
                        playbackError = video?.error?.code ?? 0;
                        const status = document.querySelector('#instruction-video-status');
                        if (status) {
                            status.textContent = 'The video could not play. Please select Continue to start the games.';
                        }
                        document.querySelectorAll('#jspsych-video-button-response-btngroup button')
                            .forEach(button => { button.disabled = false; });
                    };
                    if (!video) {
                        handleError();
                        return;
                    }
                    video.setAttribute('playsinline', '');
                    video.addEventListener('playing', () => { playbackStarted = true; });
                    video.addEventListener('ended', () => { playbackCompleted = true; });
                    video.addEventListener('error', handleError);
                    // Source-element errors do not bubble to the video element.
                    video.querySelectorAll('source').forEach(source => source.addEventListener('error', handleError));
                    if (video.error) handleError();
                },
                on_finish: data => {
                    data.preload_success = preloadSuccess;
                    data.playback_started = playbackStarted;
                    data.playback_completed = playbackCompleted;
                    data.playback_error = playbackError;
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
