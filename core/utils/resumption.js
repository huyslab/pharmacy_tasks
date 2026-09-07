/**
 * Determines which completed blocks or trials to skip based on the last state
 * @param {Array} structure - Ordered task structure with blocks or trials
 * @param {string} lastState - Last recorded state
 * @param {string} taskName - Name of the task
 * @param {Object} resumptionRules - Resumption configuration from task registry
 * @returns {Array} Filtered structure with completed blocks or trials removed
 */
export function applyWithinTaskResumptionRules(structure, lastState, taskName, resumptionRules) {
    console.log(structure, lastState, taskName, resumptionRules);
    if (!resumptionRules?.enabled || !lastState || lastState === "none") {
        console.log("Resumption rules not enabled or no last state found.");
        return structure;
    }

    if (resumptionRules.granularity === 'trial') {
        if (lastState === `${taskName}_finish`) return [];
        // The task parser returns a count of completed trials, independent of the
        // checkpoint format or the fields stored on each trial.
        const completed = resumptionRules.extractProgress(lastState, taskName);
        if (!Number.isInteger(completed) || completed < 0 || completed > structure.length) {
            return structure;
        }
        return structure.slice(completed);
    }

    if (resumptionRules.granularity === 'block') {
        const lastBlock = resumptionRules.extractProgress(lastState, taskName);
        
        return structure.filter((block, index) => {
            const blockNumber = block[0]?.block;
            
            // Skip blocks that are already completed
            if (typeof blockNumber === "number" && blockNumber <= lastBlock) {
                console.log(`Skipping completed block ${blockNumber} for ${taskName}`);
                return false;
            }
            return true;
        });
    }

    return structure;
}

/**
 * Get resumption state from URL or other source
 *
 * The website passes back the last state the task reported via updateState. mymeds names
 * that URL parameter `module_state` (TaskFrame.js); `state` is the older My RELMED name,
 * kept as a fallback so both hosts and the standalone examples keep working.
 *
 * @returns {string} Current resumption state
 */
export function getResumptionState() {
    // For direct URL parameter access
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('module_state') || urlParams.get('state') || "none";
}
