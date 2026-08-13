const { createBot, setupWebhooks } = require("botfather");

function createChatBot(token) {
  const bot = createBot(token);

  bot.on("message", (message) => {
    const text = message.text;

    if (text && text.startsWith("/")) {
      // Handle commands
      console.log(`Command received: ${text}`);
      return;
    }

    // Process AI response
    console.log(`AI response to: ${text}`);
  });

  setupWebhooks(bot);
  return bot;
}

module.exports = { createChatBot };
