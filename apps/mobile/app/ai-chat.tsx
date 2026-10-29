import { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, Text, TextInput, useAppColors, useThemedStyles, type AppColors } from '@sisig/ui';
import { ConversationManager } from '@sisig/claude';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    messagesContent: {
      paddingVertical: 16,
    },
    messageBubble: {
      marginVertical: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      maxWidth: '85%',
    },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: c.primary,
    },
    assistantBubble: {
      alignSelf: 'flex-start',
      backgroundColor: c.bubble,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 20,
    },
    userText: {
      color: c.primaryForeground,
    },
    assistantText: {
      color: c.bubbleForeground,
    },
    loadingContainer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 12,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: c.background,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      maxHeight: 100,
    },
    sendButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
  });

export default function AIChatScreen(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const conversationManager = useRef(new ConversationManager()).current;
  const colors = useAppColors();
  const styles = useThemedStyles(createStyles);

  const scrollToBottom = (): void => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (): Promise<void> => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    conversationManager.addMessage('user', input);
    setInput('');
    setLoading(true);

    try {
      // Simulated Claude response - replace with actual API call
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content:
          'This is a placeholder response. To use Claude, set ANTHROPIC_API_KEY environment variable.',
      };

      conversationManager.addMessage('assistant', assistantMessage.content);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get response:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Claude AI Chat</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.role === 'user' ? styles.userText : styles.assistantText,
              ]}
            >
              {msg.content}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={input}
          onChangeText={setInput}
          editable={!loading}
          multiline
        />
        <Button title="Send" onPress={handleSendMessage} style={styles.sendButton} />
      </View>
    </View>
  );
}
