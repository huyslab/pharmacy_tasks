/**
 * Determines which blocks to skip based on last state
 * @param {Array} structure - Task structure with blocks
 * @param {string} lastState - Last recorded state
 * @param {string} taskName - Name of the task
 * @param {Object} resumptionRules - Resumption configuration from task registry
 * @returns {Array} Filtered structure with completed blocks removed
 */
export function applyWithinTaskResumptionRules(structure, lastState, taskName, resumptionRules) {
    console.log(structure, lastState, taskName, resumptionRules);
    if (!resumptionRules?.enabled || !lastState || lastState === "none") {
        console.log("Resumption rules not enabled or no last state found.");
        return structure;
    }

    if (resumptionRules.granularity === 'item') {
        if (lastState === `${taskName}_finish`) return [];
        const prefix = `${taskName}_item_`;
        const match = lastState.startsWith(prefix)
            ? lastState.slice(prefix.length).match(/^([1-9]\d*)_finish$/)
            : null;
        const completed = match ? Number(match[1]) : 0;
        if (completed > structure.length) return structure;
        return structure.filter(item => item.question_index >= completed);
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
