export type I18nDict = Record<string, any>;
export declare function createI18n(locale: I18nDict): (key: string, params?: Record<string, string | number>) => string;
