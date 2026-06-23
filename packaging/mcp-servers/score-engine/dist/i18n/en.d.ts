declare const en: {
    scoreEngine: {
        dimension: {
            ncpCompliance: {
                name: string;
                weight: number;
                description: string;
            };
            constitution: {
                name: string;
                weight: number;
                description: string;
            };
            contractIntegrity: {
                name: string;
                weight: number;
                description: string;
            };
            testCoverage: {
                name: string;
                weight: number;
                description: string;
            };
            securityPosture: {
                name: string;
                weight: number;
                description: string;
            };
        };
        tool: {
            compute: {
                name: string;
                description: string;
                inputDims: string;
                outputScore: string;
                outputPassed: string;
                outputTrend: string;
            };
            history: {
                name: string;
                description: string;
                inputLimit: string;
            };
            badge: {
                name: string;
                description: string;
                inputScore: string;
            };
            breakdown: {
                name: string;
                description: string;
            };
        };
        result: {
            trendUp: string;
            trendDown: string;
            trendStable: string;
        };
    };
};
export default en;
