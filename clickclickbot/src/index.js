import { Bot, Context, GrammyError, webhookCallback } from "grammy";
const telegramifyMarkdown = require("telegramify-markdown")
import * as messageBank from "./messageBank";
import { Group, GroupModel } from "./db";

const MODEL_LLAMA_3_1_8b_instruct = "@cf/meta/llama-3.1-8b-instruct"
const MODEL_MISTRAL_SMALL_3_1_24b_instruct = "@cf/mistralai/mistral-small-3.1-24b-instruct"
let defaultLLMModel = MODEL_MISTRAL_SMALL_3_1_24b_instruct;

export default {
    async fetch(request, env, ctx) {
        if (request.method === "GET") {
            return new Response(messageBank.botShareLink)
        }

        // For development purposes: flush all unserved API messages
        // bot.on("message", async (ctx) => {
        //     await bot.api.sendMessage(env.BOT_OWNER_ID, JSON.stringify(ctx))
        // })

        const bot = new Bot(env.BOT_API_KEY);

        bot.command("start", async (ctx) => {
            await ctx.reply(messageBank.usageGuide);
            if (ctx.message.chat.type === "group" || ctx.message.chat.type === "supergroup") {
                let group = await Group.getGroupByID(ctx.chat.id, env);
                if (group != null) {
                    group.lastMessageTime = new Date().getTime();
                    await GroupModel.store(group, env, true);
                }
            }
        });

        // this command was left for development purposes
        bot.command("myid", async (ctx) => {
            await ctx.reply(ctx.message.from.id)
            if (ctx.message.chat.type === "group" || ctx.message.chat.type === "supergroup") {
                let group = await Group.getGroupByID(ctx.chat.id, env);
                if (group != null) {
                    group.lastMessageTime = new Date().getTime();
                    await GroupModel.store(group, env, true);
                }
            }
        })

        bot.command("ask", async (ctx) => {
            // await bot.api.sendMessage(env.BOT_OWNER_ID, "Received llm request")
            // await bot.api.sendMessage(env.BOT_OWNER_ID, JSON.stringify(ctx))
            // identify chat where request is coming from
            switch (ctx.msg.chat.type) {
                case "private":
                    await handleDMAsk(ctx, env)
                    break;
                case "group":
                case "supergroup":
                    await handleGroupAsk(ctx, env)
                    break;
                default:
                    await ctx.api.sendMessage(env.BOT_OWNER_ID, JSON.stringify(ctx))
                    break;
            }


        })

        bot.command("help", async (ctx) => {
            if (ctx.message.chat.type === "private" || ctx.message.chat.type === "group" || ctx.message.chat.type === "supergroup") {
                await ctx.reply(messageBank.helpGuide, {
                    parse_mode: "HTML",
                    reply_parameters: { message_id: ctx.msg.message_id }
                })
            }
        })

        // group commands

        bot.command("teach", async (ctx) => {

            if (ctx.chat.type != "group" && ctx.chat.type != "supergroup") {
                if (ctx.chat.type == "private") {
                    await ctx.reply(messageBank.groupCommandInDM, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                    return;
                }
            }

            let group = await Group.getGroupByID(ctx.chat.id, env)

            if (group == null) {
                await ctx.reply(messageBank.noEntryFound, {
                    reply_parameters: { message_id: ctx.msg.message_id }
                })
                return
            }

            if (group.hasLeft) {
                group.hasLeft = 0;
            }

            try {
                let clearance = await getClearance(group, ctx, env)
                if (clearance < group.commandOrder) {
                    await ctx.reply(messageBank.insufficientClearance, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                } else {
                    group.systemBehavior = ctx.match ?? ""
                    await ctx.reply(messageBank.settingUpdate_systemBehavior, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                }
            } catch (err) {
                if (err instanceof GrammyError) {
                    if (err.error_code == 403) {
                        group.hasLeft = 1;
                    }
                    else if (err.error_code == 400) {
                        await ctx.reply(messageBank.unconfirmedClearance, {
                            reply_parameters: { message_id: ctx.msg.message_id }
                        })
                    }
                }
            }

            await GroupModel.store(group, env, true);
            return;
        })

        bot.command(["disable", "mute"], async (ctx) => {
            if (ctx.chat.type != "group" && ctx.chat.type != "supergroup") {
                if (ctx.chat.type == "private") {
                    await ctx.reply(messageBank.groupCommandInDM, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                    return;
                }
            }

            let group = await Group.getGroupByID(ctx.chat.id, env)

            if (group == null) {
                await ctx.reply(messageBank.noEntryFound, {
                    reply_parameters: { message_id: ctx.msg.message_id }
                })
                return
            }

            if (group.hasLeft) {
                group.hasLeft = 0;
            }

            try {
                let clearance = await getClearance(group, ctx, env)
                if (clearance < group.commandOrder) {
                    await ctx.reply(messageBank.insufficientClearance, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                } else {
                    group.isEnabled = 0
                    await ctx.reply(messageBank.botDisabled, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                }
            } catch (err) {
                if (err instanceof GrammyError) {
                    if (err.error_code == 403) {
                        group.hasLeft = 1;
                    }
                    else if (err.error_code == 400) {
                        await ctx.reply(messageBank.unconfirmedClearance, {
                            reply_parameters: { message_id: ctx.msg.message_id }
                        })
                    }
                }
            }

            await GroupModel.store(group, env, true);
        })

        bot.command(["enable", "unmute"], async (ctx) => {
            if (ctx.chat.type != "group" && ctx.chat.type != "supergroup") {
                if (ctx.chat.type == "private") {
                    await ctx.reply(messageBank.groupCommandInDM, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                    return;
                }
            }

            let group = await Group.getGroupByID(ctx.chat.id, env)

            if (group == null) {
                await ctx.reply(messageBank.noEntryFound, {
                    reply_parameters: { message_id: ctx.msg.message_id }
                })
                return
            }

            if (group.hasLeft) {
                group.hasLeft = 0;
            }

            try {
                let clearance = await getClearance(group, ctx, env)
                if (clearance < group.commandOrder) {
                    await ctx.reply(messageBank.insufficientClearance, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                } else {
                    group.isEnabled = 1
                    await ctx.reply(messageBank.botEnabled, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                }
            } catch (err) {
                if (err instanceof GrammyError) {
                    if (err.error_code == 403) {
                        group.hasLeft = 1;
                    }
                    else if (err.error_code == 400) {
                        await ctx.reply(messageBank.unconfirmedClearance, {
                            reply_parameters: { message_id: ctx.msg.message_id }
                        })
                    }
                }
            }

            await GroupModel.store(group, env, true);
        })

        // members cannot set it higher than their own to avoid locking themselves off
        bot.command("setClearanceRequirement", async (ctx) => {
            if (ctx.chat.type != "group" && ctx.chat.type != "supergroup") {
                if (ctx.chat.type == "private") {
                    await ctx.reply(messageBank.groupCommandInDM, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                    return;
                }
            }

            let group = await Group.getGroupByID(ctx.chat.id, env)

            if (group == null) {
                await ctx.reply(messageBank.noEntryFound, {
                    reply_parameters: { message_id: ctx.msg.message_id }
                })
                return
            }

            if (group.hasLeft) {
                group.hasLeft = 0;
            }

            try {
                let clearance = await getClearance(group, ctx, env)
                if (clearance < group.commandOrder) {
                    await ctx.reply(messageBank.insufficientClearance, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                } else {
                    let newLevel = parseInt(ctx.match) ?? null;
                    const maxLevel = ctx.message.from.id == env.BOT_OWNER_ID ? 3 : 2;
                    if (newLevel === null || newLevel < 0 || newLevel > maxLevel) {
                        await ctx.reply(messageBank.invalidClearanceLevel, {
                            reply_parameters: { message_id: ctx.msg.message_id }
                        })
                    } else if (newLevel > clearance) {
                        await ctx.reply(messageBank.clearanceLevelTooHigh, {
                            reply_parameters: { message_id: ctx.msg.message_id }
                        })
                    } else {
                        group.commandOrder = newLevel
                        await ctx.reply(messageBank.clearanceRequirementUpdated, {
                            reply_parameters: { message_id: ctx.msg.message_id }
                        })
                    }
                }
            } catch (err) {
                if (err instanceof GrammyError) {
                    if (err.error_code == 403) {
                        group.hasLeft = 1;
                    }
                    else if (err.error_code == 400) {
                        await ctx.reply(messageBank.unconfirmedClearance, {
                            reply_parameters: { message_id: ctx.msg.message_id }
                        })
                    }
                }
            }

            await GroupModel.store(group, env, true);
        })

        bot.command("getClearanceRequirement", async (ctx) => {
            if (ctx.chat.type != "group" && ctx.chat.type != "supergroup") {
                if (ctx.chat.type == "private") {
                    await ctx.reply(messageBank.groupCommandInDM, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                    return;
                }
            }

            let group = await Group.getGroupByID(ctx.chat.id, env)

            if (group == null) {
                await ctx.reply(messageBank.noEntryFound, {
                    reply_parameters: { message_id: ctx.msg.message_id }
                })
                return
            }

            const levelNames = ["Member", "Admin", "Creator"];
            const levelDescription = levelNames[group.commandOrder] || "Unknown";
            await ctx.reply(`Current clearance requirement: ${levelDescription} (level ${group.commandOrder})`, {
                reply_parameters: { message_id: ctx.msg.message_id }
            })
        })

        bot.command("myClearance", async (ctx) => {
            if (ctx.chat.type != "group" && ctx.chat.type != "supergroup") {
                if (ctx.chat.type == "private") {
                    await ctx.reply(messageBank.groupCommandInDM, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                    return;
                }
            }

            let group = await Group.getGroupByID(ctx.chat.id, env)

            if (group == null) {
                await ctx.reply(messageBank.noEntryFound, {
                    reply_parameters: { message_id: ctx.msg.message_id }
                })
                return
            }

            try {
                let clearance = await getClearance(group, ctx, env)
                const levelNames = ["Member", "Admin", "Creator", "Bot Owner"];
                const levelDescription = levelNames[clearance] || "Unknown";
                await ctx.reply(`Your clearance level: ${levelDescription} (level ${clearance})`, {
                    reply_parameters: { message_id: ctx.msg.message_id }
                })
            } catch (err) {
                if (err instanceof GrammyError) {
                    if (err.error_code == 400) {
                        await ctx.reply(messageBank.unconfirmedClearance, {
                            reply_parameters: { message_id: ctx.msg.message_id }
                        })
                    }
                }
            }
        })

        // everyone can use it
        bot.command(["isdisabled", "ismuted"], async (ctx) => {
            if (ctx.chat.type != "group" && ctx.chat.type != "supergroup") {
                if (ctx.chat.type == "private") {
                    await ctx.reply(messageBank.groupCommandInDM, {
                        reply_parameters: { message_id: ctx.msg.message_id }
                    })
                    return;
                }
            }

            let group = await Group.getGroupByID(ctx.chat.id, env)

            if (group == null) {
                await ctx.reply(messageBank.noEntryFound, {
                    reply_parameters: { message_id: ctx.msg.message_id }
                })
                return
            }

            const status = group.isEnabled ? messageBank.botIsEnabled : messageBank.botIsDisabled;
            await ctx.reply(status, {
                reply_parameters: { message_id: ctx.msg.message_id }
            })
        })

        bot.on(":new_chat_members:me", async (ctx) => {
            // bot is added to a group

            // check if bot has already been in the group
            if (ctx.chat.type != "group" && ctx.chat.type != "supergroup") return;

            let group = await Group.getGroupByID(ctx.chat.id, env);

            if (group != null) {
                // if yes - update the properties and finish
                group.hasLeft = 0;
                group.lastMessageTime = new Date().getTime();
                try {
                    await retrieveAssociatedChannelData(group, ctx, env)
                } catch (err) {
                    if (err instanceof GrammyError && err.error_code == 403)
                        group.hasLeft = 1
                }

                await GroupModel.store(group, env, true);
                return;
            }


            // bot wasn't in the group - create new entry
            group = Group.create();
            group.ID = ctx.chat.id;
            group.lastMessageTime = new Date().getTime();
            setGroupDefaultFlags(group)

            try {
                await retrieveAssociatedChannelData(group, ctx, env)
            } catch (err) {
                if (err instanceof GrammyError && err.error_code == 403)
                    group.hasLeft = 1
            }
            await GroupModel.store(group, env);
        })

        bot.on(":left_chat_member:me", async (ctx) => {
            // flip the flag, do not delete the entry
            let group = await Group.getGroupByID(ctx.chat.id, env);
            if (group == null) return;
            group.hasLeft = 1;
            await GroupModel.store(group, env, true);
        })

        return webhookCallback(bot, "cloudflare-mod")(request);
    },
};

async function getClearance(group, ctx, env) {
    if (ctx.message.from.id == env.BOT_OWNER_ID) {
        return 3;
    }
    else {
        let clearance;
        if (group.isAssociatedWithChannel && ctx.message.sender_chat?.id == group.associatedChannelID || ctx.message.sender_chat?.id == ctx.chat.id) {
            if (group.isAnonymChannelAnAdmin) clearance = 1
            else clearance = 2
        } else {
            let memberInfo = await ctx.api.getChatMember(ctx.chat.id, ctx.message.from.id);
            switch (memberInfo.status) {
                case "creator":
                    clearance = 2
                    break;
                case "administrator":
                    clearance = 1
                    break;
                default:
                    clearance = 0
            }

        }
        return clearance;
    }
}


async function generateLLMResponse(prompt, ctx, env, group = null, systemRole = "") {
    //await ctx.api.sendMessage(env.BOT_OWNER_ID, "Generating response")

    if (!prompt) {
        await ctx.reply(messageBank.emptyPromptMessage, {
            reply_parameters: { message_id: ctx.msg.message_id }
        })
    } else {
        await ctx.reply(messageBank.llmProcessStart, {
            reply_parameters: { message_id: ctx.msg.message_id }
        })

        // Build the messages array with system role if provided
        let messages = [];
        messages.push({
            role: "system",
            content: "You are a bot created by Aziz and you are not very talkative and keep every answer a paragraph or two long.\n\n " + systemRole
        });
        messages.push({ role: "user", content: prompt });

        // outputs markdown text
        const response = await env.AI.run(defaultLLMModel, {
            messages: messages,
        })

        // convert markdown output into Telegram compatible one
        let mdV2text = telegramifyMarkdown(response.response, "remove")

        await ctx.reply(mdV2text ?? messageBank.llmEmpty, {
            parse_mode: "MarkdownV2",
            reply_parameters: { message_id: ctx.msg.message_id }
        })
    }

    // Update lastMessageTime for group chats
    if (group != null) {
        group.lastMessageTime = new Date().getTime();
        await GroupModel.store(group, env, true);
    }
}

async function handleDMAsk(ctx, env) {
    //await ctx.api.sendMessage(env.BOT_OWNER_ID, "Detected request in direct messages")

    let prompt;

    if (ctx.message.reply_to_message?.text) {
        if (ctx.message.reply_to_message.from.id == env.BOT_SELF_ID)
            prompt = `You said "${ctx.message.reply_to_message}"\n${ctx.match ?? ""}`
        else
            prompt = `I said "${ctx.message.reply_to_message}"\n${ctx.match ?? ""}`
    }
    else
        prompt = ctx.match ?? ""

    await generateLLMResponse(prompt, ctx, env)
}

async function handleGroupAsk(ctx, env) {
    // await ctx.api.sendMessage(env.BOT_OWNER_ID, "Detected group request")
    // Check if bot is in the group and enabled
    let group = await Group.getGroupByID(ctx.chat.id, env);

    if (group == null) {
        await ctx.reply(messageBank.noEntryFound, {
            reply_parameters: { message_id: ctx.msg.message_id }
        })
        return;
    }

    if (group.hasLeft) {
        // Flip the hasLeft flag back to 0
        group.hasLeft = 0;
    }

    if (!group.isEnabled) {
        return;
    }

    let prompt;

    if (ctx.message.reply_to_message?.text) {
        if (ctx.message.reply_to_message.from.id == env.BOT_SELF_ID)
            prompt = `You said "${ctx.message.reply_to_message.text}"\n${ctx.match ?? ""}`
        else
            prompt = `Someone said "${ctx.message.reply_to_message.text}"\n${ctx.match ?? ""}`
    }
    else
        prompt = ctx.match ?? ""

    await generateLLMResponse(prompt, ctx, env, group, group.systemBehavior)
}

async function retrieveAssociatedChannelData(group, ctx, env) {
    let details = await ctx.api.getChat(group.ID)

    if (details.linked_chat_id) {
        group.isAssociatedWithChannel = 1;
        group.associatedChannelID = details.linked_chat_id;
    } else {
        group.isAssociatedWithChannel = 0;
        group.associatedChannelID = 0;
    }
}

function setGroupDefaultFlags(group) {
    group.numberOfFlags = 6
    group.isEnabled = 1
    group.hasLeft = 0
    group.commandOrder = 1
    group.isAssociatedWithChannel = 0
    group.isAnonymChannelAnAdmin = 0
}