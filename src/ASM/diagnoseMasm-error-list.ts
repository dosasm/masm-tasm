const link = "https://docs.microsoft.com/en-us/cpp/assembler/masm/"
const namelist = [
    "ml-fatal-error-a1000",
    "ml-fatal-error-a1005",
    "ml-fatal-error-a1007",
    "ml-fatal-error-a1008",
    "ml-fatal-error-a1009",
    "ml-fatal-error-a1010",
    "ml-fatal-error-a1011",
    "ml-fatal-error-a1016",
    "ml-fatal-error-a1017",
    "ml-nonfatal-error-a2004",
    "ml-nonfatal-error-a2006",
    "ml-nonfatal-error-a2008",
    "ml-nonfatal-error-a2010",
    "ml-nonfatal-error-a2019",
    "ml-nonfatal-error-a2022",
    "ml-nonfatal-error-a2031",
    "ml-nonfatal-error-a2034",
    "ml-nonfatal-error-a2037",
    "ml-nonfatal-error-a2038",
    "ml-nonfatal-error-a2039",
    "ml-nonfatal-error-a2044",
    "ml-nonfatal-error-a2047",
    "ml-nonfatal-error-a2050",
    "ml-nonfatal-error-a2054",
    "ml-nonfatal-error-a2055",
    "ml-nonfatal-error-a2057",
    "ml-nonfatal-error-a2059",
    "ml-nonfatal-error-a2060",
    "ml-nonfatal-error-a2063",
    "ml-nonfatal-error-a2064",
    "ml-nonfatal-error-a2065",
    "ml-nonfatal-error-a2066",
    "ml-nonfatal-error-a2069",
    "ml-nonfatal-error-a2070",
    "ml-nonfatal-error-a2074",
    "ml-nonfatal-error-a2078",
    "ml-nonfatal-error-a2079",
    "ml-nonfatal-error-a2083",
    "ml-nonfatal-error-a2085",
    "ml-nonfatal-error-a2096",
    "ml-nonfatal-error-a2097",
    "ml-nonfatal-error-a2107",
    "ml-nonfatal-error-a2119",
    "ml-nonfatal-error-a2133",
    "ml-nonfatal-error-a2137",
    "ml-nonfatal-error-a2189",
    "ml-nonfatal-error-a2206",
    "ml-nonfatal-error-a2219",
    "ml-warning-a4004",
    "ml-warning-a4012",
    "ml-warning-a4014",
]
/**
 * offer a link like `https://docs.microsoft.com/en-us/cpp/assembler/masm/ml-nonfatal-error-a2008`
 * for reference
 * @param str the code of the error information
 */
export function getInternetlink(str: string): string | undefined {
    let code = str.toLowerCase();
    let find = namelist.find(value => {
        value.match(code)
    });
    if (find) {
        return link + find
    }
    return undefined
}