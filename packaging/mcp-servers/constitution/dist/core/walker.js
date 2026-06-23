import { t } from '../i18n/index.js';
export function walkTree(source, filename, rules) {
    const violations = [];
    for (const rule of rules) {
        try {
            violations.push(...rule.check(source, filename));
        }
        catch (err) {
            console.error(t('constitution.check.ruleFailed', { rule: rule.id, file: filename, error: String(err) }));
        }
    }
    return violations;
}
//# sourceMappingURL=walker.js.map