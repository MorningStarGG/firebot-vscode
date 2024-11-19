
# Firebot Integration Extension for VSCode

This Visual Studio Code extension enhances development workflows by providing comprehensive support for Firebot variables. It includes features like auto-completions, diagnostic validations, and code snippets for Firebot variable usage.

## Features

### 1. Auto-completions
- **Trigger characters:** `$`, `[`, `(`, `{`, `:`, `;`, and space.
- **Supported file types:** HTML, CSS, JavaScript, and custom `firebot-variables`.

### 2. Diagnostic Tools
- Real-time validation for Firebot variable usage.
- Identifies issues such as:
  - Invalid nested structures.
  - Missing or mismatched brackets.
  - Variables requiring default values.
  - Invalid regex patterns.
  - Invalid file paths or CSS context issues.

### 3. Quick Fixes and Commands
- **Validate File:** Run `firebot-helper.validateFile` to validate the current file.
- **Insert Variable:** Use `firebot-helper.insertVariable` to quickly insert a Firebot variable with a snippet.

### 4. Language Configuration
- Enhanced word pattern recognition for Firebot variables.
- Suppresses built-in CSS validation for better compatibility with Firebot-specific syntax.

### 5. Status Bar Integration
- Provides quick access to the extension's features via a dedicated status bar item.

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/your-repo/firebot-vscode-extension.git
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Compile the extension:
   ```
   npm run compile
   ```
4. Package into .vsix extension for VSCode:
   ```
   node --trace-warnings node_modules/@vscode/vsce/vsce package
   ```
5. From within VSCode go to the Extensions Panel (CTRL+SHIFT+X) click the three dots at the top and select "Install from VSIX...." and select it from where you compiled it 

## Usage

### Auto-completions
1. Start typing a Firebot variable using `$` to trigger suggestions.
2. Variables without Arguments (e.g., `$user`): type `$user` in the editor. Trigger IntelliSense and accept the completion.
3. Variables with Required Arguments (e.g., `$math`): type '$math' in the editor. Trigger IntelliSense and accept the completion fill out the Argument as needed.
4. Variables with Optional Arguments (e.g., '$unixTimestamp': type '$unixTimestamp' in the editor. Trigger IntelliSense with `TAB` accept the completion and the variable will be inserted with brackets, if you type or hit `BACKSPACE` the brackets are skipped. If you press `TAB` again, it will allow you to input arguments inside the brackets.

### Diagnostics
- Automatically detects and highlights issues in supported file types.
- Use the command `Firebot Helper: Validate File` to manually trigger validation.

### Inserting Variables
1. Run the `Firebot Helper: Insert Variable` command from the Command Palette.
2. Choose a variable from the quick pick menu.
3. Customize the snippet placeholders as needed.

### Supported File Types
- HTML
- CSS
- JavaScript

## Contributing
1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature-name
   ```
3. Make changes and commit:
   ```bash
   git commit -m "Add feature-name"
   ```
4. Push changes and create a pull request.

## Acknowledgments
Special thanks to the Firebot community for their support and contributions.

---

**Note:** This extension assumes familiarity with Firebot and its variable syntax. For more details, refer to the (outdated) [Firebot Variable Documentation](https://github.com/crowbartools/Firebot/wiki/Chat-Effect-Variables).
