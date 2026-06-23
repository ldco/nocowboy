import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRalphDir, getStatePath, getLearningsPath, safeReadJson, safeWriteJson, ensureDir } from './tools/utils.js';
const MAX_RETRIES_PER_STORY = 3;
export function readState() {
    return safeReadJson(getStatePath(), {
        prdPath: '',
        prdName: '',
        startedAt: '',
        complete: false,
        failed: false,
        detectedStack: null,
        stories: [],
        learnings: [],
        currentStoryId: null,
        iteration: 0,
    });
}
export function writeState(state) {
    safeWriteJson(getStatePath(), state);
}
export function archiveState(state) {
    const archiveDir = join(getRalphDir(), 'archive');
    ensureDir(archiveDir);
    const name = `state-${state.prdName}-${Date.now()}.json`;
    const src = getStatePath();
    if (existsSync(src)) {
        copyFileSync(src, join(archiveDir, name));
    }
}
export function getStoryFailures(state, storyId) {
    return state.learnings.filter(l => l.category === 'dead_end' && l.storyId === storyId).length;
}
export function shouldSkipAfterFailures(state, storyId) {
    return getStoryFailures(state, storyId) >= MAX_RETRIES_PER_STORY;
}
export function addLearning(state, entry) {
    state.learnings.push({
        lesson: entry.lesson,
        category: entry.category,
        storyId: entry.storyId,
        timestamp: new Date().toISOString(),
    });
    appendLearningToFile(entry);
}
function appendLearningToFile(entry) {
    ensureDir(getRalphDir());
    const line = `- [${entry.category}]${entry.storyId ? ` [${entry.storyId}]` : ''} ${entry.lesson}`;
    try {
        const existing = existsSync(getLearningsPath()) ? readFileSync(getLearningsPath(), 'utf-8') : '';
        const header = '## Learnings\n';
        const content = existing.startsWith(header)
            ? existing + '\n' + line
            : header + line;
        writeFileSync(getLearningsPath(), content, 'utf-8');
    }
    catch {
        // fail silently
    }
}
//# sourceMappingURL=state.js.map