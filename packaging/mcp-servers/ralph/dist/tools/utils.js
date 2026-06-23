import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
export function getProjectRoot() {
    const env = process.env.RALPH_PROJECT_ROOT;
    if (env && existsSync(env))
        return env;
    return process.cwd();
}
export function getRalphDir() {
    return resolve(getProjectRoot(), '.ralph');
}
export function getStatePath() {
    return resolve(getRalphDir(), 'state.json');
}
export function getLearningsPath() {
    return resolve(getRalphDir(), 'learnings.md');
}
export function getCompleteSentinelPath() {
    return resolve(getRalphDir(), 'COMPLETE');
}
export function ensureDir(dir) {
    if (!existsSync(dir)) {
        execSync(`mkdir -p "${dir}"`, { stdio: 'ignore' });
    }
}
export function safeReadJson(path, fallback) {
    try {
        if (!existsSync(path))
            return fallback;
        return JSON.parse(readFileSync(path, 'utf-8'));
    }
    catch {
        return fallback;
    }
}
export function safeWriteJson(path, data) {
    ensureDir(getRalphDir());
    const tmp = path + '.tmp';
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    execSync(`mv "${tmp}" "${path}"`, { stdio: 'ignore' });
}
export function runCmd(command, cwd) {
    try {
        const stdout = execSync(command, {
            cwd: cwd ?? getProjectRoot(),
            encoding: 'utf-8',
            timeout: 120_000,
            stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
        return { stdout, code: 0 };
    }
    catch (e) {
        const err = e;
        return {
            stdout: (err.stdout ?? err.stderr ?? String(e)).toString().trim(),
            code: err.status ?? 1,
        };
    }
}
export function scanGitLogForStoryIds(storyIds) {
    const found = new Map();
    const result = runCmd('git log --oneline --max-count=100');
    if (result.code !== 0)
        return found;
    const lines = result.stdout.split('\n');
    for (const id of storyIds) {
        const match = lines.find(l => l.includes(id));
        if (match)
            found.set(id, match);
    }
    return found;
}
//# sourceMappingURL=utils.js.map