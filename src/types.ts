import * as vscode from 'vscode';

export type RuleSeverity = 'error' | 'warning' | 'info';
export type RuleCategory = 'performance' | 'security';
export type RuleScope = 'static' | 'live';

export interface Rule {
    id: string;
    severity: RuleSeverity;
    category: RuleCategory;
    scope: RuleScope;
    title: string;
    description: string;
    pattern: RegExp;
    exclude?: RegExp;
    multiLineExclude?: boolean;
    fix?: {
        label: string;
        replacement: string | ((match: RegExpExecArray, line: string) => string);
    };
}

export interface AuditFinding {
    rule: Rule;
    file: string;
    line: number;
    column: number;
    matchedText: string;
    message: string;
}

export interface LiveAuditResult {
    url: string;
    statusCode: number;
    responseTime: number;
    headers: Record<string, string>;
    findings: LiveFinding[];
    stats: {
        domNodes: number;
        scripts: number;
        styles: number;
        images: number;
        fonts: number;
        renderBlockingScripts: number;
        totalSize: number;
    };
}

export interface LiveFinding {
    ruleId: string;
    severity: RuleSeverity;
    title: string;
    detail: string;
}

export interface AuditSummary {
    totalFiles: number;
    totalFindings: number;
    errors: number;
    warnings: number;
    info: number;
    liveErrors: number;
    liveWarnings: number;
    findingsByRule: Map<string, number>;
}

export function severityToDiagnostic(severity: RuleSeverity): vscode.DiagnosticSeverity {
    switch (severity) {
        case 'error': return vscode.DiagnosticSeverity.Error;
        case 'warning': return vscode.DiagnosticSeverity.Warning;
        case 'info': return vscode.DiagnosticSeverity.Information;
    }
}
