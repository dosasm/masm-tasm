import assert = require("assert");
import { downloadFromMultiSources } from "../../utils/downloadFile";

suite("test download", async function () {
    test("test download with fetch", async function () {
        const list = [
            'https://cdn.jsdelivr.net/gh/MicrosoftDocs/cpp-docs@master/docs/assembler/masm/assume.md',
            'https://raw.githubusercontent.com/MicrosoftDocs/cpp-docs/master/docs/assembler/masm/assume.md',
            'https://gitee.com/dosasm/cpp-docs/raw/master/docs/assembler/masm/assume.md'
        ];
        for (const url of list) {
            const str = await downloadFromMultiSources([url]);
            assert.ok(str, url);
        }
    });
});
