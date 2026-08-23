const { readFileSync, writeFileSync } = require('fs');
const path = require('path');
const yaml = require('yaml');

const srcFile = path.resolve(__dirname, '..', 'resources', 'hoverinfo.md');
const dstFile = path.resolve(__dirname, '..', 'resources', 'hoverinfo.parsed.md');

const content = readFileSync(srcFile, 'utf-8').replace(/\r\n/g, '\n');

const regex = /```yaml\n([\s\S]+?)\n```([\s\S]+?)(?=```|$)/g;
const entries = [];

let match;
while ((match = regex.exec(content)) !== null) {
    const [, yamlCode, contentPart] = match;
    const head = yaml.parse(yamlCode);
    // Skip entries without valid type or keyword (e.g., the file header)
    if (head.type === undefined || head.keyword === undefined || head.keyword === null) {
        continue;
    }
    const info = contentPart.includes('\n---\n')
        ? contentPart.split('\n---\n').map(s => s.trim())
        : [contentPart.trim()];
    entries.push({ head, info });
}

// Generate parsed markdown with HTML comment metadata
let output = '';
for (const entry of entries) {
    const { head, info } = entry;
    const metaParts = [`type:${head.type}`];
    if (head.keyword !== undefined) {
        const kw = Array.isArray(head.keyword) ? head.keyword.join(',') : head.keyword;
        metaParts.push(`keyword:${kw}`);
    }
    if (head.i18n && head.i18n.length > 0) {
        metaParts.push(`i18n:${head.i18n.join(',')}`);
    }
    output += `<!-- ${metaParts.join(' ')} -->\n`;
    output += info.join('\n---\n') + '\n\n';
}

writeFileSync(dstFile, output);
console.log(`Generated ${dstFile} with ${entries.length} entries`);