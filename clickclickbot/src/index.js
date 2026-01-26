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
        });

        // this command was left for development purposes
        bot.command("myid", async (ctx) => {
            await ctx.reply(ctx.message.from.id)
        })

        bot.command("ask", async (ctx) => {

            const message = ctx.match ?? ""

            // generate reply message

            // input valid, inform user that message will be sent soon
            await ctx.reply(messageBank.llmProcessStart, {
                reply_parameters: { message_id: ctx.msg.message_id }
            })

            // outputs markdown text
            const response = await env.AI.run(defaultLLMModel, {
                prompt: message
            })

            // convert markdown output into Telegram compatible one
            let mdV2text = telegramifyMarkdown(response.response, "remove")

            await ctx.reply(mdV2text, {
                parse_mode: "MarkdownV2",
                reply_parameters: { message_id: ctx.msg.message_id }
            })

            // reply was sent
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
                group.isEnabled = true;
                group.lastMessageTime = new Date().getTime();

                let details;
                try {
                    details = await ctx.api.getChat(group.ID)
                } catch (err) {
                    if (err instanceof GrammyError) {
                        if (err.error_code == 403) { // bot was kicked from chat
                            group.hasLeft = 1;
                            let result = await GroupModel.store(group, env, true);
                            return;
                        }
                    }
                }
                if (details?.linked_chat_id) {
                    group.isAssociatedWithChannel = 1;
                    group.associatedChannelID = details.linked_chat_id;
                } else {
                    group.isAssociatedWithChannel = 0;
                    group.associatedChannelID = 0;
                }
                let result = await GroupModel.store(group, env, true);
                return;
            }


            // bot wasn't in the group - create new entry
            group = Group.create();
            group.ID = ctx.chat.id;
            group.lastMessageTime = new Date().getTime();
            setGroupDefaultFlags(group)

            let details;
            try {
                details = await ctx.api.getChat(group.ID)
            } catch (err) {
                if (err instanceof GrammyError) {
                    if (err.error_code == 403) { // bot was kicked from chat
                        group.hasLeft = 1;
                        let result = await GroupModel.store(group, env);
                        return;
                    }
                }
            }
            if (details?.linked_chat_id) {
                group.isAssociatedWithChannel = 1;
                group.associatedChannelID = details.linked_chat_id;
            } else {
                group.isAssociatedWithChannel = 0;
                group.associatedChannelID = 0;
            }
            let result = await GroupModel.store(group, env);
        })

        bot.on(":left_chat_member:me", async (ctx) => {
            // flip the flag, do not delete the entry
            let group = await Group.getGroupByID(ctx.chat.id, env);
            if (group == null) return;
            group.hasLeft = 1;
            let result = await GroupModel.store(group, env, true);
        })

        return webhookCallback(bot, "cloudflare-mod")(request);
    },
};

function setGroupDefaultFlags(group) {
    group.numberOfFlags = 6
    group.isEnabled = 1
    group.hasLeft = 0
    group.commandOrder = 1
    group.isAssociatedWithChannel = 0
    group.isAnonymChannelAnAdmin = 0
}