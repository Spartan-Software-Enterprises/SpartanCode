import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { chatStyles, sharedStyles, colors } from "./styles";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

const STORAGE_KEY = "spartancode.chat.messages";

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "agent",
    content:
      "What are we building? Describe your goal in plain language and I'll plan, build, and verify it with multi-agent orchestration.",
    timestamp: Date.now() - 1000,
  },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    loadPersistedMessages();
  }, []);

  const loadPersistedMessages = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(stored) && stored.length > 0) {
          setMessages(stored);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const persistMessages = async (msgs: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    } catch {}
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    persistMessages(newMessages);
    setInput("");

    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 800));

    const agentResponse = generateAgentResponse(text);
    const agentMessage: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: "agent",
      content: agentResponse,
      timestamp: Date.now(),
    };

    const finalMessages = [...newMessages, agentMessage];
    setMessages(finalMessages);
    persistMessages(finalMessages);
    setIsTyping(false);
  }, [input, messages]);

  const generateAgentResponse = (userInput: string): string => {
    const lower = userInput.toLowerCase();
    if (lower.includes("plan") || lower.includes("architect")) {
      return "I'll create a comprehensive system architecture plan. Let me break this down into structured phases with clear milestones and deliverables.";
    }
    if (
      lower.includes("build") ||
      lower.includes("implement") ||
      lower.includes("code")
    ) {
      return "I'll implement this with clean, tested modules. The agent swarm will handle the implementation with proper type safety and validation.";
    }
    if (lower.includes("verify") || lower.includes("test")) {
      return "I'll run the full test matrix, linter, and validation suite to ensure zero regressions. All checks will pass before completion.";
    }
    if (lower.includes("audit") || lower.includes("security")) {
      return "I'll scan security boundaries and export a governance audit. Redacted audit log will be available for review.";
    }
    return `Understood: "${userInput}". I'm queuing this as a mission. The agent swarm will analyze requirements and begin planning.`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={chatStyles.container}>
        <View style={sharedStyles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={chatStyles.container}>
      <ScrollView
        style={chatStyles.messagesContainer}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {messages.map((msg) => (
          <View key={msg.id} style={chatStyles.messageWrapper}>
            <View
              style={[
                chatStyles.messageBubble,
                msg.role === "user"
                  ? chatStyles.userBubble
                  : chatStyles.agentBubble,
              ]}
            >
              <Text style={chatStyles.messageText}>{msg.content}</Text>
            </View>
          </View>
        ))}
        {isTyping && (
          <View style={chatStyles.messageWrapper}>
            <View style={[chatStyles.messageBubble, chatStyles.agentBubble]}>
              <View style={localStyles.typingIndicator}>
                <View style={localStyles.typingDot} />
                <View style={localStyles.typingDot} />
                <View style={localStyles.typingDot} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={chatStyles.composerContainer}>
        <View style={chatStyles.composerRow}>
          <TextInput
            style={chatStyles.composerInput}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            placeholder="Describe your mission... ( / for commands, @ to mention)"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
          />
          <Pressable
            style={chatStyles.sendButton}
            onPress={sendMessage}
            disabled={!input.trim() || isTyping}
          >
            <Text
              style={{
                color: colors.textInverted,
                fontSize: 20,
                fontWeight: "800",
              }}
            >
              ↑
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  typingIndicator: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
});
