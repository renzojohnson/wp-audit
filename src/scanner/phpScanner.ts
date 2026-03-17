import * as vscode from 'vscode';
import { Rule, AuditFinding } from '../types';
import { PERFORMANCE_RULES } from '../rules/performanceRules';
import { SECURITY_RULES } from '../rules/securityRules';

export class PhpScanner {

    private rules: Rule[];

    constructor(enablePerformance: boolean, enableSecurity: boolean) {
        this.rules = [];
        if (enablePerformance) {
            this.rules.push(...PERFORMANCE_RULES.filter(r => r.scope === 'static'));
        }
        if (enableSecurity) {
            this.rules.push(...SECURITY_RULES.filter(r => r.scope === 'static'));
        }
    }

    scanDocument(document: vscode.TextDocument): AuditFinding[] {
        const findings: AuditFinding[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Pre-compute block comment ranges for accurate comment detection
        const blockCommentRanges: Array<{ start: number; end: number }> = [];
        const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
        let bcMatch: RegExpExecArray | null;
        while ((bcMatch = blockCommentRegex.exec(text)) !== null) {
            blockCommentRanges.push({ start: bcMatch.index, end: bcMatch.index + bcMatch[0].length });
        }

        for (const rule of this.rules) {
            const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
                const matchIndex = match.index;
                const pos = document.positionAt(matchIndex);
                const line = lines[pos.line];

                // Skip matches inside block comments
                const inBlock = blockCommentRanges.some(r => matchIndex >= r.start && matchIndex < r.end);
                if (inBlock) {
                    continue;
                }

                // Skip matches inside single-line comments (// or #)
                const trimmed = line.trimStart();
                if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
                    continue;
                }

                // Skip matches inside inline comments (// or #, but not http:// or https://)
                const lineBeforeMatch = line.substring(0, pos.character);
                const inlineCommentMatch = lineBeforeMatch.match(/(?<![:'"])\/\/|(?<=\s)#/);
                if (inlineCommentMatch) {
                    continue;
                }

                // Determine the text to test exclude against
                let excludeText = line;
                if (rule.multiLineExclude && rule.exclude) {
                    excludeText = this.extractBlock(text, matchIndex);
                }

                // Check exclusion pattern
                if (rule.exclude && rule.exclude.test(excludeText)) {
                    continue;
                }

                findings.push({
                    rule,
                    file: document.uri.fsPath,
                    line: pos.line,
                    column: pos.character,
                    matchedText: match[0],
                    message: `[${rule.id}] ${rule.title}: ${rule.description}`,
                });
            }
        }

        return findings;
    }

    /**
     * Extract a balanced parenthesized block starting from the opening paren
     * after the match position. Not string/quote-aware — parentheses inside
     * PHP strings could unbalance depth. Rare for register_rest_route args;
     * 500-char fallback mitigates truncation.
     */
    private extractBlock(text: string, startIndex: number): string {
        const parenStart = text.indexOf('(', startIndex);
        if (parenStart === -1) {
            return text.substring(startIndex, Math.min(startIndex + 200, text.length));
        }

        let depth = 0;
        for (let i = parenStart; i < text.length; i++) {
            if (text[i] === '(') { depth++; }
            if (text[i] === ')') { depth--; }
            if (depth === 0) {
                return text.substring(startIndex, i + 1);
            }
        }

        return text.substring(startIndex, Math.min(startIndex + 500, text.length));
    }

    async scanFile(filePath: string): Promise<AuditFinding[]> {
        const doc = await vscode.workspace.openTextDocument(filePath);
        return this.scanDocument(doc);
    }
}
