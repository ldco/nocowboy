declare const en: {
    contractGuard: {
        tool: {
            check: {
                name: string;
                description: string;
            };
            status: {
                name: string;
                description: string;
            };
        };
        check: {
            inputBackend: string;
            inputFrontend: string;
        };
        change: {
            endpointRemoved: string;
            endpointAdded: string;
            authRemoved: string;
            fieldRemoved: string;
            fieldBecomeOptional: string;
            fieldTypeChanged: string;
            fieldAdded: string;
        };
        severity: {
            breaking: string;
            warning: string;
            compatible: string;
        };
        error: {
            fileNotFound: string;
        };
        status: {
            ready: string;
        };
    };
};
export default en;
