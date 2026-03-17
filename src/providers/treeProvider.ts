import * as vscode from 'vscode';
import { AuditFinding, LiveFinding } from '../types';

type TreeItem = CategoryNode | FindingNode;

class CategoryNode extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly count: number,
        public readonly items: FindingNode[],
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.description = `${count} issue${count !== 1 ? 's' : ''}`;
    }
}

class FindingNode extends vscode.TreeItem {
    constructor(
        public readonly finding: AuditFinding | LiveFinding,
        public readonly fileUri?: vscode.Uri,
        public readonly line?: number,
    ) {
        const label = 'rule' in finding ? finding.rule.id : finding.ruleId;
        const desc = 'rule' in finding ? finding.rule.title : finding.title;
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = desc;
        this.tooltip = 'message' in finding ? finding.message : finding.detail;

        const severity = 'rule' in finding ? finding.rule.severity : finding.severity;
        this.iconPath = new vscode.ThemeIcon(
            severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info',
        );

        if (fileUri && line !== undefined) {
            this.command = {
                command: 'vscode.open',
                title: 'Go to line',
                arguments: [fileUri, { selection: new vscode.Range(line, 0, line, 0) }],
            };
        }
    }
}

export class AuditTreeProvider implements vscode.TreeDataProvider<TreeItem> {

    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private staticFindings: AuditFinding[] = [];
    private liveFindings: LiveFinding[] = [];

    updateStatic(findings: AuditFinding[]): void {
        this.staticFindings = findings;
        this._onDidChangeTreeData.fire(undefined);
    }

    updateLive(findings: LiveFinding[]): void {
        this.liveFindings = findings;
        this._onDidChangeTreeData.fire(undefined);
    }

    clear(): void {
        this.staticFindings = [];
        this.liveFindings = [];
        this._onDidChangeTreeData.fire(undefined);
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): TreeItem[] {
        if (!element) {
            const categories: CategoryNode[] = [];

            const errors = this.staticFindings.filter(f => f.rule.severity === 'error');
            const warnings = this.staticFindings.filter(f => f.rule.severity === 'warning');
            const info = this.staticFindings.filter(f => f.rule.severity === 'info');

            if (errors.length > 0) {
                categories.push(new CategoryNode('Errors', errors.length,
                    errors.map(f => new FindingNode(f, vscode.Uri.file(f.file), f.line))));
            }
            if (warnings.length > 0) {
                categories.push(new CategoryNode('Warnings', warnings.length,
                    warnings.map(f => new FindingNode(f, vscode.Uri.file(f.file), f.line))));
            }
            if (info.length > 0) {
                categories.push(new CategoryNode('Info', info.length,
                    info.map(f => new FindingNode(f, vscode.Uri.file(f.file), f.line))));
            }

            if (this.liveFindings.length > 0) {
                categories.push(new CategoryNode('Live URL', this.liveFindings.length,
                    this.liveFindings.map(f => new FindingNode(f))));
            }

            return categories;
        }

        if (element instanceof CategoryNode) {
            return element.items;
        }

        return [];
    }
}
