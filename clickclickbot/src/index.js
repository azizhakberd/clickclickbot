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

export default {
  async fetch(request, env, ctx) {
    const bot = new Bot(env.BOT_API_KEY, { botInfo: JSON.parse(env.BOT_INFO) });

    bot.command("start", async (ctx) => {
      await ctx.reply("Hello, world!");
    });

    bot.command("llm", async(ctx) => {
      const message = ctx.match
      const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt: message
      })

      await ctx.reply(response.response)
    })

    return webhookCallback(bot, "cloudflare-mod")(request);
  },
};