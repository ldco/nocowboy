export declare function getProjectRoot(): string;
export declare function getRalphDir(): string;
export declare function getStatePath(): string;
export declare function getLearningsPath(): string;
export declare function getCompleteSentinelPath(): string;
export declare function ensureDir(dir: string): void;
export declare function safeReadJson<T>(path: string, fallback: T): T;
export declare function safeWriteJson(path: string, data: unknown): void;
export declare function runCmd(command: string, cwd?: string): {
    stdout: string;
    code: number;
};
export declare function scanGitLogForStoryIds(storyIds: string[]): Map<string, string>;
