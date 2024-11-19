import { FIREBOT_VARIABLES } from '../variables';
interface ValidationResult {
    isValid: boolean;
    message?: string;
    severity: 'error' | 'warning' | 'info';
    offset?: number;
    length?: number;
}

interface ValidationContext {
    filePath?: boolean;
    regex?: boolean;
    html?: boolean;
    css?: boolean;
}

export class VariableValidator {
    private static readonly MATH_OPERATORS = /[+\-*/%]/;

    private static readonly FILE_PATH_VARIABLES = [
        '$readFile',
        '$fileExists',
        '$filesInDirectory'
    ];

    private static readonly REGEX_VARIABLES = [
        '$replace',
        '$regexTest',
        '$regexExec',
        '$regexMatches'
    ];

    private static readonly NESTED_MATH_OPS = ['+', '-', '*', '/', '%'];

    /**
     * Validates deeply nested variable structures
     */
    static validateNestedStructure(text: string, _context: ValidationContext = {}): ValidationResult[] {
        const results: ValidationResult[] = [];
        const stack: { variable: string, start: number, requiresDefault: boolean }[] = [];
        let currentVar = '';
        let inVariable = false;
        let bracketDepth = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (char === '$') {
                inVariable = true;
                currentVar = '$';
            } else if (inVariable) {
                if (char === '[') {
                    if (currentVar.length > 1) {
                        // Check if current variable exists
                        const varInfo = FIREBOT_VARIABLES[currentVar];
                        if (varInfo) {
                            stack.push({
                                variable: currentVar,
                                start: i,
                                requiresDefault: varInfo.requiresDefault || false
                            });
                        }

                        // Special validations based on variable type
                        if (this.FILE_PATH_VARIABLES.includes(currentVar)) {
                            const filePathResult = this.validateFilePath(text.substring(i + 1));
                            if (!filePathResult.isValid) {
                                results.push({
                                    ...filePathResult,
                                    offset: i + 1
                                });
                            }
                        }

                        if (this.REGEX_VARIABLES.includes(currentVar)) {
                            const regexResult = this.validateRegexPattern(text.substring(i + 1));
                            if (!regexResult.isValid) {
                                results.push({
                                    ...regexResult,
                                    offset: i + 1
                                });
                            }
                        }
                    }
                    bracketDepth++;
                } else if (char === ']') {
                    bracketDepth--;
                    if (bracketDepth < 0) {
                        results.push({
                            isValid: false,
                            message: 'Unmatched closing bracket',
                            severity: 'error',
                            offset: i,
                            length: 1
                        });
                    }
                    if (stack.length > 0) {
                        const lastVar = stack.pop();
                        if (lastVar?.requiresDefault) {
                            const content = text.substring(lastVar.start, i);
                            if (!content.includes(',')) {
                                results.push({
                                    isValid: false,
                                    message: `${lastVar.variable} requires a default value`,
                                    severity: 'warning',
                                    offset: lastVar.start,
                                    length: i - lastVar.start
                                });
                            }
                        }
                    }
                } else if (char === ',' || char === ' ') {
                    inVariable = false;
                    currentVar = '';
                } else {
                    currentVar += char;
                }
            }

            // Check for math operations in nesting
            if (inVariable && this.NESTED_MATH_OPS.includes(char)) {
                const mathResult = this.validateMathOperation(text.substring(i));
                if (!mathResult.isValid) {
                    results.push({
                        ...mathResult,
                        offset: i
                    });
                }
            }
        }

        return results;
    }



    /**
     * Validates file paths, including those with variables
     */
    private static validateFilePath(path: string): ValidationResult {
        // Allow variables in file paths
        const variablePattern = /\$[a-zA-Z]+\[[^\]]*\]/;
        const normalizedPath = path.replace(variablePattern, 'placeholder');

        // Basic path validation
        if (normalizedPath.includes('..')) {
            return {
                isValid: false,
                message: 'Path should not contain parent directory references',
                severity: 'warning'
            };
        }

        // Check for valid path characters
        const invalidChars = /[<>:"|?*]/g;
        if (invalidChars.test(normalizedPath)) {
            return {
                isValid: false,
                message: 'Path contains invalid characters',
                severity: 'error'
            };
        }

        return { isValid: true, severity: 'info' };
    }

    /**
     * Validates regex patterns in variables like $replace
     */
    private static validateRegexPattern(pattern: string): ValidationResult {
        try {
            // Test if it's a valid regex pattern
            // Handle special cases with look-aheads
            const cleanPattern = pattern.replace(/\\/g, '\\\\');
            new RegExp(cleanPattern);

            // Check for common regex issues
            if (pattern.includes('(?=') && !pattern.includes(')')) {
                return {
                    isValid: false,
                    message: 'Unclosed positive look-ahead',
                    severity: 'error'
                };
            }

            return { isValid: true, severity: 'info' };
        } catch (e) {
            return {
                isValid: false,
                message: `Invalid regex pattern: ${(e as Error).message}`,
                severity: 'error'
            };
        }
    }

    /**
     * Validates math operations in nested variables
     */
    private static validateMathOperation(text: string): ValidationResult {
        // Skip validation if this is a timestamp format
        if (text.includes('$discordTimestamp') || text.includes('$time')) {
            return { isValid: true, severity: 'info' };
        }

        // Only validate if we find math operators outside of $math
        if (this.MATH_OPERATORS.test(text) && !text.includes('$math[')) {
            const containingVariable = this.findContainingVariable(text);
            // Don't validate math operators inside certain variables that commonly use them
            if (containingVariable && ['$discordTimestamp', '$time', '$date'].includes(containingVariable)) {
                return { isValid: true, severity: 'info' };
            }

            return {
                isValid: false,
                message: 'Mathematical operations should be wrapped in $math[]',
                severity: 'warning'
            };
        }

        return { isValid: true, severity: 'info' };
    }

    private static findContainingVariable(text: string): string | null {
        const variableMatch = text.match(/\$[a-zA-Z]+/);
        return variableMatch ? variableMatch[0] : null;
    }

    /**
     * Validates HTML/CSS context
     */
    static validateInStyleContext(text: string): ValidationResult[] {
        const results: ValidationResult[] = [];

        // Check for variable usage in CSS properties
        const cssPropertyPattern = /[a-zA-Z-]+:\s*\$[^;]+;/g;
        let match;

        while ((match = cssPropertyPattern.exec(text)) !== null) {
            const propertyValue = match[0];

            // Validate CSS units when using variables
            if (propertyValue.includes('px') || propertyValue.includes('em') || propertyValue.includes('%')) {
                const numericPattern = /\$[a-zA-Z]+\[[^\]]+\](px|em|%)/;
                if (!numericPattern.test(propertyValue)) {
                    results.push({
                        isValid: false,
                        message: 'CSS numeric values should include units',
                        severity: 'warning',
                        offset: match.index,
                        length: match[0].length
                    });
                }
            }
        }

        return results;
    }
}