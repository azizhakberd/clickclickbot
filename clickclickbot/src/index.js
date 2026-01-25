/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Bot, Context, webhookCallback } from "grammy";
const telegramifyMarkdown = require("telegramify-markdown")
import * as messageBank from "./messageBank";

const MODEL_LLAMA_3_1_8b_instruct = "@cf/meta/llama-3.1-8b-instruct"
let defaultLLMModel = MODEL_LLAMA_3_1_8b_instruct;

export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      return new Response(messageBank.botShareLink)
    }

    const bot = new Bot(env.BOT_API_KEY);

    /*bot.on("message", async (ctx) => {
      bot.api.sendMessage(1062529576, JSON.stringify(ctx))
    })*/

    bot.command("start", async (ctx) => {
      await ctx.reply(messageBank.usageGuide);
    });

    bot.command("myid", async (ctx) => {
      await ctx.reply(ctx.message.from.id)
    })

    bot.command("ask", async(ctx) => {
      
      const message = ctx.match ?? ""

      // generate reply message
      
      // input valid, inform user that message will be sent soon
      await ctx.reply(messageBank.llmProcessStart, {
        reply_parameters: {message_id: ctx.msg.message_id}
      })

      // outputs markdown text
      const response = await env.AI.run(defaultLLMModel, {
        prompt: message
      })

      // convert markdown output into Telegram compatible one
      let mdV2text = telegramifyMarkdown(response.response, "remove")

      await ctx.reply(mdV2text, {
          parse_mode: "MarkdownV2",
          reply_parameters: {message_id: ctx.msg.message_id}
        })
    })

    // reply was sent

    return webhookCallback(bot, "cloudflare-mod")(request);
  },
};