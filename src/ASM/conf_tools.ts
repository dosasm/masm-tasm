import { workspace, Uri, window } from 'vscode';
import { Validator } from 'jsonschema';
import { logger } from './outputChannel';

const fs = workspace.fs;
const CONF_FILE_NAME = './asmAction.json';
const SCHEMA_PATH = './resources/toolsConfigSchema.json';

export async function scanTools(uri: Uri, extUri: Uri): Promise<ToolsConfig> {
    let str: string, json: any, schema: any, fileuri: Uri;
    fileuri = Uri.joinPath(uri, CONF_FILE_NAME);
    str = (await fs.readFile(fileuri)).toString();
    json = JSON.parse(str);
    fileuri = Uri.joinPath(extUri, SCHEMA_PATH);
    str = (await fs.readFile(fileuri)).toString();
    schema = JSON.parse(str);
    if (json && schema) {
        let v = new Validator();
        let r = v.validate(json, schema);
        if (r.valid) {
            return json;
        }
        else {
            logger({
                title: `[invalid Tool Conf] ${fileuri.fsPath}`,
                content: r.errors.toString()
            });
        }
    }
    else {
        window.showErrorMessage(`can't parse ${fileuri.fsPath}`);
    }
    return new ToolsConfig();
}

export class ToolsConfig {
    dosboxFolder?: string;
    msdosFolder?: string;
    dosbox: DosboxAction | null = null;
    msdos: MsdosAction | null = null;
    constructor() { };
}

interface MsdosAction {
    workspace: string;
    path: string;
    masm: string;
    tasm: string;
    masm_debug: string;
    run: string;
}

interface DosboxAction {
    open: string;
    masm: string;
    tasm: string;
    tasm_debug: string;
    masm_debug: string;
    run: string;
    after_action: string;
}