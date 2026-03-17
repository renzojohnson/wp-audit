import * as vscode from 'vscode';
import { AuditFinding, AuditSummary, LiveAuditResult } from '../types';

export function showReport(
    _context: vscode.ExtensionContext,
    findings: AuditFinding[],
    liveResult: LiveAuditResult | null,
): void {
    const panel = vscode.window.createWebviewPanel(
        'wpAuditReport',
        'WP Audit Report',
        vscode.ViewColumn.Beside,
        { enableScripts: false },
    );

    const summary = buildSummary(findings, liveResult);
    panel.webview.html = generateHtml(summary, findings, liveResult);
}

function buildSummary(findings: AuditFinding[], liveResult: LiveAuditResult | null): AuditSummary {
    const findingsByRule = new Map<string, number>();
    let errors = 0, warnings = 0, info = 0;

    for (const f of findings) {
        findingsByRule.set(f.rule.id, (findingsByRule.get(f.rule.id) ?? 0) + 1);
        switch (f.rule.severity) {
            case 'error': errors++; break;
            case 'warning': warnings++; break;
            case 'info': info++; break;
        }
    }

    let liveErrors = 0, liveWarnings = 0;
    if (liveResult) {
        for (const f of liveResult.findings) {
            findingsByRule.set(f.ruleId, (findingsByRule.get(f.ruleId) ?? 0) + 1);
            switch (f.severity) {
                case 'error': liveErrors++; break;
                case 'warning': liveWarnings++; break;
            }
        }
    }

    const files = new Set(findings.map(f => f.file));
    return {
        totalFiles: files.size,
        totalFindings: findings.length + (liveResult?.findings.length ?? 0),
        errors,
        warnings,
        info,
        liveErrors,
        liveWarnings,
        findingsByRule,
    };
}

function generateHtml(
    summary: AuditSummary,
    findings: AuditFinding[],
    live: LiveAuditResult | null,
): string {
    const totalErrors = summary.errors + summary.liveErrors;
    const totalWarnings = summary.warnings + summary.liveWarnings;
    const score = Math.max(0, 100 - totalErrors * 10 - totalWarnings * 3);
    const scoreColor = score >= 80 ? '#27ae60' : score >= 50 ? '#f39c12' : '#e74c3c';

    let liveSection = '';
    if (live) {
        const liveRows = live.findings.map(f => `
            <tr>
                <td><span class="badge ${f.severity}">${f.severity}</span></td>
                <td>${f.ruleId}</td>
                <td>${escapeHtml(f.title)}</td>
                <td>${escapeHtml(f.detail)}</td>
            </tr>
        `).join('');

        liveSection = `
        <h2>Live URL Scan: ${escapeHtml(live.url)}</h2>
        <div class="stats">
            <div class="stat"><strong>${live.responseTime}ms</strong><br>Response Time</div>
            <div class="stat"><strong>${live.stats.domNodes}</strong><br>DOM Nodes</div>
            <div class="stat"><strong>${live.stats.scripts}</strong><br>Scripts</div>
            <div class="stat"><strong>${live.stats.styles}</strong><br>Stylesheets</div>
            <div class="stat"><strong>${live.stats.images}</strong><br>Images</div>
            <div class="stat"><strong>${live.stats.renderBlockingScripts}</strong><br>Render-Blocking</div>
            <div class="stat"><strong>${formatBytes(live.stats.totalSize)}</strong><br>HTML Size</div>
        </div>
        <table>
            <thead><tr><th>Severity</th><th>Rule</th><th>Issue</th><th>Detail</th></tr></thead>
            <tbody>${liveRows}</tbody>
        </table>`;
    }

    const staticRows = findings.map(f => `
        <tr>
            <td><span class="badge ${f.rule.severity}">${f.rule.severity}</span></td>
            <td>${f.rule.id}</td>
            <td>${escapeHtml(f.rule.title)}</td>
            <td>${escapeHtml(f.file.split('/').pop() ?? '')}:${f.line + 1}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    h1 { margin: 0 0 20px; }
    .score { display: inline-block; width: 80px; height: 80px; border-radius: 50%; border: 4px solid ${scoreColor}; text-align: center; line-height: 80px; font-size: 28px; font-weight: bold; color: ${scoreColor}; margin-right: 20px; }
    .summary { display: flex; align-items: center; margin-bottom: 30px; }
    .summary-text { font-size: 14px; }
    .stats { display: flex; gap: 15px; margin: 15px 0; flex-wrap: wrap; }
    .stat { background: var(--vscode-editor-inactiveSelectionBackground); padding: 10px 15px; border-radius: 6px; text-align: center; min-width: 80px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--vscode-panel-border); }
    th { font-weight: 600; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge.error { background: #e74c3c; color: white; }
    .badge.warning { background: #f39c12; color: white; }
    .badge.info { background: #3498db; color: white; }
    h2 { margin-top: 30px; }
</style>
</head>
<body>
    <h1>WP Audit Report</h1>
    <div class="summary">
        <div class="score">${score}</div>
        <div class="summary-text">
            <strong>${summary.totalFindings}</strong> issues found in <strong>${summary.totalFiles}</strong> file(s)<br>
            <span class="badge error">errors: ${totalErrors}</span>
            <span class="badge warning">warnings: ${totalWarnings}</span>
            <span class="badge info">info: ${summary.info}</span>
        </div>
    </div>

    ${liveSection}

    <h2>Static Analysis</h2>
    <table>
        <thead><tr><th>Severity</th><th>Rule</th><th>Issue</th><th>Location</th></tr></thead>
        <tbody>${staticRows || '<tr><td colspan="4">No issues found</td></tr>'}</tbody>
    </table>

    <p style="margin-top:30px;color:var(--vscode-descriptionForeground);font-size:12px;">
        Generated by <a href="https://marketplace.visualstudio.com/publishers/RenzoJohnson">WP Audit</a> by Renzo Johnson
    </p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) { return `${bytes} B`; }
    if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
