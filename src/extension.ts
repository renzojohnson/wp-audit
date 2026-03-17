import * as vscode from 'vscode';
import type * as http from 'http';
import { PhpScanner } from './scanner/phpScanner';
import { DiagnosticProvider } from './providers/diagnosticProvider';
import { WpAuditCodeActionProvider } from './providers/codeActionProvider';
import { AuditTreeProvider } from './providers/treeProvider';
import { fetchUrl } from './live/urlFetcher';
import { analyzeHtml } from './live/htmlAnalyzer';
import { showReport } from './report/webviewReport';
import { AuditFinding, LiveAuditResult } from './types';

let diagnosticProvider: DiagnosticProvider;
let treeProvider: AuditTreeProvider;
let allFindings: AuditFinding[] = [];
let lastLiveResult: LiveAuditResult | null = null;

export function activate(context: vscode.ExtensionContext): void {
    diagnosticProvider = new DiagnosticProvider();
    treeProvider = new AuditTreeProvider();

    context.subscriptions.push(diagnosticProvider);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('wpAudit.results', treeProvider),
    );
    context.subscriptions.push(treeProvider);

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: 'php', scheme: 'file' },
            new WpAuditCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
        ),
    );

    // Command: Scan current file
    context.subscriptions.push(
        vscode.commands.registerCommand('wpAudit.scanFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'php') {
                vscode.window.showWarningMessage('WP Audit: Open a PHP file to scan.');
                return;
            }

            const config = vscode.workspace.getConfiguration('wpAudit');
            const scanner = new PhpScanner(
                config.get('enablePerformanceRules', true),
                config.get('enableSecurityRules', true),
            );

            const findings = scanner.scanDocument(editor.document);
            diagnosticProvider.update(editor.document.uri, findings);
            allFindings = findings;
            treeProvider.updateStatic(findings);

            vscode.window.showInformationMessage(
                `WP Audit: ${findings.length} issue(s) found.`,
            );
        }),
    );

    // Command: Scan workspace
    context.subscriptions.push(
        vscode.commands.registerCommand('wpAudit.scanWorkspace', async () => {
            const config = vscode.workspace.getConfiguration('wpAudit');
            const ignorePaths = config.get<string[]>('ignorePaths', ['vendor/**', 'node_modules/**', 'wp-admin/**', 'wp-includes/**']);
            const scanner = new PhpScanner(
                config.get('enablePerformanceRules', true),
                config.get('enableSecurityRules', true),
            );

            const files = await vscode.workspace.findFiles('**/*.php', `{${ignorePaths.join(',')}}`);
            if (files.length === 0) {
                vscode.window.showWarningMessage('WP Audit: No PHP files found in workspace.');
                return;
            }

            diagnosticProvider.clear();
            allFindings = [];

            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'WP Audit: Scanning workspace...', cancellable: true },
                async (progress, token) => {
                    for (let i = 0; i < files.length; i++) {
                        if (token.isCancellationRequested) { break; }
                        progress.report({ increment: (100 / files.length), message: `${i + 1}/${files.length}` });

                        const findings = await scanner.scanFile(files[i].fsPath);
                        diagnosticProvider.update(files[i], findings);
                        allFindings.push(...findings);
                    }
                },
            );

            treeProvider.updateStatic(allFindings);
            vscode.window.showInformationMessage(
                `WP Audit: ${allFindings.length} issue(s) in ${files.length} file(s).`,
            );
        }),
    );

    // Command: Scan live URL
    context.subscriptions.push(
        vscode.commands.registerCommand('wpAudit.scanUrl', async () => {
            const url = await vscode.window.showInputBox({
                prompt: 'Enter WordPress site URL to audit',
                placeHolder: 'https://example.com',
                validateInput: (value) => {
                    if (!value.startsWith('http://') && !value.startsWith('https://')) {
                        return 'URL must start with http:// or https://';
                    }
                    return null;
                },
            });

            if (!url) { return; }

            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: `WP Audit: Scanning ${url}...`, cancellable: true },
                async (_progress, token) => {
                    let activeRequest: http.ClientRequest | undefined;

                    const onCancel = token.onCancellationRequested(() => {
                        if (activeRequest) {
                            activeRequest.destroy();
                        }
                    });

                    try {
                        const result = await fetchUrl(url, (req) => {
                            activeRequest = req;
                        });

                        if (token.isCancellationRequested) { return; }

                        lastLiveResult = analyzeHtml(url, result);
                        treeProvider.updateLive(lastLiveResult.findings);

                        vscode.window.showInformationMessage(
                            `WP Audit: ${lastLiveResult.findings.length} issue(s) found on ${url} (${lastLiveResult.responseTime}ms).`,
                        );

                        showReport(context, allFindings, lastLiveResult);
                    } catch (err) {
                        // On cancellation, req.destroy() causes ECONNRESET which
                        // rejects the promise — silently return instead of showing error
                        if (token.isCancellationRequested) { return; }
                        const message = err instanceof Error ? err.message : String(err);
                        vscode.window.showErrorMessage(`WP Audit: Failed to fetch ${url} — ${message}`);
                    } finally {
                        onCancel.dispose();
                    }
                },
            );
        }),
    );

    // Command: Show report
    context.subscriptions.push(
        vscode.commands.registerCommand('wpAudit.showReport', () => {
            showReport(context, allFindings, lastLiveResult);
        }),
    );

    // Command: Clear diagnostics
    context.subscriptions.push(
        vscode.commands.registerCommand('wpAudit.clearDiagnostics', () => {
            diagnosticProvider.clear();
            treeProvider.clear();
            allFindings = [];
            lastLiveResult = null;
            vscode.window.showInformationMessage('WP Audit: Diagnostics cleared.');
        }),
    );

    // Optional: Scan on save
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            const config = vscode.workspace.getConfiguration('wpAudit');
            if (!config.get('scanOnSave', false)) { return; }
            if (document.languageId !== 'php') { return; }

            const scanner = new PhpScanner(
                config.get('enablePerformanceRules', true),
                config.get('enableSecurityRules', true),
            );
            const findings = scanner.scanDocument(document);
            diagnosticProvider.update(document.uri, findings);
        }),
    );
}

export function deactivate(): void {}
