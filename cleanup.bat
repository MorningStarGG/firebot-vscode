@echo off
REM Delete firebot-vscode-variable-helper-1.0.0.vsix if it exists
if exist "firebot-vscode-variable-helper-1.0.0.vsix" del "firebot-vscode-variable-helper-1.0.0.vsix"

REM Delete package-lock.json if it exists
if exist "package-lock.json" del "package-lock.json"

REM Delete the "dist" folder and its contents if it exists
if exist "dist" rd /s /q "dist"