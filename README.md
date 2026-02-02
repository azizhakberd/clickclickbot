# WorkerAI based telegram bot
### If you wish to fork this repo follow these steps:

0. Prequisites: install Node.js and make a cloudflare account
1. Create a new telegram bot via @BotFather (refer to the instruction provided by telegram), save the telegram bot API token:
2. Create a worker (via wrangler or dashboard) and get the public URL address
3. Create a webhook via curl ```POST https://api.telegram.org/bot<your_bot_token>/setWebhook?url={your_worker__url}``` (you can also customize what updates you want to receive)
4. Fork this repository
5. Create AI and D1 bindings, run ```schema.sql``` against your database
6. In ```wranger.jsonc``` change the respective AI and D1 bindings as well as personalizing the environmental variables ```BOT_OWNER_ID```, ```BOT_SELF_ID``` etc. You can find them by using telegram API
7. Create a secret ```BOT_API_KEY``` and store your bot API token there

You are all set. Run ```npx wrangler deploy``` and send ```/start``` command to your bot
