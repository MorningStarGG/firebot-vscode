import * as vscode from 'vscode';
import { VariableValidator } from '../validation/variableValidator';

export class FirebotDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private cssValidationDisposable?: vscode.Disposable;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('firebot');
        this.suppressCssValidation();
    }

    private suppressCssValidation() {
        // Suppress CSS validation in HTML files
        this.cssValidationDisposable = vscode.languages.setLanguageConfiguration('html', {
            wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
            onEnterRules: []
        });

        // Create custom CSS validation settings
        const config = vscode.workspace.getConfiguration('css');
        config.update('validate', false, vscode.ConfigurationTarget.Global); // Disable CSS validation globally

        // Specifically for style tags in HTML
        const htmlConfig = vscode.workspace.getConfiguration('html');
        htmlConfig.update('validate.styles', false, vscode.ConfigurationTarget.Global);
    }

    public updateDiagnostics(document: vscode.TextDocument): void {
        // Skip if document is closing or disposed
        if (document.isClosed || !document.uri) {
            return;
        }

        const text = document.getText();
        const diagnostics: vscode.Diagnostic[] = [];

        // Only process our custom diagnostics
        if (this.shouldProcessFile(document)) {
            // Get all variable usages
            const variablePattern = /\$[a-zA-Z_$&]+(\[[^\]]*\])+/g;
            let match: RegExpExecArray | null;

            while ((match = variablePattern.exec(text)) !== null) {
                const validationResults = VariableValidator.validateNestedStructure(match[0], {
                    filePath: match[0].includes('$readFile') || match[0].includes('$fileExists'),
                    regex: match[0].includes('$replace') || match[0].includes('$regexTest'),
                    html: document.languageId === 'html',
                    css: document.languageId === 'css' || this.isInStyleTag(text, match.index)
                });

                validationResults.forEach(result => {
                    if (match !== null) {
                        const startPos = document.positionAt(match.index + (result.offset || 0));
                        const endPos = document.positionAt(match.index + (result.offset || 0) + (result.length || match[0].length));

                        const diagnostic = new vscode.Diagnostic(
                            new vscode.Range(startPos, endPos),
                            result.message || 'Invalid variable usage',
                            this.getSeverity(result.severity)
                        );
                        diagnostic.source = 'Firebot';
                        diagnostics.push(diagnostic);
                    }
                });
            }
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private shouldProcessFile(document: vscode.TextDocument): boolean {
        return ['html', 'css', 'javascript'].includes(document.languageId);
    }

    private isInStyleTag(text: string, offset: number): boolean {
        const beforeOffset = text.substring(0, offset);
        const lastStyleOpen = beforeOffset.lastIndexOf('<style');
        const lastStyleClose = beforeOffset.lastIndexOf('</style>');
        return lastStyleOpen > lastStyleClose;
    }

    private getSeverity(severity: string): vscode.DiagnosticSeverity {
        switch (severity) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'info':
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Hint;
        }
    }

    public dispose() {
        this.diagnosticCollection.dispose();
        if (this.cssValidationDisposable) {
            this.cssValidationDisposable.dispose();
        }
    }
}