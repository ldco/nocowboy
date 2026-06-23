declare const en: {
    ncpValidator: {
        tool: {
            validate: {
                name: string;
                description: string;
            };
            list: {
                name: string;
                description: string;
            };
            diff: {
                name: string;
                description: string;
            };
        };
        validate: {
            inputPath: string;
        };
        diff: {
            inputOld: string;
            inputNew: string;
        };
        error: {
            fileNotFound: string;
            missingProtocol: string;
            missingModule: string;
            missingVersion: string;
            missingEntities: string;
            invalidProtocol: string;
            entityNoFields: string;
            entityFieldNoType: string;
            entityFieldBadType: string;
            endpointNoReqRes: string;
            emptyFile: string;
            parseError: string;
            oldFileError: string;
            newFileError: string;
        };
        diffLabels: {
            entityAdded: string;
            entityRemoved: string;
            fieldRemoved: string;
            fieldBecameOptional: string;
            fieldTypeChanged: string;
            fieldAdded: string;
            typeEntityAdded: string;
            typeEntityRemoved: string;
            typeFieldRemoved: string;
            typeFieldBecameOptional: string;
            typeFieldTypeChanged: string;
            typeFieldAdded: string;
        };
    };
};
export default en;
