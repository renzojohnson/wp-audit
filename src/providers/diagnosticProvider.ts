import * as vscode from 'vscode';
import { AuditFinding, severityToDiagnostic } from '../types';

const DIAGNOSTIC_SOURCE = 'WP Audit';

export class DiagnosticProvider {

    private collection: vscode.DiagnosticCollection;

    constructor() {
        this.collection = vscode.languages.createDiagnosticCollection('wpAudit');
    }

    update(uri: vscode.Uri, findings: AuditFinding[]): void {
        const diagnostics = findings.map(f => {
            const range = new vscode.Range(f.line, f.column, f.line, f.column + f.matchedText.length);
            const diag = new vscode.Diagnostic(range, f.message, severityToDiagnostic(f.rule.severity));
            diag.source = DIAGNOSTIC_SOURCE;
            diag.code = f.rule.id;
            return diag;
        });
        this.collection.set(uri, diagnostics);
    }

    clear(): void {
        this.collection.clear();
    }

    delete(uri: vscode.Uri): void {
        this.collection.delete(uri);
    }

    dispose(): void {
        this.collection.dispose();
    }
}
