export function createI18n(locale) {
    return (key, params) => {
        const parts = key.split('.');
        let current = locale;
        for (const part of parts) {
            if (current == null || typeof current !== 'object')
                return key;
            current = current[part];
        }
        if (typeof current !== 'string')
            return key;
        if (!params)
            return current;
        let result = current;
        for (const [k, v] of Object.entries(params)) {
            result = result.replace(`{${k}}`, String(v));
        }
        return result;
    };
}
//# sourceMappingURL=i18n.js.map