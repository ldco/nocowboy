import type { RalphState } from './types.js';
export declare function readState(): RalphState;
export declare function writeState(state: RalphState): void;
export declare function archiveState(state: RalphState): void;
export declare function getStoryFailures(state: RalphState, storyId: string): number;
export declare function shouldSkipAfterFailures(state: RalphState, storyId: string): boolean;
export declare function addLearning(state: RalphState, entry: {
    lesson: string;
    category: string;
    storyId?: string;
}): void;
