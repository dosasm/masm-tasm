import * as vscode from 'vscode';
/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class SeeinCPPDOCS implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
        // for each diagnostic entry that has the matching `code`, create a code action command
        return context.diagnostics
            .filter(diagnostic => this.isObjCode(diagnostic.code))
            .map(diagnostic => this.createCommandCodeAction(diagnostic.code as { value: string | number; target: vscode.Uri }));
    }
    private isObjCode(code: string | number | { value: string | number; target: vscode.Uri } | undefined): boolean {
        if (typeof code === 'object') { return 'target' in code; }
        return false;
    }
    private createCommandCodeAction(code: { value: string | number; target: vscode.Uri }): vscode.CodeAction {
        const action = new vscode.CodeAction('See in msvc', vscode.CodeActionKind.QuickFix);
        action.command = {
            command: "vscode.open",
            arguments: [code.target],
            title: 'Learn more about this error in microsoft cpp-docs',
            tooltip: 'This will open the cpp-docs page of masm.'
        };
        action.isPreferred = true;
        return action;
    }
}