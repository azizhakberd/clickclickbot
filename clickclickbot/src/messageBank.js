/* Guides */
export const usageGuide =
`You can add me to your group conversation and give the permission to send messages to participate in conversation with you`

/* Operating messages */
export const llmProcessStart = 
`Thinking`

export const llmEmpty =
`Failed to generate response`

export const emptyPromptMessage =
`Ask anything. Usage: /ask <text>`

export const groupCommandInDM =
`This command can only be used in groups`

export const noEntryFound =
`Failed to find entry of this group. Try removing this bot and adding it again`

export const insufficientClearance =
`You don't have sufficient clearance level`

export const unconfirmedClearance =
`I couldn't confirm the status the sender of the command. You may need to give this bot admin priveleges to proceed`

export const settingUpdate_systemBehavior =
`Behavior modified successfully`

export const botDisabled =
`Bot has been disabled in this group`

export const botEnabled =
`Bot has been enabled in this group`

export const botIsEnabled =
`Bot is currently enabled in this group`

export const botIsDisabled =
`Bot is currently disabled in this group`

export const invalidClearanceLevel =
`Invalid clearance level. Please use a number between 0 and 2`

export const clearanceLevelTooHigh =
`You cannot set a clearance level higher than your own`

export const clearanceRequirementUpdated =
`Clearance requirement updated successfully`

export const helpGuide = `
<b>🤖 Bot Commands Guide</b>

<b>General Commands (Available Everywhere):</b>
/start - Get started with the bot
/help - Show this help message
/ask &lt;text&gt; - Ask the AI a question

<b>Group Commands (Group/Supergroup Only):</b>

/teach &lt;behavior&gt; - Set the bot's system behavior/personality
/disable or /mute - Disable the bot in this group
/enable or /unmute - Enable the bot in this group
/setClearanceRequirement &lt;level&gt; - Set minimum clearance to use admin commands (0-2)
/getClearanceRequirement - Check current clearance requirement
/myClearance - Check your clearance level in this group
/isdisabled or /ismuted - Check if bot is enabled or disabled

<b>Clearance Levels:</b>
0️⃣ - Member (anyone can use commands)
1️⃣ - Admin (group admins only)
2️⃣ - Creator (group creator only)
3️⃣ - Bot Owner (bot owner only - higher than all others)
`

export const botShareLink = "AI chat bot https://t.me/aziz_clickclick_bot"