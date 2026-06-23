import type { Story } from './types.js';
interface ParseResult {
    prdName: string;
    stories: Story[];
    error?: string;
}
export declare function parsePrd(filePath: string): ParseResult;
export declare function detectCircularDependencies(stories: Story[]): string | null;
export {};
