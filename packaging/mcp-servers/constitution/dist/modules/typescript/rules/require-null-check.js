import { t } from '../../../i18n/index.js';
const NULLABLE_METHODS = ['.find(', '.findLast(', '.first(', '.last(', '.single(', '.get(', '.pick(', 'JSON.parse(', 'document.querySelector', 'document.getElementById'];
export const rule = {
    id: 'require-null-check', language: 'typescript', severity: 'error',
    description: t('constitution.rule.requireNullCheck.message', { name: '' }),
    auto_fixable: false,
    check(source, filename) {
        const violations = [];
        const lines = source.split('\n');
        const nullableVars = new Map();
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('//'))
                continue;
            const nc = trimmed.match(/\bif\s*\(\s*!(\w+)\s*\)/);
            if (nc) {
                nullableVars.delete(nc[1]);
                continue;
            }
            for (const method of NULLABLE_METHODS) {
                const idx = trimmed.indexOf(method);
                if (idx < 0)
                    continue;
                const am = trimmed.slice(0, idx).trim().match(/(?:const|let|var)\s+(\w+)\s*=\s*/);
                if (am)
                    nullableVars.set(am[1], i + 1);
            }
        }
        for (const [varName, lineNum] of nullableVars) {
            violations.push({
                rule: 'require-null-check', language: 'typescript', severity: 'error',
                file: filename, line: lineNum, column: 1,
                message: t('constitution.rule.requireNullCheck.message', { name: varName }),
                suggestion: t('constitution.rule.requireNullCheck.suggestion', { name: varName }),
                auto_fixable: false,
            });
        }
        return violations;
    },
};
//# sourceMappingURL=require-null-check.js.map