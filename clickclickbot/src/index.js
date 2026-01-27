import { Bot, Context, GrammyError, webhookCallback } from "grammy";
const telegramifyMarkdown = require("telegramify-markdown")
import * as messageBank from "./messageBank";
import { Group, GroupModel } from "./db";

const MODEL_LLAMA_3_1_8b_instruct = "@cf/meta/llama-3.1-8b-instruct"
let defaultLLMModel = MODEL_LLAMA_3_1_8b_instruct;

export default {
    async fetch(request, env, ctx) {
        if (request.method === "GET") {
            return new Response(messageBank.botShareLink)
        }

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

        bot.command("ask", async ctx => {

            // identify chat where request is coming from
            switch (ctx.message.chat.type) {
                case "private":
                    handleDMAsk(ctx, env)
                    break;
                case "group":
                case "supergroup":
                    handleGroupAsk(ctx, env)
                    break;
                default:
                    break;
            }


        })

        // For development purposes: flush all unserved API messages
        // bot.on("message", async (ctx) => {
        //     await bot.api.sendMessage(env.BOT_OWNER_ID, JSON.stringify(ctx))
        // })

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

async function generateLLMResponse(prompt, ctx, env, group = null, systemRole = "") {
    await ctx.reply(messageBank.llmProcessStart, {
        reply_parameters: { message_id: ctx.msg.message_id }
    })

    // Build the messages array with system role if provided
    let messages = [];
    if (systemRole) {
        messages.push({ role: "system", content: systemRole });
    }
    messages.push({ role: "user", content: prompt });

    // outputs markdown text
    const response = await env.AI.run(defaultLLMModel, {
        messages: messages
    })

    // convert markdown output into Telegram compatible one
    let mdV2text = telegramifyMarkdown(response.response, "remove")

    const result = await ctx.reply(mdV2text, {
        parse_mode: "MarkdownV2",
        reply_parameters: { message_id: ctx.msg.message_id }
    })

    // Update lastMessageTime for group chats
    if (group != null) {
        group.lastMessageTime = new Date().getTime();
        await GroupModel.store(group, env, true);
    }

    return result
}

async function handleDMAsk(ctx, env) {
    let prompt;

    if (ctx.message.reply_to_message?.text)
        if (ctx.message.reply_to_message.from.id == env.BOT_SELF_ID)
            prompt = `You said "${ctx.message.reply_to_message}"\n${ctx.match ?? ""}`
        else
            prompt = `I said "${ctx.message.reply_to_message}"\n${ctx.match ?? ""}`
    else
        prompt = ctx.match ?? ""

    await generateLLMResponse(prompt, ctx, env)
}

async function handleGroupAsk(ctx, env) {
    // Check if bot is in the group and enabled
    let group = await Group.getGroupByID(ctx.chat.id, env);
    
    if (group == null) {
        return;
    }
    
    if (group.hasLeft) {
        // Flip the hasLeft flag back to 0
        group.hasLeft = 0;
        group.lastMessageTime = new Date().getTime();
    }
    
    if (!group.isEnabled) {
        return;
    }

    let prompt;

    if (ctx.message.reply_to_message?.text)
        if (ctx.message.reply_to_message.from.id == env.BOT_SELF_ID)
            prompt = `You said "${ctx.message.reply_to_message.text}"\n${ctx.match ?? ""}`
        else
            prompt = `Someone said "${ctx.message.reply_to_message.text}"\n${ctx.match ?? ""}`
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