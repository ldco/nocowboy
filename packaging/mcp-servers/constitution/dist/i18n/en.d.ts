declare const en: {
    constitution: {
        rule: {
            noAnyType: {
                message: string;
                suggestion: string;
            };
            noRawSql: {
                message: string;
                suggestion: string;
            };
            noHardcodedSecrets: {
                message: string;
                suggestion: string;
            };
            noConsoleLog: {
                message: string;
                suggestion: string;
            };
            noEval: {
                message: string;
                suggestion: string;
            };
            newFunction: {
                message: string;
                suggestion: string;
            };
            maxFunctionLines: {
                message: string;
                suggestion: string;
            };
            maxComplexity: {
                message: string;
                suggestion: string;
            };
            requireNullCheck: {
                message: string;
                suggestion: string;
            };
            requireErrorHandling: {
                message: string;
                suggestion: string;
            };
            requireCsrfDecorator: {
                message: string;
                suggestion: string;
            };
            noTypeSuppressions: {
                message: string;
                suppressionMsg: string;
                emptyCatchMsg: string;
                suggestion: string;
            };
        };
        tool: {
            checkFile: {
                name: string;
                description: string;
                inputPath: string;
            };
            checkProject: {
                name: string;
                description: string;
                inputGlob: string;
                inputPaths: string;
                inputMaxFiles: string;
            };
            listRules: {
                name: string;
                description: string;
            };
            status: {
                name: string;
                description: string;
            };
        };
        module: {
            notFound: string;
            loaded: string;
            failed: string;
            noModules: string;
            unknownLang: string;
            langNotLoaded: string;
        };
        check: {
            fileNotFound: string;
            empty: string;
            summary: string;
            truncated: string;
            passed: string;
            failed: string;
            ruleFailed: string;
        };
        violation: {
            format: string;
            summaryTitle: string;
            errorsLabel: string;
            byRule: string;
        };
    };
};
export default en;
