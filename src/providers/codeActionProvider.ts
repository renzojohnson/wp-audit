import * as vscode from 'vscode';
import { PERFORMANCE_RULES } from '../rules/performanceRules';
import { SECURITY_RULES } from '../rules/securityRules';
import { Rule } from '../types';

export class WpAuditCodeActionProvider implements vscode.CodeActionProvider {

    private rulesById: Map<string, Rule>;

    constructor() {
        this.rulesById = new Map();
        for (const rule of [...PERFORMANCE_RULES, ...SECURITY_RULES]) {
            this.rulesById.set(rule.id, rule);
        }
    }

    provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range,
        context: vscode.CodeActionContext,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== 'WP Audit' || !diagnostic.code) {
                continue;
            }

            const rule = this.rulesById.get(diagnostic.code as string);
            if (!rule?.fix) {
                continue;
            }

            const line = document.lineAt(diagnostic.range.start.line);
            const lineText = line.text;

            let newText: string;
            if (typeof rule.fix.replacement === 'string') {
                newText = lineText.replace(rule.pattern, rule.fix.replacement);
            } else {
                const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
                const match = regex.exec(lineText);
                if (!match) { continue; }
                newText = rule.fix.replacement(match, lineText);
            }

            if (newText === lineText) { continue; }

            const action = new vscode.CodeAction(
                `WP Audit: ${rule.fix.label}`,
                vscode.CodeActionKind.QuickFix,
            );
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(document.uri, line.range, newText);
            action.diagnostics = [diagnostic];
            action.isPreferred = true;
            actions.push(action);
        }

        return actions;
    }
}
