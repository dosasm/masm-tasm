const link = "https://docs.microsoft.com/en-us/cpp/assembler/masm/";
const list = [
    {
        type: "fatal-error",
        codes: [
            "a1000", "a1005", "a1007", "a1008", "a1009", "a1010", "a1011", "a1016", "a1017"
        ],
    },
    {
        type: "nonfatal-error",
        codes: [
            "a2004", "a2006", "a2008", "a2010", "a2019", "a2022", "a2031", "a2034", "a2037", "a2038", "a2039", "a2044", "a2047",
            "a2050", "a2054", "a2055", "a2057", "a2059", "a2060", "a2063", "a2064", "a2065", "a2066", "a2069", "a2070", "a2074",
            "a2078", "a2079", "a2083", "a2085", "a2096", "a2097", "a2107", "a2119", "a2133", "a2137", "a2189", "a2206", "a2219"
        ]
    },
    {
        type: "warning",
        codes: [
            "a4004", "a4012", "a4014"
        ]
    }
];
/**
 * offer a link like `https://docs.microsoft.com/en-us/cpp/assembler/masm/ml-nonfatal-error-a2008`
 * for reference
 * @param str the code of the error information
 */
export function getInternetlink(str: string): string | undefined {
    for (let val of list) {
        for (let code of val.codes) {
            if (str.toLowerCase() === code) {
                return `${link}ml-${val.type}-${code}`;
            }
        }
    }
    return undefined;
}