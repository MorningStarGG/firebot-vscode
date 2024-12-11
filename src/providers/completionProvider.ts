import * as vscode from 'vscode';
import { FIREBOT_VARIABLES, VariableCategory, VariableDefinition } from '../variables';

interface FirebotCompletionContext {
    isNested: boolean;
    inMath: boolean;
    inRegex: boolean;
    inStyle: boolean;
    parentVariable?: string;
    currentText: string;
}

export class FirebotCompletionProvider implements vscode.CompletionItemProvider {
    // public static FILE_PATH_VARIABLES = [
    //     '$readFile',
    //     '$fileExists',
    //     '$filesInDirectory',
    //     '$audioDuration',
    //     '$videoDuration'
    // ];

    // public static MATH_VARIABLES = [
    //     '$math',
    //     '$floor',
    //     '$ceil',
    //     '$round',
    //     '$ensureNumber',
    //     '$min',
    //     '$max',
    //     '$padNumber',
    //     '$randomNumber',
    //     '$bitsCheered',
    //     '$effectQueueLength'
    // ];
    // public static NON_BRACKET_VARS = [
    //     // Boolean States
    //     '$true', '$false', '$null', '$isWhisper', '$isAdBreakRunning',

    //     // Core User Variables
    //     '$user', '$username', '$target', '$bot', '$streamer', '$pronouns',

    //     // Command Related
    //     '$commandTrigger', '$count', '$argArray', '$argCount',

    //     // Chat Message Info
    //     '$chatMessage', '$chatMessageId', '$chatMessageTextOnly', '$chatUserColor', '$accountCreationDate', '$chatMessages', '$activeChatUserCount', '$userBadgeUrls',

    //     // Stream Info
    //     '$category', '$game', '$uptime', '$streamTitle', '$currentViewerCount', '$followCount', '$subCount', '$subPoints', '$viewTime',

    //     // User Info & Bio
    //     '$userAvatarUrl', '$userProfileImageUrl', '$userBio', '$followAge', '$categoryImageUrl',

    //     // Charity
    //     '$charityCampaignGoal', '$charityCampaignTotal',

    //     // Extra Life Info
    //     '$extraLifeInfo', '$extraLifeDonations', '$extraLifeIncentives', '$extraLifeMilestones',

    //     // OBS Status & Info
    //     '$obsIsConnected', '$obsInputActive', '$obsInputShowing', '$obsInputMuted', '$obsIsRecording', '$obsIsStreaming', '$obsSceneCollectionName', '$obsSceneName', '$obsInputName', '$obsInputKind', '$obsInputUuid', '$obsOldInputName', '$obsInputSettings', '$obsInputAudioTracks', '$obsInputVolumeDb', '$obsInputVolumeMultiplier', '$obsInputAudioBalance', '$obsInputAudioSyncOffset', '$obsInputMonitorType',

    //     // Timing Info
    //     '$secondsUntilNextAdBreak', 

    //     // Loop Info
    //     '$loopCount', '$loopItem',

    //     // Channel Goals
    //     '$channelGoalCurrentAmount', '$channelGoalDescription', '$channelGoalTargetAmount', '$rewardCost', '$rewardDescription', '$rewardImageUrl',

    //     // Cheermote/Emote Info
    //     '$cheermoteAmounts', '$cheermoteNames', '$cheermoteUrls', '$cheermoteColors', '$cheermoteAnimatedUrls', '$chatMessageAnimatedEmoteUrls', '$chatMessageEmoteNames', '$chatMessageEmoteUrls',

    //     // Profile/Account Info
    //     '$profilePageBytebinToken',

    //     // Others
    //     '$quote', '$quoteAsObject',

    //     // Random Values
    //     '$randomUUID', '$randomAdvice', '$randomDadJoke', '$randomViewer', '$randomActiveViewer',

    //     // Arrays
    //     '$subNames', '$usernameArray', '$topBitsCheerers'
    // ];

    // public static REQUIRES_BRACKETS = [
    //     // Array Operations
    //     '$rawTopCurrency', '$rawTopMetadata', '$rawTopViewTime', '$arrayAdd', '$arrayElement', '$arrayFilter', '$arrayFindIndex', '$arrayFindWithNull', '$arrayJoin', '$arrayLength', '$arrayRandomItem', '$arrayRemove', '$arrayReverse', '$arrayShuffle', '$arrayFrom',

    //     // User Data
    //     '$customRoleUsers', '$userIsTimedOut', '$userIsBanned', '$userId', '$userDisplayName', '$userExists', '$rawRandomCustomRoleUser', '$customRoleUserCount', '$isUserInChat', '$viewerNextRank', '$viewerRank', '$viewerNamesInRank', '$topMetadata', '$topMetadataUser', '$topViewTime', '$userRoles', '$rankLadderMode', '$rankValue', '$rankValueDescription', '$bitsLeaderboard', '$userMetadata', '$viewersInRankArray',

    //     // Math, Numbers & User Data
    //     '$ensureNumber', '$effectQueueLength', '$ceil', '$floor', '$round', '$math', '$commafy', '$max', '$min', '$padNumber', '$topCurrency', 'topCurrencyUser', '$currency', '$currencyRank',

    //     // Logic Operations
    //     '$if', '$ALL', '$AND', '$ANY', '$NOT', '$NALL', '$NAND', '$NANY', '$NOR', '$OR', '$hasRole', '$hasRoles', '$viewerHasRank',

    //     // Text Operations
    //     '$replace', '$textContains', '$textLength', '$textPadEnd', '$textPadStart', '$textSubstring', '$word', '$concat', '$capitalize', '$lowercase', '$uppercase', '$trim', '$trimStart', '$trimEnd', '$scrambleText', '$ordinalIndicator', '$encodeForHtml', '$decodeFromHtml', '$encodeForUrl', '$decodeFromUrl',

    //     // File Operations
    //     '$readFile', '$fileExists', '$filesInDirectory', '$audioDuration', '$videoDuration', '$fileLineCount',

    //     // Date & Time
    //     '$discordTimestamp', '$unixTimestamp', '$time', '$date',

    //     // OBS
    //     '$obsColorValue',

    //     // Custom Variables & Effects
    //     '$customVariable', '$customVariableKeys', '$effectOutput', '$evalJs', '$evalVars', '$runEffect', '$quickStore', '$counter',

    //     // Random Generation
    //     '$randomNumber', '$randomRedditImage', '$rollDice', '$randomCustomRoleUser',

    //     // API & JSON
    //     '$convertFromJSON', '$convertToJSON', '$twitchChannelUrl', '$readApi', '$objectWalkPath', '$setObjectProperty', '$splitText', '$regexExec', '$regexTest', '$regexMatches'
    // ];

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        _context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const completionContext = this.analyzeContext(document, position, linePrefix);

        const items: vscode.CompletionItem[] = [];

        if (completionContext.isNested) {
            items.push(...this.getNestedCompletions(completionContext));
        } else {
            // Show all variables as completions when typing after $
            Object.entries(FIREBOT_VARIABLES).forEach(([varName, varInfo]) => {
                const item = this.createCompletionItem(varName, varInfo, completionContext, position);
                items.push(item);
            });
        }

        items.push(...this.getContextSnippets(completionContext));
        //console.log(items)
        return items;
    }

    private shouldTriggerBracketCompletion(linePrefix: string): boolean {
        // Check if we just completed a variable name that should have brackets
        const match = linePrefix.match(/\$[a-zA-Z_$&]+$/);
        if (!match) return false;

        const varName = match[0];
        const varInfo = FIREBOT_VARIABLES[varName];
        let shouldHaveBrackets = varInfo.acceptsOptionalArguments ? varInfo.acceptsOptionalArguments : false;
        return varInfo && shouldHaveBrackets;
    }

    private analyzeContext(
        document: vscode.TextDocument,
        position: vscode.Position,
        linePrefix: string
    ): FirebotCompletionContext {
        const isNested = /\$[a-zA-Z_$&]+\[[^\]]*$/.test(linePrefix);
        const inMath = /\$math\[[^\]]*$/.test(linePrefix);
        const inRegex = linePrefix.includes('$replace') || linePrefix.includes('$regexTest');
        const inStyle = (document.languageId === 'css' ||
            (document.languageId === 'html') &&
            (this.isInStyleTag(document, position)) ||
            /style=["']|{|\$|:/.test(linePrefix));

        // Find parent variable if nested
        let parentVariable: string | undefined;
        if (isNested) {
            const parentMatch = linePrefix.match(/\$[a-zA-Z_$&]+(?=\[)/);
            if (parentMatch) {
                parentVariable = parentMatch[0];
            }
        }

        return {
            isNested,
            inMath,
            inRegex,
            inStyle,
            parentVariable,
            currentText: linePrefix
        };
    }

    private isInStyleTag(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const offset = document.offsetAt(position);
        const styleStart = text.lastIndexOf('<style', offset);
        const styleEnd = text.indexOf('</style>', offset);
        return styleStart !== -1 && (styleEnd === -1 || offset < styleEnd);
    }

    // private shouldIncludeVariable(varName: string, varInfo: VariableDefinition, context: FirebotCompletionContext): boolean {
    //     if (varInfo.category == VariableCategory.NUMBERS) {
    //         return FirebotCompletionProvider.MATH_VARIABLES.includes(varName);
    //     }
    //     // Show all variables by default
    //     if (!context.inMath && !context.inFilePath && !context.inStyle) {
    //         return true;
    //     }

    //     // Special context handling
    //     if (context.inMath) {
    //         return FirebotCompletionProvider.MATH_VARIABLES.includes(varName);
    //     }

    //     if (context.inFilePath) {
    //         return true; // Show all variables in file paths
    //     }

    //     if (context.inStyle) {
    //         return true; // Show all variables in CSS/style contexts
    //     }

    //     return true;
    // }

    // private shouldHaveBrackets(varName: string, varInfo: VariableDefinition): boolean {

    //     if (varInfo.acceptsOptionalArguments && !FirebotCompletionProvider.REQUIRES_BRACKETS.includes(varName)) {

    //         FirebotCompletionProvider.REQUIRES_BRACKETS.push(varName)
    //     }
    //     //console.log(varName)
    //     if (FirebotCompletionProvider.NON_BRACKET_VARS.includes(varName)) {
    //         return false;
    //     }

    //     if (FirebotCompletionProvider.REQUIRES_BRACKETS.includes(varName)) {
    //         return true;
    //     }

    //     // For any other variables, check their examples
    //     return varInfo.examples?.some(ex => ex.example.includes('[')) ?? false;
    // }
    private createCompletionItem(
        varName: string,
        varInfo: VariableDefinition,
        context: FirebotCompletionContext,
        position: vscode.Position
    ): vscode.CompletionItem {
        //console.log("we are in the create item function")
        const item = new vscode.CompletionItem(varName, vscode.CompletionItemKind.Variable);

        // Add documentation
        const docs = new vscode.MarkdownString();
        docs.appendMarkdown(`**${varName}**\n\n${varInfo.description}`);

        if (varInfo.examples && varInfo.examples.length > 0) {
            docs.appendMarkdown('\n\n**Examples:**\n');
            varInfo.examples.forEach(example => {
                docs.appendMarkdown(`\n- \`${example.example}\`: ${example.description}`);
            });
        }
        //console.log(docs)
        if (varInfo.deprecated) {
            docs.appendMarkdown(`\n\n⚠️ **Deprecated**: Use \`${varInfo.replacedBy}\` instead.`);
            item.tags = [vscode.CompletionItemTag.Deprecated];
        }

        item.documentation = docs;

        // Escape the dollar sign in the variable name for the snippet
        const escapedVarName = varName.replace(/\$/g, '\\$');

        // Check if this variable can have optional arguments
        if (varInfo.acceptsOptionalArguments) {
            // Insert the variable with optional brackets and placeholders
            // Insert the complete text with brackets as one snippet
            if (varInfo.requiresDefault) {
                item.insertText = new vscode.SnippetString(`${escapedVarName}[\${1:value}, \${2:default}]`);
            } else {
                item.insertText = new vscode.SnippetString(`${escapedVarName}\${1:[$2]}\$0`);
            }
        } else {
            item.insertText = varName;
        }

        return item;
    }

    private canHaveOptionalArguments(varName: string, varInfo: VariableDefinition): boolean {
        return varInfo.acceptsOptionalArguments === true;
    }

    private createBracketCompletion(
        varName: string,
        varInfo: VariableDefinition,
        context: FirebotCompletionContext
    ): vscode.CompletionItem {
        const item = new vscode.CompletionItem('[', vscode.CompletionItemKind.Operator);

        if (varInfo.requiresDefault) {
            item.insertText = new vscode.SnippetString(`[\${1:value}, \${2:default}]`);
        } else {
            item.insertText = new vscode.SnippetString(`[\${1:value}]`);
        }

        return item;
    }

    private getNestedCompletions(context: FirebotCompletionContext): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        if (context.parentVariable) {
            const parentInfo = FIREBOT_VARIABLES[context.parentVariable];
            if (parentInfo) {
                // Add appropriate nested completions based on parent variable
                switch (context.parentVariable) {
                    case '$math':
                        items.push(...this.getMathCompletions());
                        break;
                    case '$customVariable':
                        items.push(...this.getCustomVariableCompletions());
                        break;
                    case '$presetListArg':
                        items.push(...this.getPresetArgCompletions());
                        break;
                    // Add more cases as needed
                }
            }
        }

        return items;
    }

    private createSnippetCompletion(
        label: string,
        _kind: string,
        snippet: string,
        documentation: string
    ): vscode.CompletionItem {
        const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
        item.insertText = new vscode.SnippetString(snippet);
        item.documentation = new vscode.MarkdownString(documentation);
        return item;
    }

    private getContextSnippets(context: FirebotCompletionContext): vscode.CompletionItem[] {
        const snippets: vscode.CompletionItem[] = [];
        snippets.push(this.createSnippetCompletion(
            'Math Addition',
            'math-add',
            '\\$math[${1:value1} + ${2:value2}]',
            'Add two values'
        ));
        if (context.isNested) {
            snippets.push(this.createSnippetCompletion(
                'Date-based Filename',
                'date-filename',
                '\\$time[YYYY-MM-DD_hh-mm-ss].txt',
                'Create a filename with current date'
            ));
        }
        if (context.inStyle) {
            snippets.push(this.createSnippetCompletion(
                'Dynamic Width',
                'css-width',
                'width: \\$ensureNumber[${1:value}, ${2:default}]',
                'Set width with fallback value'
            ));
        }
        if (context.inStyle) {
            snippets.push(this.createSnippetCompletion(
                'Dynamic height',
                'css-height',
                'height: \\$ensureNumber[${1:value}, ${2:default}]',
                'Set height with fallback value'
            ));
        }

        return snippets;
    }

    private getCSSSnippet(varName: string, varInfo: VariableDefinition): string {
        return `${varName}[\${1:value}]`;
    }

    private getFilePathSnippet(varName: string, varInfo: VariableDefinition): string {
        return `${varName}[\${1:filename}]`;
    }

    private getDefaultSnippet(varName: string, varInfo: VariableDefinition): string {
        return `${varName}[\${1:value}]`;
    }
    private getMathCompletions(): vscode.CompletionItem[] {
        return [
            this.createSnippetCompletion(
                'Basic Math',
                'basic-math',
                '${1:value1} + ${2:value2}', // Prepend `$math` to the snippet
                'Basic addition'
            ),
            this.createSnippetCompletion(
                'Complex Math',
                'complex-math',
                '${1:value1} * ${2:value2} + ${3:value3}', // Prepend `$math`
                'Complex calculation'
            ),
            this.createSnippetCompletion(
                'Advanced Math',
                'Advanced-math',
                '``minval=${1:10}; maxval=${2:1000}; amount = ${3:value3}; offset = minval / 100; (min(amount,maxval) / maxval * (1 - offset) + offset) * 10``',
                'Advanced calculation'
            )
        ];
    }

    private getCustomVariableCompletions(): vscode.CompletionItem[] {
        return [
            this.createSnippetCompletion(
                'Array Index',
                'array-index',
                '${1:variableName}, ${2:index}', // Prepend `$customVariable`
                'Access array element'
            ),
            this.createSnippetCompletion(
                'Object Path',
                'object-path',
                '${1:variableName}, ${2:path.to.property}', // Prepend `$customVariable`
                'Access nested property'
            )
        ];
    }

    private getPresetArgCompletions(): vscode.CompletionItem[] {
        return [
            this.createSnippetCompletion(
                'Preset Value',
                'preset-value',
                '${1:presetName}', // Prepend `$presetListArg`
                'Get preset argument value'
            )
        ];
    }

}