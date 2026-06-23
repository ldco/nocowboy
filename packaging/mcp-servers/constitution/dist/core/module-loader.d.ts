import type { ConstitutionConfig, LanguageModule } from '../types.js';
export declare function findConfig(): ConstitutionConfig;
export declare function loadModules(config: ConstitutionConfig): Promise<Map<string, LanguageModule>>;
