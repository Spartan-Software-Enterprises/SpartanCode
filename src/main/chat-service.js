function createChatService(store) {
  return {
    history() {
      return store.chatMessages();
    },
    send(content) {
      const prompt = String(content || "").trim();
      if (!prompt) throw new Error("Message is required");
      store.addChatMessage("user", prompt);
      const response = `I’m ready to turn that into a mission. I’ll keep the work local-first, show the plan before execution, and ask for approval before external changes.`;
      store.addChatMessage("assistant", response);
      return { response, history: store.chatMessages() };
    },
  };
}

module.exports = { createChatService };
