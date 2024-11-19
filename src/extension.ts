import * as vscode from 'vscode';
import { FirebotCompletionProvider } from './providers/completionProvider';
import { FirebotDiagnosticProvider } from './providers/diagnosticProvider';
import { VariableValidator } from './validation/variableValidator';
import { FIREBOT_VARIABLES } from './variables';

export function activate(context: vscode.ExtensionContext) {
    console.log('Firebot Variable Helper is now active');

    // Create instances of our providers
    const completionProvider = new FirebotCompletionProvider();
    const diagnosticProvider = new FirebotDiagnosticProvider();

    // Register the completion provider for all supported file types
    const supportedLanguages = ['html', 'css', 'javascript', 'firebot-variables'];

    const completionDisposable = vscode.languages.registerCompletionItemProvider(
        supportedLanguages.map(language => ({ scheme: 'file', language })),
        completionProvider,
        '$', // Trigger on $ character
        '[', // Trigger on [ for nested completions
        '(', // Trigger on ( for CSS var() functions
        '{', // Trigger after {
        ':', // Trigger after :
        ';', // Trigger after ;
        ' '  // Trigger after space
    );

    // Set up language configuration for better variable recognition
    const languageConfigDisposable = vscode.languages.setLanguageConfiguration('html', {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)|\$[a-zA-Z0-9_$&]+(?:\[[^\]]*\])*/g,
    });

    // Watch for active editor changes
    const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            diagnosticProvider.updateDiagnostics(editor.document);
        }
    });

    // Watch for document changes
    const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
        diagnosticProvider.updateDiagnostics(event.document);
    });

    // Register commands for quick fixes and actions
    const commandDisposables = [
        vscode.commands.registerCommand('firebot-vscode-variable-helper.validateFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                diagnosticProvider.updateDiagnostics(editor.document);
            }
        }),

        vscode.commands.registerCommand('firebot-vscode-variable-helper.insertVariable', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const variableList = Object.entries(FIREBOT_VARIABLES).map(([key, info]) => ({
                label: key,
                description: info.description,
                detail: info.category
            }));

            const selected = await vscode.window.showQuickPick(variableList, {
                placeHolder: 'Select a Firebot variable',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                const varName = selected.label;
                const varInfo = FIREBOT_VARIABLES[varName];
                let snippetString: vscode.SnippetString;

                // Escape the dollar sign in the variable name
                const escapedVarName = varName.replace(/\$/g, '\\$');

                // Check if variable accepts optional arguments
                if (varInfo.acceptsOptionalArguments) {
                    snippetString = new vscode.SnippetString(`${escapedVarName}\${1:[$2]}\$0`);
                }
                // Check if it's a non-bracket variable
                else if (FirebotCompletionProvider.NON_BRACKET_VARS.includes(varName)) {
                    snippetString = new vscode.SnippetString(escapedVarName);
                }
                // Check if it requires default value
                else if (varInfo.requiresDefault) {
                    snippetString = new vscode.SnippetString(`${escapedVarName}[\${1:value}, \${2:default}]`);
                }
                // Standard bracket variable
                else if (FirebotCompletionProvider.REQUIRES_BRACKETS.includes(varName) ||
                    varInfo.examples?.some(ex => ex.example.includes('['))) {
                    snippetString = new vscode.SnippetString(`${escapedVarName}[\${1:value}]`);
                }
                // Fallback case - no brackets
                else {
                    snippetString = new vscode.SnippetString(escapedVarName);
                }

                editor.insertSnippet(snippetString);
            }
        })
    ];

    // Add status bar item for quick access
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = "$(symbol-variable) Firebot";
    statusBarItem.tooltip = "Firebot Variable Helper";
    statusBarItem.command = 'firebot-vscode-variable-helper.insertVariable';
    statusBarItem.show();

    // Suppress built-in CSS validation in HTML files
    const cssValidationDisposable = vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'html') {
            const config = vscode.workspace.getConfiguration('', document.uri);
            config.update('css.validate', false, vscode.ConfigurationTarget.Global);
            config.update('html.validate.styles', false, vscode.ConfigurationTarget.Global);
        }
    });

    // Add our custom CSS validation when needed
    const customCssValidationDisposable = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'html' || event.document.languageId === 'css') {
            diagnosticProvider.updateDiagnostics(event.document);
        }
    });

    // Register all our disposables
    context.subscriptions.push(
        completionDisposable,
        languageConfigDisposable,
        activeEditorDisposable,
        documentChangeDisposable,
        cssValidationDisposable,
        customCssValidationDisposable,
        statusBarItem,
        ...commandDisposables
    );

    // Initialize diagnostics for the current editor
    if (vscode.window.activeTextEditor) {
        const document = vscode.window.activeTextEditor.document;
        if (supportedLanguages.includes(document.languageId)) {
            diagnosticProvider.updateDiagnostics(document);
        }
    }
}

export function deactivate() {
    // Clean up any resources if needed
}