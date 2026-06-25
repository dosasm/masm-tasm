/**
 * Hover provider.
 * Uses token-based context analysis to show relevant hover information.
 * Delegates to existing data sources (FELIX, cppdoc, Markdown) for documentation.
 */

import * as vscode from 'vscode';
import { DocumentAnalysis } from '../analysis';
import { FELIX } from '../data/felix';
import { Cppdoc, keywordType } from '../data/cppdoc';
import { HoverFromMarkdown } from '../data/markdown';
import { isNumberStr, getNumMsg, getcharMsg, getType } from '../../language/wordinfo';
import { TokenType } from '../tokens';
import { SymbolKind } from '../symbol';

// Map our symbol kinds to the legacy KeywordType for display
function symbolKindToKeywordType(kind: SymbolKind): string {
    switch (kind) {
        case SymbolKind.Segment: return 'Segment';
        case SymbolKind.Procedure: return 'Procedure';
        case SymbolKind.Macro: return 'Macro';
        case SymbolKind.Structure: return 'Structure';
        case SymbolKind.Label: return 'Label';
        case SymbolKind.Variable: return 'Variable';
        case SymbolKind.Constant: return 'Constant';
        case SymbolKind.Parameter: return 'Parameter';
        case SymbolKind.Extern: return 'Extern';
        default: return 'Symbol';
    }
}

export class AsmHoverProvider implements vscode.HoverProvider {
    private cppdoc?: Cppdoc;
    private felix?: FELIX;
    private fromMD?: HoverFromMarkdown;
    private initialized = false;

    constructor(private ctx: vscode.ExtensionContext) {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            this.cppdoc = await Cppdoc.create(this.ctx);
            const jsonfile = vscode.Uri.joinPath(this.ctx.extensionUri, 'resources/instructions-reference.json');
            this.felix = await FELIX.create(jsonfile);
            const mdfile = vscode.Uri.joinPath(this.ctx.extensionUri, 'resources/hoverinfo.md');
            this.fromMD = await HoverFromMarkdown.create(mdfile);
            this.initialized = true;
        } catch (e) {
            console.error('Failed to initialize hover data sources:', e);
        }
    }

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): Promise<vscode.Hover | undefined> {
        const analysis = DocumentAnalysis.get(document);
        const token = analysis.getTokenAtPosition(position.line, position.character);
        if (!token) { return undefined; }

        const word = token.text;
        const wordLow = word.toLowerCase();

        // ─── Number literals ─────────────────────────────────────────────
        if (token.type === TokenType.Number) {
            if (isNumberStr(wordLow)) {
                return new vscode.Hover(new vscode.MarkdownString(getNumMsg(wordLow)));
            }
        }

        // ─── String/character literals ───────────────────────────────────
        if (token.type === TokenType.String) {
            const charMatch = /^['"](.)['"]$/.exec(word);
            if (charMatch) {
                return new vscode.Hover(new vscode.MarkdownString(getcharMsg(charMatch[1])));
            }
        }

        // ─── User-defined symbols ───────────────────────────────────────
        const symbol = analysis.findSymbol(word);
        if (symbol) {
            const md = new vscode.MarkdownString();
            const kindName = symbolKindToKeywordType(symbol.kind);
            md.appendMarkdown(`**${kindName}** \`${symbol.name}\`\n\n`);
            if (symbol.detail) {
                md.appendMarkdown(`${symbol.detail}\n\n`);
            }
            md.appendMarkdown(`*Defined at line ${symbol.definition.start.line + 1}*`);
            return new vscode.Hover(md);
        }

        // ─── Instructions ───────────────────────────────────────────────
        if (token.type === TokenType.Instruction) {
            const md = await this.getInstructionHover(word);
            if (md) { return new vscode.Hover(md); }
        }

        // ─── Registers ──────────────────────────────────────────────────
        if (token.type === TokenType.Register) {
            const md = await this.getKeywordHover(word, [keywordType.register]);
            if (md) { return new vscode.Hover(md); }
        }

        // ─── Directives ─────────────────────────────────────────────────
        if (token.type === TokenType.Directive || token.type === TokenType.SizeDirective) {
            const md = await this.getKeywordHover(word, [keywordType.directive, keywordType.symbol]);
            if (md) { return new vscode.Hover(md); }
        }

        // ─── Operators ──────────────────────────────────────────────────
        if (token.type === TokenType.Operator) {
            const md = await this.getKeywordHover(word, [keywordType.operator]);
            if (md) { return new vscode.Hover(md); }
        }

        // ─── Identifiers (fallback) ─────────────────────────────────────
        if (token.type === TokenType.Identifier) {
            // Try all sources
            const md = await this.getKeywordHover(word, [keywordType.other, keywordType.directive, keywordType.register]);
            if (md) { return new vscode.Hover(md); }
        }

        return undefined;
    }

    private async getInstructionHover(word: string): Promise<vscode.MarkdownString | undefined> {
        let content = '';

        // Custom markdown source
        if (this.fromMD) {
            const frommd = this.fromMD.findKeyword(word, [keywordType.instruction]);
            if (frommd) { content += frommd.trimEnd() + '\n\n'; }
        }

        // FELIX x86 reference
        if (this.felix) {
            const felix = this.felix.findKeyword(word);
            if (felix) { content = felix + '\n---\n\n' + content.trim(); }
        }

        // cppdoc
        if (this.cppdoc) {
            const cppdoc = await this.cppdoc.findKeyword(word, [keywordType.instruction]);
            if (cppdoc) { content += cppdoc; }
        }

        if (content.trim()) {
            return new vscode.MarkdownString(content);
        }
        return undefined;
    }

    private async getKeywordHover(word: string, types: keywordType[]): Promise<vscode.MarkdownString | undefined> {
        let content = '';

        if (this.fromMD) {
            const frommd = this.fromMD.findKeyword(word, types);
            if (frommd) { content += frommd.trimEnd() + '\n\n'; }
        }

        if (this.cppdoc) {
            const cppdoc = await this.cppdoc.findKeyword(word, types);
            if (cppdoc) { content += cppdoc; }
        }

        if (content.trim()) {
            return new vscode.MarkdownString(content);
        }
        return undefined;
    }
}
