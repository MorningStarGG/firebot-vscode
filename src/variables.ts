import * as vscode from 'vscode';
import { writeFile } from 'fs';
import { Buffer } from 'buffer';
import { ConfigurationTarget, workspace } from 'vscode';
export interface VariableExample {
    example: string;
    description: string;
}

export interface VariableDefinition {
    name: string;
    description: string;
    deprecated?: boolean;
    deprecatedMessage?: string;
    replacedBy?: string;
    examples?: VariableExample[];
    acceptsNesting?: boolean;
    requiresDefault?: boolean;
    category: VariableCategory;
    aliases?: string[];
    acceptsOptionalArguments?: boolean;
}

export enum VariableCategory {
    CustomVariable = 'Custom Variable',
    EffectOutput = 'Effect Output',
    User = 'User Based',
    Channel = 'Channel',
    Chat = 'Chat',
    Command = 'Command',
    Array = 'Array',
    Logic = 'Logic',
    Math = 'Math',
    Text = 'Text',
    Time = 'Time',
    File = 'File',
    OBS = 'OBS',
    ExtraLife = 'Extra Life',
    Bits = 'Bits',
    Rank = 'Rank',
    COMMON = "Common",
    TRIGGER = "Trigger Based",
    NUMBERS = "Numbers",
    ADVANCED = "Advanced"
}

export let FIREBOT_VARIABLES: { [key: string]: VariableDefinition } = {};

let variableData: { [key: string]: VariableDefinition } = {};
async function getVariableData() {
    const url = "http://localhost:7472/api/v1/variables";
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const data = await response.json(); // Parse response as JSON
        return data;
    } catch (error: any) {
        console.error(error.message);
        return null;
    }
}

function toTitleCase(str: string) {
    return str.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}

function arrayToObject(array: any[]) {
    return array.reduce((acc, item) => {
        if (item.definition && item.definition.handle) {
            if (item.definition.description.toLowerCase().includes("deprecated")) {
                item.definition.deprecatedMessage = item.definition.description.match(/(?<value>(?<=\().*?(?=\)))/g)[0];
                item.definition.deprecated = item.definition.hidden
                item.definition.replacedBy = item.definition.deprecatedMessage.replace("Deprecated: use ", "");
            }
            if (item.definition.categories != null) {
                item.definition.category = toTitleCase(item.definition.categories.join(', ').toUpperCase());
            }
            if (item.definition.usage != null || item.definition.examples != null) {
                item.definition.acceptsOptionalArguments = true;
            }
            if (String(item.definition.usage).includes("default")){
                item.definition.requiresDefault = true;
            }
            if (item.definition.examples != null) {
                for (let index = 0; index < item.definition.examples.length; index++) {
                    const element = item.definition.examples[index];
                    element.example = `$${element.usage}`
                    const description = element.description
                    delete element.description
                    delete element.usage
                    element.description = description
                    item.definition.examples[index] = element
                }
            }

            item.acceptsNesting = true;
            if (item.definition.handle === "$name") {
                item.definition.handle = "$"
            }
            if (item.definition.handle === "&name") {
                item.definition.handle = "&"
            }
            item.definition.name = `$${item.definition.handle}`;
            item.name = item.handle;
            acc[`$${item.definition.handle}`] = item.definition;
        }
        return acc;
    }, {});
}

async function assignToGlobal() {
    const data: any = await getVariableData();
    if (data) {
        variableData = arrayToObject(data);
        const configuration = workspace.getConfiguration("firebotHelper");
        configuration.update("variableData", variableData, ConfigurationTarget.Global).then(() => {
            // take action here
            console.log("set config")
        });
        //vscode.ConfigurationTarget.Global("variableData",true) = variableData;
    }
}

const internalVariables: { [key: string]: VariableDefinition } = vscode.workspace.getConfiguration('variableData')
const IV: { [key: string]: VariableDefinition } =
{

    '$$': {
        name: '$$',
        description: 'Retrieves the value for a customVariable. If path is specified, walks the item before returning the value',
        category: VariableCategory.CustomVariable,
        acceptsNesting: true,
        examples: [
            {
                example: '$$example',
                description: 'Returns the value of the customVariable \'example\'; Synonymous with $customVariable[example]'
            },
            {
                example: '$$example[path, to, value]',
                description: 'Returns the value of the customVariable \'example\'; Synonymous with $customVariable[example, path.to.value]'
            }
        ]
    },
    '$&': {
        name: '$&',
        description: 'Retrieves the value for an effectOutput. If path is specified, walks the item before returning the value',
        category: VariableCategory.EffectOutput,
        acceptsNesting: true,
        examples: [
            {
                example: '$&example',
                description: 'Returns the value of the effectOutput \'example\'; Synonymous with $effectOutput[example]'
            },
            {
                example: '$&example[path, to, value]',
                description: 'Returns the value of the effectOutput \'example\'; Synonymous with $effectOutput[example, path.to.value]'
            }
        ]
    },
    '$ALL': {
        name: '$ALL',
        description: 'Returns true if all of the conditions are true. Only works within $if[]',
        category: VariableCategory.Logic,
        acceptsNesting: true,
        examples: [
            {
                example: '$ALL[a === a, b === b]',
                description: 'Returns true as a equals a and b equals b'
            }
        ]
    },
    '$AND': {
        name: '$AND',
        description: 'Returns true if all of the conditions are true. Only works within $if[]',
        category: VariableCategory.Logic,
        acceptsNesting: true,
        examples: [
            {
                example: '$AND[a === a, b === b]',
                description: 'Returns true as a equals a and b equals b'
            }
        ]
    },
    '$ANY': {
        name: '$ANY',
        description: 'Returns true if any of the conditions are true. Only works within $if[]',
        category: VariableCategory.Logic,
        acceptsNesting: true,
        examples: [
            {
                example: '$ANY[a === b, c === c]',
                description: 'Returns true as c equals c'
            }
        ]
    },
    '$NALL': {
        name: '$NALL',
        description: 'Returns true if any of the conditions return false',
        category: VariableCategory.Logic,
        examples: [
            {
                example: '$NALL[a === a, b === c]',
                description: 'Returns true as b does not equals c'
            }
        ]
    },
    '$NAND': {
        name: '$NAND',
        description: 'Returns true if any of the conditions return false',
        category: VariableCategory.Logic,
        examples: [
            {
                example: '$NAND[a === a, b === c]',
                description: 'Returns true as b does not equals c'
            }
        ]
    },
    '$NANY': {
        name: '$NANY',
        description: 'Returns true if all of the conditions return false',
        category: VariableCategory.Logic,
        examples: [
            {
                example: '$NANY[a === b, b === c]',
                description: 'Returns true as a does not equal be and b does not equals c'
            }
        ]
    },
    '$NOR': {
        name: '$NOR',
        description: 'Returns true if all of the conditions return false',
        category: VariableCategory.Logic,
        examples: [
            {
                example: '$NOR[a === b, b === c]',
                description: 'Returns true as a does not equal be and b does not equals c'
            }
        ]
    },
    '$NOT': {
        name: '$NOT',
        description: 'Returns the opposite of the condition\'s result. Only works within $if[]',
        category: VariableCategory.Logic,
        examples: [
            {
                example: '$NOT[1 === 1]',
                description: 'Returns false as the condition is true'
            }
        ]
    },
    '$OR': {
        name: '$OR',
        description: 'Returns true if any of the conditions are true. Only works within $if[]',
        category: VariableCategory.Logic,
        examples: [
            {
                example: '$OR[a === b, c === c]',
                description: 'Returns true as c equals c'
            }
        ]
    },
    '$accountCreationDate': {
        name: '$accountCreationDate',
        description: 'The creation date of your Twitch account.',
        category: VariableCategory.User,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$accountCreationDate[$target]',
                description: 'When in a command, gets the creation date for the target user\'s Twitch account.'
            },
            {
                example: '$accountCreationDate[$user]',
                description: 'Gets the creation date for associated user\'s Twitch account (Ie who triggered command, pressed button, etc).'
            },
            {
                example: '$accountCreationDate[ChannelOne]',
                description: 'Gets the creation date for a specific user\'s Twitch account/channel.'
            }
        ]
    },
    '$activeChatUserCount': {
        name: '$activeChatUserCount',
        description: 'Get the number of active viewers in chat.',
        category: VariableCategory.Chat,
    },
    '$arg': {
        name: '$arg',
        description: 'Grabs the command argument (aka a word after the command !trigger) at the given index.',
        category: VariableCategory.Command,
        examples: [
            {
                example: '$arg[1,2]',
                description: 'Grab a range of args.'
            },
            {
                example: '$arg[2,last]',
                description: 'Grab a range of args up to the last arg.'
            },
            {
                example: '$arg[all]',
                description: 'Grab all args. This is a good way to grab all text after the !command trigger.'
            }
        ]
    },
    '$argArray': {
        name: '$argArray',
        description: 'Returns an array of command arguments',
        category: VariableCategory.Command,
    },
    '$argCount': {
        name: '$argCount',
        description: 'Returns the number of command args.',
        category: VariableCategory.Command,
    },
    '$arrayAdd': {
        name: '$arrayAdd',
        description: 'Returns a new array with the added element',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayAdd["[1,2,3]", 4]',
                description: 'Returns a new array with 4 added to the end of the array. (1,2,3,4)'
            },
            {
                example: '$arrayAdd["[1,2,3]", 4, true]',
                description: 'Returns a new array with 4 added to the start of the array. (4,1,2,3)'
            },
            {
                example: '$arrayAdd[rawArray, 4]',
                description: 'Returns a new array with 4 added to the end of the raw array'
            },
            {
                example: '$arrayAdd[rawArray, 4, true]',
                description: 'Returns a new array with 4 added to the start of the raw array'
            }
        ]
    },
    '$arrayElement': {
        name: '$arrayElement',
        description: 'Returns the element at the given index of the input array.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayElement["[1,2,3]", 0]',
                description: 'Returns the element at the 0 index (1)'
            },
            {
                example: '$arrayElement["[1,2,3]", first]',
                description: 'Returns the element at the first index (1)'
            },
            {
                example: '$arrayElement["[1,2,3]", last]',
                description: 'Returns the element at the last index (3)'
            },
            {
                example: '$arrayElement[rawArray, 0]',
                description: 'Returns the element at the 0 index'
            },
            {
                example: '$arrayElement[rawArray, first]',
                description: 'Returns the element at the first index'
            },
            {
                example: '$arrayElement[rawArray, last]',
                description: 'Returns the element at the last index'
            }
        ]
    },
    '$arrayFilter': {
        name: '$arrayFilter',
        description: 'Returns a new filtered array.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayFilter["[1,2,3]", 1, null, false]',
                description: 'Filter out anything that doesn\'t equal 1 (new array: [1])'
            },
            {
                example: '$arrayFilter["[1,2,3]", 1, null, true]',
                description: 'Filter out anything that equals 1 (new array: [2,3])'
            },
            {
                example: '$arrayFilter["[{\\"username\\": \\"ebiggz\\"},{\\"username\\": \\"MageEnclave\\"}]", ebiggz, username, true]',
                description: 'Filter out anything that has a username property which equals "ebiggz" (new array: [{"username": "MageEnclave"}])'
            }
        ]
    },
    '$arrayFindIndex': {
        name: '$arrayFindIndex',
        description: 'Finds a matching element in the array and returns its index, or null if the element is absent.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayFindIndex["[\"a\",\"b\",\"c\"]", b]',
                description: 'Returns 1, the index of "b".'
            },
            {
                example: '$arrayFindIndex["[{\"username\": \"alastor\"},{\"username\": \"ebiggz\"}]", alastor, username]',
                description: 'Returns 0, the index of the object where "username" equals "alastor".'
            },
            {
                example: '$arrayFindIndex["[0,1,2,\\"1\\"]", "1", null, $true]',
                description: 'Returns 3, the index of the text "1".'
            },
            {
                example: '$arrayFindIndex[rawArray, b]',
                description: 'Returns the index of "b" in the raw array.'
            },
            {
                example: '$arrayFindIndex[rawArray, value, key]',
                description: 'Searches the array for an item with a key property equal to "value".'
            }
        ]
    },
    '$arrayFindWithNull': {
        name: '$arrayFindWithNull',
        description: 'Finds a matching element in the array or returns a literal null.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayFindWithNull["[1,2,3]", 1]',
                description: 'Finds 1 in the array.'
            },
            {
                example: '$arrayFindWithNull["[{\"username\": \"ebiggz\"},{\"username\": \"MageEnclave\"}]", ebiggz, username]',
                description: 'Finds the object with username "ebiggz".'
            },
            {
                example: '$arrayFindWithNull["[0,1,2,\\"1\\"]", 1, null, true]',
                description: 'Returns the text "1".'
            },
            {
                example: '$arrayFindWithNull[rawArray, value]',
                description: 'Searches each item in the array for "value" and returns the first matched item.'
            },
            {
                example: '$arrayFindWithNull[rawArray, value, key]',
                description: 'Searches each item in the array for an item that has a "key" property equal to "value".'
            }
        ]
    },
    '$arrayFrom': {
        name: '$arrayFrom',
        description: 'Returns a raw array containing the listed values.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayFrom[1, 2, 3]',
                description: 'Returns [1, 2, 3].'
            },
            {
                example: '$arrayFrom["a", "b", "c"]',
                description: 'Returns ["a", "b", "c"].'
            }
        ]
    },
    '$arrayJoin': {
        name: '$arrayJoin',
        description: 'Returns a string with each array item joined together with the given separator.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayJoin["[1,2,3]", ", "]',
                description: 'Returns "1, 2, 3".'
            },
            {
                example: '$arrayJoin["[\\"apple\\",\\"banana\\",\\"cherry\\"]", " - "]',
                description: 'Returns "apple - banana - cherry".'
            }
        ]
    },
    '$arrayLength': {
        name: '$arrayLength',
        description: 'Returns the length of the input array.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayLength["[1,2,3]"]',
                description: 'Returns 3.'
            },
            {
                example: '$arrayLength[rawArray]',
                description: 'Returns the length of the raw array.'
            }
        ]
    },
    '$arrayRandomItem': {
        name: '$arrayRandomItem',
        description: 'Returns a random item from the given array.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayRandomItem["[1,2,3]"]',
                description: 'Returns a random item from the array [1,2,3].'
            },
            {
                example: '$arrayRandomItem[rawArray]',
                description: 'Returns a random item from the raw array.'
            }
        ]
    },
    '$arrayRemove': {
        name: '$arrayRemove',
        description: 'Returns a new array with the element at the given index removed.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayRemove["[1,2,3]", 0]',
                description: 'Removes the element at index 0. Result: [2,3].'
            },
            {
                example: '$arrayRemove["[1,2,3]", first]',
                description: 'Removes the first element. Result: [2,3].'
            },
            {
                example: '$arrayRemove["[1,2,3]", last]',
                description: 'Removes the last element. Result: [1,2].'
            },
            {
                example: '$arrayRemove[rawArray, 0]',
                description: 'Removes the element at index 0 from the raw array.'
            },
            {
                example: '$arrayRemove[rawArray, first]',
                description: 'Removes the first element from the raw array.'
            },
            {
                example: '$arrayRemove[rawArray, last]',
                description: 'Removes the last element from the raw array.'
            }
        ]
    },
    '$arrayReverse': {
        name: '$arrayReverse',
        description: 'Returns a new reversed array.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayReverse["[1,2,3]"]',
                description: 'Returns [3,2,1].'
            },
            {
                example: '$arrayReverse[rawArray]',
                description: 'Returns the reversed raw array.'
            }
        ]
    },
    '$arrayShuffle': {
        name: '$arrayShuffle',
        description: 'Returns a new shuffled array.',
        category: VariableCategory.Array,
        examples: [
            {
                example: '$arrayShuffle["[1,2,3]"]',
                description: 'Returns a shuffled version of [1,2,3], e.g., [2,1,3].'
            },
            {
                example: '$arrayShuffle[rawArray]',
                description: 'Returns a shuffled version of the raw array.'
            }
        ]
    },
    '$audioDuration': {
        name: '$audioDuration',
        description: 'Attempts to retrieve the duration of an audio file.',
        category: VariableCategory.File,
        examples: [
            {
                example: '$audioDuration["path/to/audio.mp3"]',
                description: 'Returns the duration of the audio file in seconds.'
            },
            {
                example: '$audioDuration["https://example.com/audio.mp3"]',
                description: 'Returns the duration of the audio file from a URL in seconds.'
            }
        ]
    },
    '$bitsCheered': {
        name: '$bitsCheered',
        description: 'Returns the number of bits the specified user has cheered in the streamer\'s channel.',
        category: VariableCategory.Bits,
        examples: [
            {
                example: '$bitsCheered[username]',
                description: 'Returns the all-time bits cheered by "username".'
            },
            {
                example: '$bitsCheered[username, month]',
                description: 'Returns the bits cheered by "username" during the current month.'
            },
            {
                example: '$bitsCheered[username, month, 2021-08-01]',
                description: 'Returns the bits cheered by "username" during August 2021.'
            }
        ]
    },
    '$bitsLeaderboard': {
        name: '$bitsLeaderboard',
        description: 'Returns an array of the bits leaderboard of the streamer\'s channel.',
        category: VariableCategory.Bits,
        examples: [
            {
                example: '$bitsLeaderboard[count]',
                description: 'Returns an array of the bits leaderboard up to the specified count. Each object contains username and amount.'
            },
            {
                example: '$bitsLeaderboard[count, period]',
                description: 'Returns leaderboard for specified period (day, week, month, year, or all)'
            },
            {
                example: '$bitsLeaderboard[count, period, startDate]',
                description: 'Returns leaderboard for specified period starting from given date'
            }
        ]
    },
    '$bot': {
        name: '$bot',
        description: 'Outputs the Bot account username.',
        category: VariableCategory.User
    },
    '$capitalize': {
        name: '$capitalize',
        description: 'Capitalizes the given text.',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$capitalize["hello world"]',
                description: 'Returns "Hello world".'
            }
        ]
    },
    '$category': {
        name: '$category',
        aliases: ['$game'],
        description: 'Gets the current category/game set for your channel.',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$category[$target]',
                description: 'Gets the category/game set for the target user.'
            },
            {
                example: '$category[$user]',
                description: 'Gets the category/game set for the associated user.'
            },
            {
                example: '$category[ChannelOne]',
                description: 'Gets the category/game set for a specific channel.'
            }
        ]
    },
    '$categoryImageUrl': {
        name: '$categoryImageUrl',
        description: 'Gets the URL for the image of your last streamed category.',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$categoryImageUrl[$target]',
                description: 'Gets the image URL of the last streamed category for the target channel.'
            },
            {
                example: '$categoryImageUrl[$user]',
                description: 'Gets the image URL of the last streamed category for the associated user.'
            },
            {
                example: '$categoryImageUrl[ebiggz]',
                description: 'Gets the image URL of the last streamed category for a specific channel.'
            },
            {
                example: '$categoryImageUrl[ebiggz, 285x380]',
                description: 'Gets the image URL with a different size (aspect ratio 4:3). Default is 285x380.'
            }
        ]
    },
    '$ceil': {
        name: '$ceil',
        description: 'Rounds up the given number to the nearest whole number.',
        category: VariableCategory.Math,
        acceptsNesting: true,
        examples: [
            {
                example: '$ceil[3.2]',
                description: 'Returns 4'
            }
        ]
    },
    '$channelGoalCurrentAmount': {
        name: '$channelGoalCurrentAmount',
        description: 'The current amount of the current channel goal.',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$channelGoalCurrentAmount',
                description: 'Gets the current amount for the most recently created active channel goal, or the channel goal that triggered the event.'
            },
            {
                example: '$channelGoalCurrentAmount[type]',
                description: 'Gets the current amount for the active channel goal of this specific type. Types are follow, sub, subpoint, newsub, or newsubpoint.'
            }
        ]
    },
    '$channelGoalDescription': {
        name: '$channelGoalDescription',
        description: 'The description of the current channel goal.',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$channelGoalDescription',
                description: 'Gets the description for the most recently created active channel goal, or the channel goal that triggered the event.'
            },
            {
                example: '$channelGoalDescription[type]',
                description: 'Gets the description for the active channel goal of this specific type. Types are follow, sub, subpoint, newsub, or newsubpoint.'
            }
        ]
    },
    '$channelGoalTargetAmount': {
        name: '$channelGoalTargetAmount',
        description: 'The target amount of the current channel goal.',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$channelGoalTargetAmount',
                description: 'Gets the target amount for the most recently created active channel goal, or the channel goal that triggered the event.'
            },
            {
                example: '$channelGoalTargetAmount[type]',
                description: 'Gets the target amount for the active channel goal of this specific type. Types are follow, sub, subpoint, newsub, or newsubpoint.'
            }
        ]
    },
    '$charityCampaignGoal': {
        name: '$charityCampaignGoal',
        description: 'The goal amount for the current charity campaign',
        category: VariableCategory.Channel
    },
    '$charityCampaignTotal': {
        name: '$charityCampaignTotal',
        description: 'The total amount raised so far during the current charity campaign',
        category: VariableCategory.Channel
    },
    '$chatMessage': {
        name: '$chatMessage',
        description: 'Outputs the chat message from the associated command or event.',
        category: VariableCategory.Chat
    },
    '$chatMessageAnimatedEmoteUrls': {
        name: '$chatMessageAnimatedEmoteUrls',
        description: 'Outputs the URLs of a chat message\'s animated emotes from the associated command or event. Any emotes that don\'t have an animated version will return an empty string.',
        category: VariableCategory.Chat,
        examples: [
            {
                example: '$chatMessageAnimatedEmoteUrls[1]',
                description: 'Get the URL of a specific animated emote. If the emote isn\'t animated, the result will return an empty string.'
            }
        ]
    },
    '$chatMessageEmoteNames': {
        name: '$chatMessageEmoteNames',
        description: 'Outputs the names of a chat message\'s emotes from the associated command or event.',
        category: VariableCategory.Chat,
        examples: [
            {
                example: '$chatMessageEmoteNames[1]',
                description: 'Get the name of a specific emote.'
            }
        ]
    },
    '$chatMessageEmoteUrls': {
        name: '$chatMessageEmoteUrls',
        description: 'Outputs the urls of a chat message\'s emotes from the associated command or event.',
        category: VariableCategory.Chat,
        examples: [
            {
                example: '$chatMessageEmoteUrls[1]',
                description: 'Get the url of a specific emote.'
            }
        ]
    },
    '$chatMessageId': {
        name: '$chatMessageId',
        description: 'Outputs the chat message ID from the associated command or event.',
        category: VariableCategory.Chat
    },
    '$chatMessageTextOnly': {
        name: '$chatMessageTextOnly',
        description: 'Outputs the chat message text from the associated command or chat event, with any emotes, URLs, or cheermotes removed',
        category: VariableCategory.Chat,
        examples: [
            {
                example: '$chatMessageTextOnly',
                description: 'Gets the message text with the command trigger removed, and with any emotes, URLs, or cheermotes removed.'
            },
            {
                example: '$chatMessageTextOnly[true]',
                description: 'Gets the message text with the command trigger removed, and with any emotes, URLs, or cheermotes removed.'
            },
            {
                example: '$chatMessageTextOnly[false]',
                description: 'Gets the message text (including command trigger) with any emotes, URLS, or cheermotes removed.'
            }
        ]
    },
    '$chatMessages': {
        name: '$chatMessages',
        description: 'Displays the number of chat messages for a viewer (leave blank to use current viewer)',
        category: VariableCategory.Chat,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$chatMessages[username]',
                description: 'Returns the number of chat messages for the specified user'
            },
            {
                example: '$chatMessages',
                description: 'Returns the number of chat messages for the current viewer'
            }
        ]
    },
    '$chatUserColor': {
        name: '$chatUserColor',
        description: 'Outputs the chatters display color from a command or event.',
        category: VariableCategory.Chat,
        examples: [
            {
                example: '$chatUserColor[$target]',
                description: 'When in a command, gets the users color for the target user.'
            },
            {
                example: '$chatUserColor[$user]',
                description: 'Gets the color for associated user (Ie who triggered command, pressed button, etc).'
            }
        ]
    },
    '$cheermoteAmounts': {
        name: '$cheermoteAmounts',
        description: 'Outputs the amounts cheered for each instance of a chat message\'s cheermotes from the associated command or event.',
        category: VariableCategory.Bits,
        examples: [
            {
                example: '$cheermoteAmounts[1]',
                description: 'Get the amount cheered using a specific instance of a cheermote.'
            }
        ]
    },
    '$cheermoteAnimatedUrls': {
        name: '$cheermoteAnimatedUrls',
        description: 'Outputs the animated URLs of a chat message\'s cheermotes from the associated command or event.',
        category: VariableCategory.Bits,
        examples: [
            {
                example: '$cheermoteAnimatedUrls[1]',
                description: 'Get the animated URL of a specific instance of a cheermote.'
            }
        ]
    },
    '$cheermoteColors': {
        name: '$cheermoteColors',
        description: 'Outputs the text colors (in #RRGGBB format) of a chat message\'s cheermotes from the associated command or event.',
        category: VariableCategory.Bits,
        examples: [
            {
                example: '$cheermoteColors[1]',
                description: 'Gets the text color of a specific instance of a cheermote.'
            }
        ]
    },
    '$cheermoteNames': {
        name: '$cheermoteNames',
        description: 'Outputs the names of a chat message\'s cheermotes from the associated command or event.',
        category: VariableCategory.Bits,
        examples: [
            {
                example: '$cheermoteNames[1]',
                description: 'Gets the name of a specific instance of a cheermote.'
            }
        ]
    },
    '$cheermoteUrls': {
        name: '$cheermoteUrls',
        description: 'Outputs the URLs of a chat message\'s cheermotes from the associated command or event.',
        category: VariableCategory.Bits,
        examples: [
            {
                example: '$cheermoteUrls[1]',
                description: 'Gets the URL of a specific instance of a cheermote.'
            }
        ]
    },
    '$commafy': {
        name: '$commafy',
        description: 'Adds the appropriate commas to a number.',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$commafy[1000000]',
                description: 'Returns "1,000,000"'
            }
        ]
    },
    '$commandTrigger': {
        name: '$commandTrigger',
        description: 'The trigger of the issued command.',
        category: VariableCategory.Command
    },
    '$concat': {
        name: '$concat',
        description: 'Appends text together',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$concat[Hello, " ", World]',
                description: 'Returns "Hello World"'
            }
        ]
    },
    '$convertFromJSON': {
        name: '$convertFromJSON',
        description: 'Converts JSON text into a raw object instance',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$convertFromJSON[\'{"name": "John", "age": 30}\']',
                description: 'Returns a raw object from JSON string'
            }
        ]
    },
    '$convertToJSON': {
        name: '$convertToJSON',
        description: 'Converts a raw value into JSON text',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$convertToJSON[rawValue, true]',
                description: 'Converts a raw value into pretty-printed JSON text'
            }
        ]
    },
    '$count': {
        name: '$count',
        description: 'Displays the number of times the given command has been run.',
        category: VariableCategory.Command
    },
    '$counter': {
        name: '$counter',
        description: 'Displays the value of the given counter.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$counter[name]',
                description: 'Returns the value of the specified counter'
            }
        ]
    },
    '$currency': {
        name: '$currency',
        description: 'How much of the given currency the given user has.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$currency[currencyName]',
                description: 'Returns the amount of specified currency for the current user'
            },
            {
                example: '$currency[currencyName, username]',
                description: 'Returns the amount of specified currency for the given user'
            }
        ]
    },
    '$currencyRank': {
        name: '$currencyRank',
        description: 'Returns the rank of the given user based on how much of the given currency they have.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$currencyRank[currencyName]',
                description: 'Returns the rank for the current user in the specified currency'
            },
            {
                example: '$currencyRank[currencyName, username]',
                description: 'Returns the rank for the specified user in the specified currency'
            }
        ]
    },
    '$currentViewerCount': {
        name: '$currentViewerCount',
        description: 'Get the number of people viewing your stream.',
        category: VariableCategory.Channel
    },
    '$customRoleUserCount': {
        name: '$customRoleUserCount',
        description: 'Get the number of people in a custom role.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$customRoleUserCount[role]',
                description: 'Returns the number of users in the specified custom role'
            }
        ]
    },
    '$customRoleUsers': {
        name: '$customRoleUsers',
        description: 'Returns an array of all the users in the specified custom role.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$customRoleUsers[role]',
                description: 'Returns array of users in the specified custom role'
            }
        ]
    },
    '$customVariable': {
        name: '$customVariable',
        description: 'Get the data saved in the custom variable.',
        category: VariableCategory.CustomVariable,
        examples: [
            {
                example: '$customVariable[name, 1]',
                description: 'Get an array item by providing an array index as a second argument.'
            },
            {
                example: '$customVariable[name, property]',
                description: 'Get a property by providing a property path (using dot notation) as a second argument.'
            },
            {
                example: '$customVariable[name, null, exampleString]',
                description: 'Set a default value in case the custom variable doesn\'t exist yet.'
            }
        ]
    },
    '$customVariableKeys': {
        name: '$customVariableKeys',
        description: 'Get the array of keys for an object saved in the custom variable.',
        category: VariableCategory.CustomVariable,
        examples: [
            {
                example: '$customVariableKeys[name, 1]',
                description: 'Get the array of keys for an object which is an array item by providing an array index as a second argument.'
            },
            {
                example: '$customVariableKeys[name, property]',
                description: 'Get the array of keys for an object property by providing a property path (using dot notation) as a second argument.'
            }
        ]
    },
    '$date': {
        name: '$date',
        description: 'The current date formatted as MMM Do YYYY',
        category: VariableCategory.Time,
        examples: [
            {
                example: '$date[dddd MMMM Do]',
                description: 'Format with the preferred tokens.'
            },
            {
                example: '$date[MMM Do YYYY, 2, days]',
                description: 'Adds 2 days to the current date (or use other units i.e. months, years, etc.).'
            },
            {
                example: '$date[MMM Do YYY, -2, days]',
                description: 'Subtract 2 days from the current date (or use other units i.e. months, years, etc.).'
            }
        ]
    },
    '$decodeFromHtml': {
        name: '$decodeFromHtml',
        description: 'Decodes input text from an HTML-encoded string',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$decodeFromHtml[text]',
                description: 'Returns the decoded version of the HTML-encoded text'
            }
        ]
    },
    '$decodeFromUrl': {
        name: '$decodeFromUrl',
        description: 'Decodes input text from a URL-encoded string',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$decodeFromUrl[text]',
                description: 'Returns the decoded version of the URL-encoded text'
            }
        ]
    },
    '$discordTimestamp': {
        name: '$discordTimestamp',
        description: 'Outputs a discord timestamp that shows the appropriate time for all users in their own timezone.',
        category: VariableCategory.Time,
        examples: [
            {
                example: '$discordTimestamp[]',
                description: 'Create discord timestamp using your current time.'
            },
            {
                example: '$discordTimestamp[2076-01-26 13:00:00]',
                description: 'Create discord timestamp using specified time, in default discord format.'
            },
            {
                example: '$discordTimestamp[2076-01-26 13:00:00:t]',
                description: 'Create a \'short time\' discord timestamp. EX: 01:00 | 1:00 PM'
            },
            {
                example: '$discordTimestamp[2076-01-26 13:00:00:T]',
                description: 'Create a \'long time\' discord timestamp. EX: 01:00:00 | 01:00:00 PM'
            },
            {
                example: '$discordTimestamp[2076-01-26 13:00:00:d]',
                description: 'Create a \'short date\' discord timestamp. EX: 1/26/2076 | 26/01/2076'
            },
            {
                example: '$discordTimestamp[2076-01-26 13:00:00:D]',
                description: 'Create a \'long date\' discord timestamp. EX: January 26, 2076 | 26 January 2076'
            },
            {
                example: '$discordTimestamp[2076-01-26 13:00:00:f]',
                description: 'Create a \'short date/time\' discord timestamp. EX: January 26, 2076 1:00 PM | 26 January 2076 13:00'
            },
            {
                example: '$discordTimestamp[2076-01-26 13:00:00:F]',
                description: 'Create a \'long date/time\' discord timestamp. EX: Sunday, January 26, 2076 1:00 PM | Sunday, 26 January 2076, 13:00'
            },
            {
                example: '$discordTimestamp[2076-01-26 13:00:00:R]',
                description: 'Create a \'relative\' discord timestamp. EX: \'in 53 years\' | \'in 23 minutes\''
            }
        ]
    },
    '$effectOutput': {
        name: '$effectOutput',
        description: 'Get data that was outputted by a prior effect.',
        category: VariableCategory.EffectOutput,
        examples: [
            {
                example: '$effectOutput[name, 1]',
                description: 'Get an array item by providing an array index as a second argument.'
            },
            {
                example: '$effectOutput[name, property]',
                description: 'Get a property by providing a property path (using dot notation) as a second argument.'
            },
            {
                example: '$effectOutput[name, null, exampleString]',
                description: 'Set a default value in case the effect output doesn\'t exist yet.'
            },
            {
                example: '$effectOutput[name, property, exampleString]',
                description: 'Set a default value in case the effect output doesn\'t have data at the specified property path.'
            }
        ]
    },
    '$effectQueueLength': {
        name: '$effectQueueLength',
        description: 'Returns the length of an effect queue. Useful for showing queue length in a command response.',
        category: VariableCategory.EffectOutput,
        examples: [
            {
                example: '$effectQueueLength[queueName]',
                description: 'Returns the current number of effects waiting in the specified queue'
            }
        ]
    },
    '$encodeForHtml': {
        name: '$encodeForHtml',
        description: 'Encodes input text for safe use within HTML templates',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$encodeForHtml[<p>Hello & Welcome!</p>]',
                description: 'Returns "&lt;p&gt;Hello &amp; Welcome!&lt;/p&gt;"'
            }
        ]
    },
    '$encodeForUrl': {
        name: '$encodeForUrl',
        description: 'Encodes input text for use in a URL',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$encodeForUrl[Hello World!]',
                description: 'Returns "Hello%20World%21"'
            }
        ]
    },
    '$ensureNumber': {
        name: '$ensureNumber',
        description: 'Guarantees a number output. If the input is a number, it is passed through. If it\'s not, the given default number is used instead.',
        category: VariableCategory.Math,
        acceptsNesting: true,
        requiresDefault: true,
        examples: [
            {
                example: '$ensureNumber[input, defaultNumber]',
                description: 'Returns input if it\'s a number, otherwise returns defaultNumber'
            },
            {
                example: '$ensureNumber[$floor[$presetListArg[Widget Width]], 475]',
                description: 'Returns the floored widget width if valid, otherwise returns 475'
            }
        ]
    },
    '$evalJs': {
        name: '$evalJs',
        description: 'Evaluates the given js in a sandboxed browser instance.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$evalJs[``return parameters[0]``, test]',
                description: 'Returns the first parameter passed to $evalJS: "test"'
            },
            {
                example: '$evalJs[``return metadata.username``]',
                description: 'Returns the username from the event\'s metadata'
            },
            {
                example: '$evalJs[``return await Firebot.sum[1,2,3,4]``]',
                description: 'Calls the sum firebot api and returns the result'
            }
        ]
    },
    '$evalVars': {
        name: '$evalVars',
        description: 'Evaluate $variables in a string of text. Useful for evaluating text $vars from an external source (ie a txt file or API)',
        category: VariableCategory.COMMON
    },
    '$extraLifeDonations': {
        name: '$extraLifeDonations',
        description: 'Returns information on extra life donations.',
        category: VariableCategory.ExtraLife,
        examples: [
            {
                example: '$extraLifeDonations[amount]',
                description: 'Returns top donation for currently signed in extra life account.'
            },
            {
                example: '$extraLifeDonations[amount, 1, participantID]',
                description: 'Returns top donation for specified participantID.'
            },
            {
                example: '$extraLifeDonations[amount, 3, participantID]',
                description: 'Returns top 3 donations for participantID.'
            },
            {
                example: '$extraLifeDonations[createdDateUTC, 5, participantID]',
                description: 'Returns 5 most recent donations for participantID.'
            },
            {
                example: '$extraLifeDonations[createdDateUTC, 5, participantID, true]',
                description: 'Returns 5 most recent donations for participantID in JSON format.'
            },
            {
                example: '$extraLifeDonations[amount, 3, null, true]',
                description: 'Returns top 3 donations for current signed in extra life account in JSON format.'
            }
        ]
    },
    '$extraLifeIncentives': {
        name: '$extraLifeIncentives',
        description: 'Returns information on extra life incentives.',
        category: VariableCategory.ExtraLife,
        examples: [
            {
                example: '$extraLifeIncentives[]',
                description: 'Returns one incentive for the logged in extra life account.'
            },
            {
                example: '$extraLifeIncentives[Play one handed]',
                description: 'Returns one incentive with the description \'Play one handed\' for the logged in extra life account.'
            },
            {
                example: '$extraLifeIncentives[Play one handed, 1, participantID]',
                description: 'Returns one incentive with the description \'Play one handed\' for the given participant id.'
            },
            {
                example: '$extraLifeIncentives[null, 3, participantID]',
                description: 'Returns three incentives for given participant ID.'
            },
            {
                example: '$extraLifeIncentives[null, 10, null, true]',
                description: 'Returns ten incentives for current logged in extra life account in JSON format.'
            }
        ]
    },
    '$extraLifeInfo': {
        name: '$extraLifeInfo',
        description: 'Returns specified data from your extra life profile.',
        category: VariableCategory.ExtraLife,
        examples: [
            {
                example: '$extraLifeInfo[fundraisingGoal]',
                description: 'Returns the fundraising goal for the current logged in extra life account.'
            },
            {
                example: '$extraLifeInfo[fundraisingGoal, participantID]',
                description: 'Returns the fundraising goal for the given participantID.'
            },
            {
                example: '$extraLifeInfo[eventName, participantID]',
                description: 'Returns the fundraising event name, e.g. Extra Life 2024.'
            },
            {
                example: '$extraLifeInfo[donateLink, participantID]',
                description: 'Returns the donation link.'
            },
            {
                example: '$extraLifeInfo[profileLink, participantID]',
                description: 'Returns the profile link.'
            },
            {
                example: '$extraLifeInfo[sumDonations, participantID]',
                description: 'Returns the sum of current donations.'
            },
            {
                example: '$extraLifeInfo[sumPledges, participantID]',
                description: 'Returns the sum of current pledges.'
            },
            {
                example: '$extraLifeInfo[numIncentives, participantID]',
                description: 'Returns the number of incentives.'
            },
            {
                example: '$extraLifeInfo[numMilestones, participantID]',
                description: 'Returns the number of milestones.'
            },
            {
                example: '$extraLifeInfo[numDonations, participantID]',
                description: 'Returns the number of donations.'
            },
            {
                example: '$extraLifeInfo[avatarImageURL, participantID]',
                description: 'Returns the url for the extra life avatar image.'
            },
            {
                example: '$extraLifeInfo[null, null, true]',
                description: 'Get all profile data for the current logged in extra life account in JSON format.'
            }
        ]
    },
    '$extraLifeMilestones': {
        name: '$extraLifeMilestones',
        description: 'Returns information on extra life milestones.',
        category: VariableCategory.ExtraLife,
        examples: [
            {
                example: '$extraLifeMilestones[]',
                description: 'Returns the next milestone for the logged in extra life account.'
            },
            {
                example: '$extraLifeMilestones[null, 1, participantID]',
                description: 'Returns the next milestone for the given participant id.'
            },
            {
                example: '$extraLifeMilestones[75, 1, participantID]',
                description: 'Returns a milestone with the goal of $75 for the given participant id.'
            },
            {
                example: '$extraLifeMilestones[75]',
                description: 'Returns a milestone with the goal of $75 for the logged in extra life account.'
            },
            {
                example: '$extraLifeMilestones[null, 3, participantID, true]',
                description: 'Returns three milestones in JSON format.'
            }
        ]
    },
    '$false': {
        name: '$false',
        description: 'Returns a literal false boolean value; Useful in comparisons such as in $if[]',
        category: VariableCategory.Logic
    },
    '$fileExists': {
        name: '$fileExists',
        description: 'Returns true if a file exists, otherwise returns false.',
        category: VariableCategory.File,
        examples: [
            {
                example: '$fileExists[path/to/file.txt]',
                description: 'Returns true if the specified file exists'
            }
        ]
    },
    '$fileLineCount': {
        name: '$fileLineCount',
        description: 'Count the number of lines in a text file.',
        category: VariableCategory.File,
        examples: [
            {
                example: '$fileLineCount[path/to/file.txt]',
                description: 'Returns the number of lines in the specified file'
            }
        ]
    },
    '$filesInDirectory': {
        name: '$filesInDirectory',
        description: 'Returns an array of full filepaths in the given directory. Does not include subdirectories',
        category: VariableCategory.File,
        examples: [
            {
                example: '$filesInDirectory[path\\to\\dir\\, regexp, flags]',
                description: 'Lists files matching the regexp filter'
            }
        ]
    },
    '$floor': {
        name: '$floor',
        description: 'Rounds down the given number to the nearest whole number.',
        category: VariableCategory.Math,
        acceptsNesting: true,
        examples: [
            {
                example: '$floor[3.7]',
                description: 'Returns 3'
            },
            {
                example: '$floor[$presetListArg[Number]]',
                description: 'Rounds down the preset list argument value'
            }
        ]
    },
    '$followAge': {
        name: '$followAge',
        description: 'The time a given viewer has been following the channel, in days by default.',
        category: VariableCategory.User,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$followAge[$user]',
                description: 'Gets how long the associated user (i.e. who triggered command, pressed button, etc) has been following the channel (in days).'
            },
            {
                example: '$followAge[$target]',
                description: 'Gets how long the target user has been following the channel (in days).'
            },
            {
                example: '$followAge[username, unitOfTime]',
                description: 'Gets how long the specified username has been following the channel in a specific unit of time (in years, months, days, hours, or minutes).'
            }
        ]
    },
    '$followCount': {
        name: '$followCount',
        description: 'The number of follows you currently have.',
        category: VariableCategory.Channel,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$followCount[$target]',
                description: 'When in a command, gets the follow count for the target user.'
            },
            {
                example: '$followCount[$user]',
                description: 'Gets the follow count for associated user (Ie who triggered command, pressed button, etc).'
            },
            {
                example: '$followCount[ChannelOne]',
                description: 'Gets the follow count for a specific channel.'
            }
        ]
    },
    '$hasRole': {
        name: '$hasRole',
        description: 'Returns true if the user has the specified role. Only valid within $if[]',
        category: VariableCategory.User,
        examples: [
            {
                example: '$hasRole[$user, mod]',
                description: 'Returns true if the user has the moderator role'
            }
        ]
    },
    '$hasRoles': {
        name: '$hasRoles',
        description: 'Returns true if the user has the specified roles. Only valid within $if',
        category: VariableCategory.User,
        examples: [
            {
                example: '$hasRoles[$user, any, mod, vip]',
                description: 'returns true if $user is a mod OR VIP'
            },
            {
                example: '$hasRoles[$user, all, mod, vip]',
                description: 'Returns true if $user is a mod AND a VIP'
            }
        ]
    },
    '$if': {
        name: '$if',
        description: 'Returns the parameter based on the condition\'s result.',
        category: VariableCategory.Logic,
        acceptsNesting: true,
        examples: [
            {
                example: '$if[$user === Jim, JIM]',
                description: 'Returns JIM if the user is Jim, otherwise returns empty text'
            },
            {
                example: '$if[$user === Jim, JIM, JOHN]',
                description: 'Returns JIM if the user is Jim, otherwise returns JOHN'
            }
        ]
    },
    '$isAdBreakRunning': {
        name: '$isAdBreakRunning',
        description: 'Whether or not an ad break is currently running',
        category: VariableCategory.Channel
    },
    '$isUserInChat': {
        name: '$isUserInChat',
        description: 'Outputs true if a user is currently connected to Twitch chat, false if not',
        category: VariableCategory.Chat,
        examples: [
            {
                example: '$isUserInChat[username]',
                description: 'Returns true if the specified user is connected to chat, false otherwise'
            }
        ]
    },
    '$isWhisper': {
        name: '$isWhisper',
        description: 'Returns true if the chat message that triggered a command is a whisper, otherwise returns false.',
        category: VariableCategory.Chat
    },
    '$loopCount': {
        name: '$loopCount',
        description: '0 based count for the current loop iteration inside of a Loop Effects effect',
        category: VariableCategory.COMMON
    },
    '$loopItem': {
        name: '$loopItem',
        description: 'The item for current loop iteration inside of a Loop Effects effect using Array loop mode',
        category: VariableCategory.COMMON
    },
    '$lowercase': {
        name: '$lowercase',
        description: 'Makes the entire given text string lowercase.',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$lowercase[Some Text]',
                description: 'Returns "some text"'
            }
        ]
    },
    '$math': {
        name: '$math',
        description: 'Evaluate a math equation using math.js',
        category: VariableCategory.Math,
        acceptsNesting: true,
        examples: [
            {
                example: '$math[2 + 2]',
                description: 'Simple addition calculation returns 4'
            },
            {
                example: '$math[5 * (3 + 2)]',
                description: 'Complex calculation returns 25'
            }
        ]
    },
    '$max': {
        name: '$max',
        description: 'Returns the highest-value number passed',
        category: VariableCategory.Math,
        acceptsNesting: true,
        examples: [
            {
                example: '$max[1, 5, 3, 10]',
                description: 'Returns 10, the highest value from the input numbers'
            }
        ]
    },
    '$min': {
        name: '$min',
        description: 'Returns the lowest-value number passed',
        category: VariableCategory.Math,
        acceptsNesting: true,
        examples: [
            {
                example: '$min[1, 5, 3, 10]',
                description: 'Returns 1, the lowest value from the input numbers'
            }
        ]
    },
    '$null': {
        name: '$null',
        description: 'Returns a literal null value; Useful in comparisons such as in $if[]',
        category: VariableCategory.Logic
    },

    '$objectWalkPath': {
        name: '$objectWalkPath',
        description: 'Returns the value from an object at the given dot-notated path',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$objectWalkPath[object, path.to.property]',
                description: 'Retrieves nested property value using dot notation'
            }
        ]
    },
    '$obsColorValue': {
        name: '$obsColorValue',
        description: 'Returns an OBS color value based on either a hex color code (e.g. #0066FF) or an HTML color name.',
        category: VariableCategory.OBS,
        examples: [
            {
                example: '$obsColorValue[#FF0000]',
                description: 'Returns OBS color value for red using hex code'
            },
            {
                example: '$obsColorValue[blue]',
                description: 'Returns OBS color value for blue using color name'
            }
        ]
    },
    '$obsInputActive': {
        name: '$obsInputActive',
        description: 'Returns true if the OBS input is active or false if it is not.',
        category: VariableCategory.OBS
    },
    '$obsInputAudioBalance': {
        name: '$obsInputAudioBalance',
        description: 'Returns the audio balance value of the OBS input.',
        category: VariableCategory.OBS
    },
    '$obsInputAudioSyncOffset': {
        name: '$obsInputAudioSyncOffset',
        description: 'Returns the audio sync offset (in milliseconds) of the OBS input.',
        category: VariableCategory.OBS
    },
    '$obsInputAudioTracks': {
        name: '$obsInputAudioTracks',
        description: 'Returns the raw OBS audio tracks object of the OBS input.',
        category: VariableCategory.OBS
    },
    '$obsInputKind': {
        name: '$obsInputKind',
        description: 'Returns the OBS internal name of the kind of OBS input.',
        category: VariableCategory.OBS
    },
    '$obsInputMonitorType': {
        name: '$obsInputMonitorType',
        description: 'Returns the audio monitor type of the OBS input. Values are None, Monitor Only, or Monitor and Output.',
        category: VariableCategory.OBS
    },
    '$obsInputMuted': {
        name: '$obsInputMuted',
        description: 'Returns true if the OBS input is muted or false if it is not.',
        category: VariableCategory.OBS
    },
    '$obsInputName': {
        name: '$obsInputName',
        description: 'Returns the name of the OBS input.',
        category: VariableCategory.OBS
    },
    '$obsInputSettings': {
        name: '$obsInputSettings',
        description: 'Returns the raw OBS settings object of the OBS input.',
        category: VariableCategory.OBS
    },
    '$obsInputShowing': {
        name: '$obsInputShowing',
        description: 'Returns true if the OBS input is currently showing or false if it is not.',
        category: VariableCategory.OBS
    },
    '$obsInputUuid': {
        name: '$obsInputUuid',
        description: 'Returns the UUID of the OBS input.',
        category: VariableCategory.OBS
    },
    '$obsInputVolumeDb': {
        name: '$obsInputVolumeDb',
        description: 'Returns the volume level in dB of the OBS input.',
        category: VariableCategory.OBS
    },
    '$obsInputVolumeMultiplier': {
        name: '$obsInputVolumeMultiplier',
        description: 'Returns the volume level multiplier of the OBS input.',
        category: VariableCategory.OBS
    },
    '$obsIsConnected': {
        name: '$obsIsConnected',
        description: 'Returns \'true\' if OBS is currently connected or \'false\' if it is not.',
        category: VariableCategory.OBS
    },
    '$obsIsRecording': {
        name: '$obsIsRecording',
        description: 'Returns \'true\' if OBS is currently recording or \'false\' if it is not.',
        category: VariableCategory.OBS
    },
    '$obsIsStreaming': {
        name: '$obsIsStreaming',
        description: 'Returns \'true\' if OBS is currently streaming or \'false\' if it is not.',
        category: VariableCategory.OBS
    },
    '$obsOldInputName': {
        name: '$obsOldInputName',
        description: 'Returns the previous name of the OBS input.',
        category: VariableCategory.OBS
    },
    '$obsSceneCollectionName': {
        name: '$obsSceneCollectionName',
        description: 'The name of the OBS scene collection that triggered the event, or the name of the current OBS scene collection if there is no event. If OBS isn\'t running, it returns \'Unknown\'.',
        category: VariableCategory.OBS
    },
    '$obsSceneName': {
        name: '$obsSceneName',
        description: 'The name of the OBS scene that triggered the event, or the current OBS Scene if there is no event. If OBS isn\'t running, it returns \'Unknown\'.',
        category: VariableCategory.OBS
    },
    '$ordinalIndicator': {
        name: '$ordinalIndicator',
        description: 'Adds an ordinal indicator suffix to a number (ie \'st\', \'nd\', \'rd\')',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$ordinalIndicator[1]',
                description: 'Returns "1st"'
            },
            {
                example: '$ordinalIndicator[2]',
                description: 'Returns "2nd"'
            }
        ]
    },
    '$padNumber': {
        name: '$padNumber',
        description: 'Pads the given number up to the specified number of decimal places.',
        category: VariableCategory.Math,
        examples: [
            {
                example: '$padNumber[5, 2]',
                description: 'Returns "5.00" - pads to 2 decimal places'
            }
        ]
    },
    '$profilePageBytebinToken': {
        name: '$profilePageBytebinToken',
        description: 'Get bytebin id for streamer profile. Access the json by going to https://bytebin.lucko.me/ID-HERE.',
        category: VariableCategory.COMMON
    },
    $presetListArg: {
        name: '$presetListArg',
        description: 'Represents the given argument passed to this preset effect list.',
        category: VariableCategory.Command,
        examples: [
            {
                example: '$presetListArg[name]',
                description: 'Get the argument with the name "name" passed to this preset list effect'
            }
        ]
    },
    '$pronouns': {
        name: '$pronouns',
        description: 'Returns the pronouns of the given user. It uses https://pronouns.alejo.io/ to get the pronouns.',
        category: VariableCategory.User,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$pronouns[username, 0, they/them]',
                description: 'Returns \'she/her\' if available, otherwise uses they/them.'
            },
            {
                example: '$pronouns[username, 1, they]',
                description: 'Returns \'she\' pronoun in she/her set if available, otherwise uses they.'
            },
            {
                example: '$pronouns[username, 2, them]',
                description: 'Returns \'her\' pronoun in she/her set if available, otherwise uses them.'
            }
        ]
    },
    '$quickStore': {
        name: '$quickStore',
        description: 'Retrieves or stores a value until the expression has finished evaluation',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$quickStore[name, value]',
                description: 'Stores "value" under the key "name"'
            },
            {
                example: '$quickStore[name]',
                description: 'Retrieves the value of what was stored under the key of "name"'
            }
        ]
    },
    '$quote': {
        name: '$quote',
        description: 'Get a random quote',
        category: VariableCategory.COMMON,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$quote',
                description: 'Returns a random quote'
            },
            {
                example: '$quote[#]',
                description: 'Returns the quote with the specified ID'
            }
        ]
    },
    '$quoteAsObject': {
        name: '$quoteAsObject',
        description: 'Get a random quote in the form of a JSON Object.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$quoteAsObject[#]',
                description: 'Get a specific quote id.'
            },
            {
                example: '$quoteAsObject[#, property]',
                description: 'Get only a specific property for a specific quote. Valid properties are id, createdAt, creator, originator, text and game.'
            },
            {
                example: '$quoteAsObject[null, property]',
                description: 'Get only a specific property for a random quote. Valid properties are id, createdAt, creator, originator, text and game.'
            }
        ]
    },
    '$randomActiveViewer': {
        name: '$randomActiveViewer',
        description: 'Get a random active chatter.',
        category: VariableCategory.User,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$randomActiveViewer[roleName]',
                description: 'Filter to an active viewer in a specific role.'
            },
            {
                example: '$randomActiveViewer[null, ignoreUser]',
                description: 'Get a random active user that is NOT the ignore user'
            }
        ]
    },
    '$randomAdvice': {
        name: '$randomAdvice',
        description: 'Get some random advice!',
        category: VariableCategory.COMMON
    },
    '$randomCustomRoleUser': {
        name: '$randomCustomRoleUser',
        description: 'Returns a random user that has the specified custom role.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$randomCustomRoleUser[role]',
                description: 'Returns a random user from the specified custom role'
            }
        ]
    },
    '$randomDadJoke': {
        name: '$randomDadJoke',
        description: 'Get a random dad joke!',
        category: VariableCategory.COMMON
    },
    '$randomNumber': {
        name: '$randomNumber',
        description: 'Get a random number between the given range.',
        category: VariableCategory.Math,
        examples: [
            {
                example: '$randomNumber[1, 100]',
                description: 'Returns a random number between 1 and 100 inclusive'
            },
            {
                example: '$randomNumber[0, 10]',
                description: 'Returns a random number between 0 and 10 inclusive'
            }
        ]
    },
    '$randomRedditImage': {
        name: '$randomRedditImage',
        description: 'Get a random image from a subreddit. (We do our best to check for bad images, but content warning none the less.)',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$randomRedditImage[aww]',
                description: 'Returns a random image URL from the r/aww subreddit'
            }
        ]
    },
    '$randomUUID': {
        name: '$randomUUID',
        description: 'Returns a random formated UUID eg 00000000-0000-0000-0000-000000000000',
        category: VariableCategory.COMMON
    },
    '$randomViewer': {
        name: '$randomViewer',
        description: 'Get a random viewer in chat.',
        category: VariableCategory.User
    },
    '$rankLadderMode': {
        name: '$rankLadderMode',
        description: 'Returns the mode of the specified rank ladder (e.g. \'auto\' or \'manual\')',
        category: VariableCategory.Rank,
        examples: [
            {
                example: '$rankLadderMode[viewerLevels]',
                description: 'Returns the mode ("auto" or "manual") for the viewerLevels rank ladder'
            }
        ]
    },
    '$rankValue': {
        name: '$rankValue',
        description: 'Returns the threshold value of the specified rank in the rank ladder. Only applicable to auto rank ladders.',
        category: VariableCategory.Rank,
        examples: [
            {
                example: '$rankValue[viewerLevels, Expert]',
                description: 'Returns the threshold value required to reach the Expert rank in the viewerLevels ladder'
            }
        ]
    },
    '$rankValueDescription': {
        name: '$rankValueDescription',
        description: 'Returns the threshold value description of the specified rank in the rank ladder, i.e. \'50 hours\'. Only applicable to auto rank ladders.',
        category: VariableCategory.Rank,
        examples: [
            {
                example: '$rankValueDescription[viewerLevels, Expert]',
                description: 'Returns the threshold description (e.g. "50 hours") for the Expert rank in the viewerLevels ladder'
            }
        ]
    },
    '$rawArgArray': {
        name: '$rawArgArray',
        description: 'Returns the raw array of command arguments',
        category: VariableCategory.Command,
        deprecated: true,
        deprecatedMessage: 'Use $argArray instead',
        replacedBy: '$argArray'
    },
    '$rawArrayFilter': {
        name: '$rawArrayFilter',
        description: 'Returns a new filtered raw array.',
        category: VariableCategory.Array,
        deprecated: true,
        deprecatedMessage: 'Use $arrayFilter instead',
        replacedBy: '$arrayFilter',
        examples: [
            {
                example: '$rawArrayFilter[rawArray, 1, null, false]',
                description: 'Filter out anything that doesn\'t equal 1'
            },
            {
                example: '$rawArrayFilter[rawArray, 1, null, true]',
                description: 'Filter out anything that equals 1'
            },
            {
                example: '$rawArrayFilter[rawArray, value, key, true]',
                description: 'Filter out any item in the array that has a key property twitch equals "value"'
            }
        ]
    },
    '$rawBitsLeaderboard': {
        name: '$rawBitsLeaderboard',
        description: 'Returns a raw array of the all-time bits leaderboard of the streamer\'s channel, up to the specified count. Each item in the array has a username and amount property',
        category: VariableCategory.Bits,
        deprecated: true,
        deprecatedMessage: 'Use $bitsLeaderboard instead',
        replacedBy: '$bitsLeaderboard',
        examples: [
            {
                example: '$rawBitsLeaderboard[count, period]',
                description: 'Returns a raw array of the bits leaderboard of the streamer\'s channel during the current specified period, up to the specified count. Each object in the array has a username and amount. Period can be \'day\', \'week\', \'month\', \'year\', or \'all\'.'
            },
            {
                example: '$rawBitsLeaderboard[count, period, startDate]',
                description: 'Returns a raw array of the bits leaderboard of the streamer\'s channel during the specified period that occurred on the specified date, up to the specified count. Each object in the array has a username and amount. Period can be \'day\', \'week\', \'month\', \'year\', or \'all\'.'
            }
        ]
    },
    '$rawCustomRoleUsers': {
        name: '$rawCustomRoleUsers',
        description: 'Returns an array of all the users in the specified custom role.',
        category: VariableCategory.User,
        deprecated: true,
        deprecatedMessage: 'Use $customRoleUsers instead',
        replacedBy: '$customRoleUsers'
    },
    '$rawCustomVariable': {
        name: '$rawCustomVariable',
        description: 'Get the data saved in the custom variable.',
        category: VariableCategory.CustomVariable,
        examples: [
            {
                example: '$rawCustomVariable[name, 1]',
                description: 'Get an array item by providing an array index as a second argument.'
            },
            {
                example: '$rawCustomVariable[name, property]',
                description: 'Get a property by providing a property path (using dot notation) as a second argument.'
            },
            {
                example: '$rawCustomVariable[name, null, exampleString]',
                description: 'Set a default value in case the custom variable doesn\'t exist yet.'
            }
        ]
    },
    '$rawCustomVariableKeys': {
        name: '$rawCustomVariableKeys',
        description: 'Get the array of keys for an object saved in the custom variable.',
        category: VariableCategory.CustomVariable,
        examples: [
            {
                example: '$rawCustomVariableKeys[name, property|index]',
                description: 'Get the array of keys for an object property by providing a property path (using dot notation) as a second argument.'
            }
        ]
    },
    '$rawQuoteAsObject': {
        name: '$rawQuoteAsObject',
        description: 'Get a random quote in the form of a raw Object.',
        category: VariableCategory.COMMON,
        deprecated: true,
        deprecatedMessage: 'Use $quoteAsObject instead',
        replacedBy: '$quoteAsObject',
        examples: [
            {
                example: '$rawQuoteAsObject[#]',
                description: 'Get a specific quote id.'
            },
            {
                example: '$rawQuoteAsObject[#, property]',
                description: 'Get only a specific property for a specific quote. Valid properties are id, createdAt, creator, originator, text and game.'
            },
            {
                example: '$rawQuoteAsObject[null, property]',
                description: 'Get only a specific property for a random quote. Valid properties are id, createdAt, creator, originator, text and game.'
            }
        ]
    },
    '$rawRandomCustomRoleUser': {
        name: '$rawRandomCustomRoleUser',
        description: 'Returns a random user that has the specified custom role as an object containing id, username, and displayName fields.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$rawRandomCustomRoleUser[Subscriber]',
                description: 'Returns a random user object from the Subscriber role containing their id, username, and displayName'
            }
        ]
    },
    '$rawTopBitsCheerers': {
        name: '$rawTopBitsCheerers',
        description: 'Returns a raw array containing the username of the top user who has cheered the most bits in the streamer\'s channel all-time.',
        category: VariableCategory.Bits,
        deprecated: true,
        deprecatedMessage: 'Use $topBitsCheerers instead',
        replacedBy: '$topBitsCheerers',
        examples: [
            {
                example: '$rawTopBitsCheerers[count]',
                description: 'Returns a raw array of the usernames up to the specified count, of the users who have cheered the most bits in the streamer\'s channel all-time.'
            },
            {
                example: '$rawTopBitsCheerers[count, period]',
                description: 'Returns a raw array of the usernames up to the specified count, of the users who have cheered the most bits in the streamer\'s channel during the current specified period. Period can be \'day\', \'week\', \'month\', \'year\', or \'all\'.'
            },
            {
                example: '$rawTopBitsCheerers[count, period, startDate]',
                description: 'Returns a raw array of the usernames up to the specified count, of the users who have cheered the most bits in the streamer\'s channel during the specified period that occurred on the specified date. Period can be \'day\', \'week\', \'month\', \'year\', or \'all\'.'
            }
        ]
    },
    '$rawTopCurrency': {
        name: '$rawTopCurrency',
        description: 'Returns a raw array containing those with the most of the specified currency. Items in the array contain \'place\', \'username\' and \'amount\' properties',
        category: VariableCategory.COMMON,
        deprecated: true,
        deprecatedMessage: 'Use $topCurrency instead',
        replacedBy: '$topCurrency',
        examples: [
            {
                example: '$rawTopCurrency[Points]',
                description: 'Returns array of top 10 users with their Points amounts'
            },
            {
                example: '$rawTopCurrency[Points, 5]',
                description: 'Returns array of top 5 users with their Points amounts'
            }
        ]
    },
    '$rawTopMetadata': {
        name: '$rawTopMetadata',
        description: 'Returns a raw array of users with the most of a given metadata key. Items contain \'username\', \'place\' and \'amount\' properties',
        category: VariableCategory.COMMON,
        deprecated: true,
        deprecatedMessage: 'Use $topMetadata instead',
        replacedBy: '$topMetadata',
        examples: [
            {
                example: '$rawTopMetadata[deaths]',
                description: 'Returns array of top 10 users with their death counts'
            },
            {
                example: '$rawTopMetadata[deaths, 5]',
                description: 'Returns array of top 5 users with their death counts'
            }
        ]
    },
    '$rawTopViewTime': {
        name: '$rawTopViewTime',
        description: 'Returns a raw array containing users with the most view time(in hours). Items contain \'username\', \'place\' and \'minutes\' properties',
        category: VariableCategory.User,
        deprecated: true,
        deprecatedMessage: 'Use $topViewTime instead',
        replacedBy: '$topViewTime',
        examples: [
            {
                example: '$rawTopViewTime[10]',
                description: 'Returns array of top 10 users with their view time in minutes'
            },
            {
                example: '$rawTopViewTime[5]',
                description: 'Returns array of top 5 users with their view time in minutes'
            }
        ]
    },
    '$rawUserRoles': {
        name: '$rawUserRoles',
        description: 'Returns all roles of the user as a raw array',
        category: VariableCategory.User,
        deprecated: true,
        deprecatedMessage: 'Use $userRoles instead',
        replacedBy: '$userRoles',
        examples: [
            {
                example: '$rawUserRoles',
                description: 'Returns all roles for the user'
            },
            {
                example: '$rawUserRoles[$user]',
                description: 'Returns all roles of the specified user'
            },
            {
                example: '$rawUserRoles[$user, all]',
                description: 'Returns all roles of the specified user as nested arrays in the order of: twitch, team, firebot and custom roles'
            },
            {
                example: '$rawUserRoles[$user, firebot]',
                description: 'Returns all firebot roles of the specified user'
            },
            {
                example: '$rawUserRoles[$user, custom]',
                description: 'Returns all custom roles of the specified user'
            },
            {
                example: '$rawUserRoles[$user, twitch]',
                description: 'Returns all Twitch roles of the specified user'
            },
            {
                example: '$rawUserRoles[$user, team]',
                description: 'Returns all Twitch team roles of the specified user'
            }
        ]
    },
    '$rawUsernameArray': {
        name: '$rawUsernameArray',
        description: 'Returns a raw array of all usernames saved in the user db',
        category: VariableCategory.User,
        deprecated: true,
        deprecatedMessage: 'Use $usernameArray instead',
        replacedBy: '$usernameArray'
    },
    '$readApi': {
        name: '$readApi',
        description: 'Calls the given URL and returns the response as a string.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$readApi[url, object.path.here]',
                description: 'Traverse a JSON response object.'
            }
        ]
    },
    '$readFile': {
        name: '$readFile',
        description: 'Read contents of a text file.',
        category: VariableCategory.File,
        examples: [
            {
                example: '$readFile[path\\to\\file.txt, 1]',
                description: 'Read a specific line number from the file.'
            },
            {
                example: '$readFile[path\\to\\file.txt, first]',
                description: 'Read the first line from the file.'
            },
            {
                example: '$readFile[path\\to\\file.txt, first, true]',
                description: 'Removes leading, trailing, and empty lines before grabbing the first line'
            },
            {
                example: '$readFile[path\\to\\file.txt, last]',
                description: 'Read the last line from the file.'
            },
            {
                example: '$readFile[path\\to\\file.txt, last, true]',
                description: 'Removes leading, trailing, and empty lines before grabbing the last line'
            },
            {
                example: '$readFile[path\\to\\file.txt, random]',
                description: 'Read a random line from the file.'
            },
            {
                example: '$readFile[path\\to\\file.txt, random, true]',
                description: 'Removes leading, trailing, and empty lines before grabbing a random line'
            }
        ]
    },
    '$regexExec': {
        name: '$regexExec',
        description: 'Filter a string with a regular expression',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$regexExec[string, expression, flags]',
                description: 'Add flags to the regex evaluation.'
            }
        ]
    },
    '$regexMatches': {
        name: '$regexMatches',
        description: 'Filter a string with a regular expression and return an array of all matches',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$regexMatches[string, expression, flags]',
                description: 'Add flags to the regex evaluation.'
            }
        ]
    },
    '$regexTest': {
        name: '$regexTest',
        description: 'Check whether a string matches a regular expression',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$regexTest[string, expression, flags]',
                description: 'Add flags to the regex evaluation.'
            }
        ]
    },
    '$replace': {
        name: '$replace',
        description: 'Replaces a search value with a replacement value',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$replace[textInput, searchValue, replacement, true]',
                description: 'Allows searching using a regular expression.'
            },
            {
                example: '$replace[textInput, searchValue, replacement, true, flags]',
                description: 'Add flags when using a regular expression.'
            }
        ]
    },
    '$rewardCost': {
        name: '$rewardCost',
        description: 'The channel point cost of the reward',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$rewardCost[rewardName]',
                description: 'The channel point cost of the given reward. Name must be exact!'
            }
        ]
    },
    '$rewardDescription': {
        name: '$rewardDescription',
        description: 'The description of the reward',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$rewardDescription[rewardName]',
                description: 'The description of the given reward. Name must be exact!'
            }
        ]
    },
    '$rewardImageUrl': {
        name: '$rewardImageUrl',
        description: 'The image url of the award',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$rewardDescription[rewardName]',
                description: 'The description of the given reward. Name must be exact!'
            }
        ]
    },
    '$rollDice': {
        name: '$rollDice',
        description: 'Rolls some dice based on the provided config, ie 2d6 or 2d10+1d12 or 1d10+3',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$rollDice[1d6]',
                description: 'Roll one 6-sided dice, outputs the sum'
            },
            {
                example: '$rollDice[2d10+1d12]',
                description: 'Roll two 10-sided dice and one 12-sided die, outputs the sum'
            },
            {
                example: '$rollDice[2d6, show each]',
                description: 'Outputs text containing both the sum of all roles and the values or each individual roll. IE: \'10 (4, 6)\''
            }
        ]
    },
    '$round': {
        name: '$round',
        description: 'Rounds the given number to the nearest whole number.',
        category: VariableCategory.Math,
        acceptsNesting: true,
        examples: [
            {
                example: '$round[num, places]',
                description: 'Rounds the given number to the specified number of decimal places.'
            }
        ]
    },
    '$runEffect': {
        name: '$runEffect',
        description: 'Run an effect defined as json. Outputs an empty string. Please keep in mind that the power and flexibility afforded by this variable means it is very error prone. Only use if you know what you are doing.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$runEffect[``{"type":"firebot:chat","message":"Hello world"}``]',
                description: 'Runs a chat message effect. You can get an effects JSON data via the UI via the overflow menu in the top right of the Edit Effect modal. (Copy Effect Json > For $runEffect[])'
            }
        ]
    },
    '$scrambleText': {
        name: '$scrambleText',
        description: 'Scrambles the input text',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$scrambleText[Hello World]',
                description: 'Returns the text with characters randomly rearranged'
            }
        ]
    },
    '$secondsUntilNextAdBreak': {
        name: '$secondsUntilNextAdBreak',
        description: 'The number of seconds until the next schduled ad break',
        category: VariableCategory.Channel
    },
    '$setObjectProperty': {
        name: '$setObjectProperty',
        description: 'Adds or updates a property\'s value in the given JSON object. For nested properties, you can use dot notation (e.g. some.property). Set value to null to remove property.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$setObjectProperty[{"name": "John"}, age, 25]',
                description: 'Adds/updates the age property to 25. Result: {"name": "John", "age": 25}'
            },
            {
                example: '$setObjectProperty[{"user": {"name": "John"}}, user.age, 25]',
                description: 'Adds/updates a nested property using dot notation. Result: {"user": {"name": "John", "age": 25}}'
            },
            {
                example: '$setObjectProperty[{"name": "John", "age": 25}, age, null]',
                description: 'Removes the age property. Result: {"name": "John"}'
            }
        ]
    },
    '$splitText': {
        name: '$splitText',
        description: 'Splits text with the given separator and returns an array. Useful for Custom Variables.',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$splitText[text, separator]',
                description: 'Returns array of substrings split on separator'
            }
        ]
    },
    '$streamTitle': {
        name: '$streamTitle',
        description: 'Gets the current stream title for your channel',
        category: VariableCategory.Channel,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$streamTitle[$target]',
                description: 'When in a command, gets the stream title for the target channel.'
            },
            {
                example: '$streamTitle[$user]',
                description: 'Gets the stream title for associated user (Ie who triggered command, pressed button, etc).'
            },
            {
                example: '$streamTitle[ebiggz]',
                description: 'Gets the stream title for a specific channel.'
            }
        ]
    },
    '$streamer': {
        name: '$streamer',
        description: 'Outputs the Streamer account username.',
        category: VariableCategory.User
    },
    '$subCount': {
        name: '$subCount',
        description: 'The number of subs you currently have.',
        category: VariableCategory.Channel
    },
    '$subNames': {
        name: '$subNames',
        description: 'Returns an array of subscriptions you currently have. Items contain \'username\', \'tier\' and \'isGift\' properties',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$subNames',
                description: 'Returns: [{username: "firebottle", displayname: "FireBottle", tier: 2000, isGift:false}, {username: "ebiggz", displayname: "EBiggz", tier: 1000, isGift:true}] To be used with array or custom variables'
            }
        ]
    },
    '$subPoints': {
        name: '$subPoints',
        description: 'The number of sub points you currently have.',
        category: VariableCategory.Channel
    },
    '$target': {
        name: '$target',
        description: 'Similar to the $arg variable but strips out any leading \'@\' symbols. Useful when the argument is expected to be a username.',
        category: VariableCategory.Command,
        examples: [
            {
                example: '$target[#]',
                description: 'Grab the target at the given index (IE with \'!command @ebiggz @TheLastMage\', $target[2] would be \'TheLastMage\')'
            }
        ]
    },
    '$textContains': {
        name: '$textContains',
        description: 'Returns true if text contains search, otherwise returns false',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$textContains[text, search]',
                description: 'Returns true if text contains the search string, false otherwise'
            }
        ]
    },
    '$textLength': {
        name: '$textLength',
        description: 'Returns the length of the input text',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$textLength[text]',
                description: 'Returns the number of characters in the input text'
            }
        ]
    },
    '$textPadEnd': {
        name: '$textPadEnd',
        description: 'Pads the end of text',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$textPadEnd[input, count, $false, " "]',
                description: 'Adds \'count\' number of spaces to the end of input'
            },
            {
                example: '$textPadEnd[input, count, $true, " "]',
                description: 'Adds spaces to the end of the input until the length of the output equals \'count\''
            }
        ]
    },
    '$textPadStart': {
        name: '$textPadStart',
        description: 'Pads the start of text',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$textPadStart[input, count, $false, " "]',
                description: 'Adds \'count\' number of spaces to the start of input'
            },
            {
                example: '$textPadStart[input, count, $true, " "]',
                description: 'Adds spaces to the start of the input until the length of the output equals \'count\''
            }
        ]
    },
    '$textSubstring': {
        name: '$textSubstring',
        description: 'Returns a substring of the provided text based on the range',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$textSubstring[text, start, end]',
                description: 'Returns portion of text from start index to end index'
            }
        ]
    },
    '$time': {
        name: '$time',
        description: 'Outputs the current time.',
        category: VariableCategory.Time,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$time[format]',
                description: 'Outputs the current time in a specific format. Format uses moment.js formatting rules.'
            }
        ]
    },
    '$topBitsCheerers': {
        name: '$topBitsCheerers',
        description: 'Returns an array containing the username of the top user who has cheered the most bits in the streamer\'s channel all-time.',
        category: VariableCategory.Bits,
        examples: [
            {
                example: '$topBitsCheerers[count]',
                description: 'Returns an array of the usernames up to the specified count, of the users who have cheered the most bits in the streamer\'s channel all-time.'
            },
            {
                example: '$topBitsCheerers[count, period]',
                description: 'Returns an array of the usernames up to the specified count, of the users who have cheered the most bits in the streamer\'s channel during the current specified period. Period can be \'day\', \'week\', \'month\', \'year\', or \'all\'.'
            },
            {
                example: '$topBitsCheerers[count, period, startDate]',
                description: 'Returns an array of the usernames up to the specified count, of the users who have cheered the most bits in the streamer\'s channel during the specified period that occurred on the specified date. Period can be \'day\', \'week\', \'month\', \'year\', or \'all\'.'
            }
        ]
    },

    '$topCurrency': {
        name: '$topCurrency',
        description: 'Comma separated list of users with the most of the given currency. Defaults to top 10, you can provide a custom number as a second argument.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$topCurrency[Points]',
                description: 'Returns comma-separated list of top 10 users with their Points amounts'
            },
            {
                example: '$topCurrency[Points, 5]',
                description: 'Returns comma-separated list of top 5 users with their Points amounts'
            }
        ]
    },

    '$topCurrencyUser': {
        name: '$topCurrencyUser',
        description: 'Get the username or amount for a specific position in the top currency',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$topCurrencyUser[Points, 1, username]',
                description: 'Get the top Points username'
            },
            {
                example: '$topCurrencyUser[Points, 5, amount]',
                description: 'Get the top Points amount at 5th position'
            }
        ]
    },

    '$topMetadata': {
        name: '$topMetadata',
        description: 'Comma separated list of users with the most of the given metadata key. Defaults to top 10, you can provide a custom number as a second argument.',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$topMetadata[deaths]',
                description: 'Returns comma-separated list of top 10 users with their death counts'
            },
            {
                example: '$topMetadata[deaths, 5]',
                description: 'Returns comma-separated list of top 5 users with their death counts'
            }
        ]
    },

    '$topMetadataUser': {
        name: '$topMetadataUser',
        description: 'Get the username or amount for a specific position in the top metadata list',
        category: VariableCategory.COMMON,
        examples: [
            {
                example: '$topMetadataUser[slaps, 1, username]',
                description: 'Get the username for the top slapper'
            },
            {
                example: '$topMetadataUser[slaps, 5, amount]',
                description: 'Get the number of slaps for the top 5th slapper'
            }
        ]
    },

    '$topViewTime': {
        name: '$topViewTime',
        description: 'Comma separated list of users with the most view time (in hours). Defaults to top 10, you can provide a custom number as a second argument.',
        category: VariableCategory.User
    },

    '$trim': {
        name: '$trim',
        description: 'Removes any whitespace from the beginning and end of input text.',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$trim[  text with spaces  ]',
                description: 'Returns "text with spaces" without leading or trailing spaces'
            }
        ]
    },

    '$trimEnd': {
        name: '$trimEnd',
        description: 'Removes any whitespace from the end of input text.',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$trimEnd[text]',
                description: 'Returns text with trailing whitespace removed'
            }
        ]
    },
    '$trimStart': {
        name: '$trimStart',
        description: 'Removes any whitespace from the beginning of input text.',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$trimStart[text]',
                description: 'Returns text with leading whitespace removed'
            }
        ]
    },
    '$true': {
        name: '$true',
        description: 'Returns a literal true boolean value; Useful in comparisons such as in $if[]',
        category: VariableCategory.Logic
    },
    '$twitchChannelUrl': {
        name: '$twitchChannelUrl',
        description: 'Returns the Twitch URL for the given channel name.',
        category: VariableCategory.Channel,
        examples: [
            {
                example: '$twitchChannelUrl[channelName]',
                description: 'Returns full Twitch URL for the specified channel'
            }
        ]
    },
    '$unixTimestamp': {
        name: '$unixTimestamp',
        description: 'The current date formatted as seconds since January 1, 1970 00:00:00 UTC',
        category: VariableCategory.Time,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$unixTimestamp[2011-03-18 18:49 UTC]',
                description: 'Unix timestamp for provided date'
            },
            {
                example: '$unixTimestamp[07/28/2024, MM/DD/YYYY]',
                description: 'Unix timestamp for provided date with specified format'
            },
            {
                example: '$unixTimestamp[$accountCreationDate]',
                description: 'Unix timestamp for provided account creation date'
            },
            {
                example: '$unixTimestamp[$date[MMM Do YYYY, -14, days], MMM Do YYYY]',
                description: 'Unix timestamp for date variable set to 2 weeks ago formatted as MMM Do YYYY'
            }
        ]
    },
    '$uppercase': {
        name: '$uppercase',
        description: 'Makes the entire given text string uppercase.',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$uppercase[Some Text]',
                description: 'Returns "SOME TEXT"'
            }
        ]
    },
    '$uptime': {
        name: '$uptime',
        description: 'The current stream uptime',
        category: VariableCategory.Channel
    },
    '$user': {
        name: '$user',
        description: 'The associated user (if there is one) for the given trigger',
        category: VariableCategory.User
    },
    '$userAvatarUrl': {
        name: '$userAvatarUrl',
        description: 'Gets the url for the avatar of the associated user (Ie who triggered command, pressed button, etc).',
        aliases: ['$userProfileImageUrl'],
        category: VariableCategory.User,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$userAvatarUrl[$target]',
                description: 'When in a command, gets the the url for the avatar of the target user.'
            },
            {
                example: '$userAvatarUrl[ebiggz]',
                description: 'Gets the url for the avatar of a specific user.'
            }
        ]
    },
    '$userBadgeUrls': {
        name: '$userBadgeUrls',
        description: 'Outputs the URLs of a chatter\'s selected badge images from the associated command or event.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$userBadgeUrls[1]',
                description: 'Get the URL of a chatter\'s selected badge image.'
            }
        ]
    },
    '$userBio': {
        name: '$userBio',
        description: 'Gets the bio/description of the associated user (ie who triggered command, pressed button, etc).',
        aliases: ['$userAbout', '$userDescription'],
        category: VariableCategory.User,
        examples: [
            {
                example: '$userBio[$target]',
                description: 'When in a command, gets the the bio/description of the target user.'
            },
            {
                example: '$userBio[ebiggz]',
                description: 'Gets the bio/description of a specific user.'
            }
        ]
    },
    '$userDisplayName': {
        name: '$userDisplayName',
        description: 'Gets the formatted display name for the given username. Searches local viewer DB first, then Twitch API.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$userDisplayName[username]',
                description: 'Returns the formatted display name for the specified username'
            }
        ]
    },
    '$userExists': {
        name: '$userExists',
        description: 'Outputs \'true\' if a user exists in Firebot\'s database, \'false\' if not',
        category: VariableCategory.User,
        examples: [
            {
                example: '$userExists[username]',
                description: 'Returns true if the specified username exists in the database, false if not'
            }
        ]
    },
    '$userId': {
        name: '$userId',
        description: 'Gets the user ID for the given username. Searches local viewer DB first, then Twitch API.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$userId[username]',
                description: 'Returns the Twitch user ID for the specified username'
            }
        ]
    },
    '$userIsBanned': {
        name: '$userIsBanned',
        description: 'Returns true if the specified user is currently banned (not just timed out), otherwise returns false.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$userIsBanned[username]',
                description: 'Returns true if the specified user is banned, false otherwise'
            }
        ]
    },
    '$userIsTimedOut': {
        name: '$userIsTimedOut',
        description: 'Returns true if the specified user is currently timed out, otherwise returns false.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$userIsTimedOut[username]',
                description: 'Returns true if the specified user is timed out, false otherwise'
            }
        ]
    },
    '$userMetadata': {
        name: '$userMetadata',
        description: 'Get the metadata associated with the user.',
        category: VariableCategory.User,
        examples: [
            {
                example: '$userMetadata[username, metadataKey, defaultValue]',
                description: 'Provide a default value if one doesn\'t exist for the user.'
            },
            {
                example: '$userMetadata[username, metadataKey, null, propertyPath]',
                description: 'Provide a property path (using dot notation) or array index as a second argument.'
            }
        ]
    },
    '$useridname': {
        name: '$useridname',
        description: 'The associated underlying user identifying name for the given trigger',
        category: VariableCategory.User,
        deprecated: true,
        deprecatedMessage: 'Use $user or $username instead',
        replacedBy: '$user or $username'
    },
    '$username': {
        name: '$username',
        description: 'The associated user (if there is one) for the given trigger',
        category: VariableCategory.User
    },
    '$usernameArray': {
        name: '$usernameArray',
        description: 'Returns an array of all usernames saved in the user db',
        category: VariableCategory.User
    },
    '$videoDuration': {
        name: '$videoDuration',
        description: 'Attempts to retrieve the duration of a video file.',
        category: VariableCategory.File,
        examples: [
            {
                example: '$videoDuration["path/to/video.mp4"]',
                description: 'Returns the duration of the video file in seconds.'
            },
            {
                example: '$videoDuration["https://example.com/video.mp4"]',
                description: 'Returns the duration of the video file from a URL in seconds.'
            }
        ]
    },
    '$viewTime': {
        name: '$viewTime',
        description: 'Displays the view time (in hours) of a given viewer (leave blank to use current viewer)',
        category: VariableCategory.User,
        acceptsOptionalArguments: true,
        examples: [
            {
                example: '$viewTime',
                description: 'Returns view time for current viewer'
            },
            {
                example: '$viewTime[username]',
                description: 'Returns view time for specified viewer'
            }
        ]
    },
    '$viewerHasRank': {
        name: '$viewerHasRank',
        description: 'Whether the viewer has the specified rank in the specified rank ladder',
        category: VariableCategory.Rank,
        examples: [
            {
                example: '$viewerHasRank[username, rankLadderName, rankName]',
                description: 'Returns true if the specified user has the given rank in the specified ladder'
            }
        ]
    },
    '$viewerNamesInRank': {
        name: '$viewerNamesInRank',
        description: 'Returns a comma separated list of viewer names in the specified rank',
        category: VariableCategory.Rank,
        examples: [
            {
                example: '$viewerNamesInRank[rankLadderName, rankName]',
                description: 'Returns a comma-separated list of viewers who have the specified rank in the given ladder'
            }
        ]
    },
    '$viewerNextRank': {
        name: '$viewerNextRank',
        description: 'Returns the next rank in specified rank ladder for the user',
        category: VariableCategory.Rank,
        examples: [
            {
                example: '$viewerNextRank[username, rankLadderName]',
                description: 'Returns the name of the next rank the specified user can achieve in the given ladder'
            }
        ]
    },
    '$viewerRank': {
        name: '$viewerRank',
        description: 'Returns the viewers current rank name for the specified rank ladder',
        category: VariableCategory.Rank,
        examples: [
            {
                example: '$viewerRank[username, rankLadderName]',
                description: 'Returns the current rank name for the specified user in the given ladder'
            }
        ]
    },
    '$viewersInRankArray': {
        name: '$viewersInRankArray',
        description: 'Returns an array of viewer objects in the specified rank. Viewer object properties: _id, username, displayName',
        category: VariableCategory.Rank,
        examples: [
            {
                example: '$viewersInRankArray[rankLadderName, rankName]',
                description: 'Returns array of viewer objects for the specified rank'
            }
        ]
    },
    '$word': {
        name: '$word',
        description: 'Get a word at the specified position in a given sentence',
        category: VariableCategory.Text,
        examples: [
            {
                example: '$word[This is a test, 4]',
                description: 'Get the 4th word. In this example: \'test\''
            }
        ]
    }
};
function compareObjectArrays(obj1: any, obj2: any) {
    let obj1string = JSON.stringify(obj1);
    let obj2string = JSON.stringify(obj2);
    //console.log(obj1string)
    //console.log(obj2string)
    //console.log(obj1string === obj2string)
    return obj1string === obj2string;
}
(async () => {
    await assignToGlobal();
    console.log(variableData); // Ensures `variableData` is logged after assignment
    FIREBOT_VARIABLES = variableData ? variableData : internalVariables
    let items: any[] = [];
    Object.entries(FIREBOT_VARIABLES).forEach(([varName, varInfo]) => {
        Object.entries(internalVariables).forEach(([iVarName, iVarInfo]) => {
            if (varName == iVarName) {
                if (!compareObjectArrays(varInfo.examples, iVarInfo.examples)) {

                    // console.log(varName)
                    // console.log(iVarInfo.examples)
                    // console.log(varInfo.examples)
                    //console.log(iVarInfo)
                    let iExamples = iVarInfo.examples
                    let eExamples = varInfo.examples
                    const item = { varName, iExamples, eExamples };
                    items.push(item);
                }
            }
        });
    });

    const data = new Uint8Array(Buffer.from(JSON.stringify(items, null, 4)));
    writeFile("c:\\temp\\firebotvardump.txt", data, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
    //console.log(items);
})();

// Export useful groupings of variables
export const NESTABLE_VARIABLES = Object.keys(FIREBOT_VARIABLES).filter(
    key => FIREBOT_VARIABLES[key].acceptsNesting === true
);

export const DEFAULT_REQUIRED_VARIABLES = Object.keys(FIREBOT_VARIABLES).filter(
    key => FIREBOT_VARIABLES[key].requiresDefault === true
);

export const DEPRECATED_VARIABLES = Object.keys(FIREBOT_VARIABLES).filter(
    key => FIREBOT_VARIABLES[key].deprecated === true
);

export const VARIABLES_BY_CATEGORY = Object.values(VariableCategory).reduce((acc, category) => {
    acc[category] = Object.keys(FIREBOT_VARIABLES).filter(
        key => FIREBOT_VARIABLES[key].category === category
    );
    return acc;
}, {} as Record<VariableCategory, string[]>);