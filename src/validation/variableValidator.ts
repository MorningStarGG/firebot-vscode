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

    // Variables that commonly use math operators without needing $math[]
    private static readonly MATH_EXEMPT_VARIABLES = [
        '$discordTimestamp',
        '$time',
        '$date',
        '$arrayLength',
        '$textLength',
        '$randomNumber',
        '$ensureNumber'
    ];

    static validateNestedStructure(text: string, _context: ValidationContext = {}): ValidationResult[] {
        const results: ValidationResult[] = [];
        let bracketDepth = 0;
        let currentNestLevel: { content: string, start: number, variable: string | null }[] = [{
            content: '',
            start: 0,
            variable: null
        }];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // Check for variable start
            if (char === '$') {
                let varName = '$';
                let j = i + 1;
                // Get the full variable name
                while (j < text.length && /[a-zA-Z]/.test(text[j])) {
                    varName += text[j];
                    j++;
                }
                // Store the variable name at current nesting level
                if (j < text.length && text[j] === '[') {
                    currentNestLevel[currentNestLevel.length - 1].variable = varName;
                    // Check entire content for $math specifically
                    if (varName === '$math') {
                        // Look ahead to find the content
                        let mathContent = '';
                        let k = j + 1;
                        let mathBracketDepth = 1;
                        while (k < text.length && mathBracketDepth > 0) {
                            if (text[k] === '[') mathBracketDepth++;
                            if (text[k] === ']') mathBracketDepth--;
                            if (mathBracketDepth > 0) mathContent += text[k];
                            k++;
                        }
                        console.log('Found math content:', mathContent); // Debug log

                        // Check if it's a time format
                        const unquotedContent = mathContent.replace(/["']/g, '').trim();
                        console.log('Unquoted:', unquotedContent); // Debug log

                        if (unquotedContent === 'HH:mm:ss' || /^[Hhms:\s]+$/.test(unquotedContent)) {
                            results.push({
                                isValid: false,
                                message: 'Time format string should not be wrapped in $math[]',
                                severity: 'error',
                                offset: j + 1,
                                length: mathContent.length
                            });
                        } else if (/^[a-zA-Z]+$/.test(unquotedContent)) {
                            // Add check for pure text content
                            results.push({
                                isValid: false,
                                message: 'Content in $math[] must be a mathematical expression, not text',
                                severity: 'error',
                                offset: j + 1,
                                length: mathContent.length
                            });
                        }
                    }
                }
            }

            if (char === '[') {
                bracketDepth++;
                currentNestLevel.push({
                    content: '',
                    start: i + 1,
                    variable: null
                });
            } else if (char === ']') {
                bracketDepth--;
                const currentLevel = currentNestLevel.pop();

                if (!currentLevel) continue;

                // Check if this was a $math content
                if (currentLevel.variable === '$math') {
                    // Remove quotes and trim
                    const unquotedContent = currentLevel.content.replace(/["']/g, '').trim();

                    // Check if it's a time format
                    if (unquotedContent === 'HH:mm:ss' || /^[Hhms:\s]+$/.test(unquotedContent)) {
                        results.push({
                            isValid: false,
                            message: 'Time format string should not be wrapped in $math[]',
                            severity: 'error',
                            offset: currentLevel.start,
                            length: currentLevel.content.length
                        });
                        continue;
                    }

                    // Check for actual math operations
                    try {
                        // Remove variables for validation
                        const sanitizedContent = unquotedContent.replace(/\$[a-zA-Z]+\[[^\]]*\]/g, '0');

                        // Check if there are any actual math operators
                        if (!/[+\-*/%]/.test(sanitizedContent)) {
                            // Check if it contains any letters after sanitization
                            if (/[a-zA-Z]/.test(sanitizedContent.trim())) {
                                results.push({
                                    isValid: false,
                                    message: 'Invalid content in $math[], contains non-mathematical characters',
                                    severity: 'error',
                                    offset: currentLevel.start,
                                    length: String(currentLevel.content).length
                                });
                                continue;
                            }

                            // Check if it's just a number
                            if (!isNaN(Number(sanitizedContent.trim()))) {
                                results.push({
                                    isValid: false,
                                    message: 'No mathematical operations found in $math[]',
                                    severity: 'warning',
                                    offset: currentLevel.start,
                                    length: String(currentLevel.content).length
                                });
                                continue;
                            }

                            // If we get here, it's neither a number nor contains letters, but also has no operators
                            results.push({
                                isValid: false,
                                message: 'Invalid mathematical expression',
                                severity: 'error',
                                offset: currentLevel.start,
                                length: String(currentLevel.content).length
                            });
                            continue;
                        }

                        // If we found math operators, validate the expression
                        const mathExp = sanitizedContent.replace(/[^0-9+\-*/%\s.()]/g, '');
                        if (mathExp.trim()) {
                            Function(`"use strict";return (${mathExp})`)();
                        }
                    } catch (e) {
                        results.push({
                            isValid: false,
                            message: 'Invalid mathematical expression',
                            severity: 'error',
                            offset: currentLevel.start,
                            length: String(currentLevel.content).length
                        });
                    }
                }

                if (bracketDepth < 0) {
                    results.push({
                        isValid: false,
                        message: 'Unmatched closing bracket',
                        severity: 'error',
                        offset: i,
                        length: 1
                    });
                }
            } else {
                if (currentNestLevel.length > 0) {
                    currentNestLevel[currentNestLevel.length - 1].content += char;
                }
            }
        }

        return results;
    }

    private static findOutermostVariable(nestLevels: string[]): string | null {
        for (let i = nestLevels.length - 1; i >= 0; i--) {
            const varMatch = nestLevels[i].match(/\$[a-zA-Z]+/);
            if (varMatch) {
                return varMatch[0];
            }
        }
        return null;
    }

    static validate(text: string, context: ValidationContext = {}): ValidationResult[] {
        return this.validateNestedStructure(text, context);
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
            // Handle special cases like your examples with look-aheads
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