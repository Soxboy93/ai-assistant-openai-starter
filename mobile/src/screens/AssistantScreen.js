import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { assistantApi } from '../services/api';
import { colors, radius, spacing } from '../utils/theme';

const SUGGESTIONS = [
  'How am I doing with my budget this month?',
  'Where am I spending the most?',
  'How can I improve my savings rate?',
  'Give me tips to reduce my expenses.',
];

export default function AssistantScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI financial assistant 💰 I can see your accounts and transactions. Ask me anything about your finances!" },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  async function send(text) {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');

    const updated = [...messages, { role: 'user', content: userMsg }];
    setMessages(updated);
    setLoading(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Send only the non-system messages (no system context needed — backend adds it)
      const payload = updated.filter(m => m.role !== 'system');
      const { data } = await assistantApi.chat(payload);
      setMessages([...updated, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages([...updated, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {item.role === 'assistant' && <Text style={styles.aiAvatar}>🤖</Text>}
            <View style={[styles.bubbleContent, item.role === 'user' ? styles.userContent : styles.aiContent]}>
              <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.aiText]}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={[styles.bubble, styles.aiBubble]}>
              <Text style={styles.aiAvatar}>🤖</Text>
              <View style={styles.aiContent}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Suggestions (only shown when empty) */}
      {messages.length === 1 && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} style={styles.suggestion} onPress={() => send(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder="Ask about your finances..."
          placeholderTextColor={colors.textLight}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send()} disabled={!input.trim() || loading}>
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: colors.bg },
  list:        { padding: spacing.md, paddingBottom: spacing.md },
  bubble:      { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end' },
  userBubble:  { justifyContent: 'flex-end' },
  aiBubble:    { justifyContent: 'flex-start' },
  aiAvatar:    { fontSize: 22, marginRight: 8, marginBottom: 2 },
  bubbleContent: { maxWidth: '80%', borderRadius: radius.lg, padding: spacing.sm + 4 },
  userContent: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  aiContent:   { backgroundColor: colors.card, borderBottomLeftRadius: 4, minWidth: 48, minHeight: 32 },
  bubbleText:  { fontSize: 15, lineHeight: 22 },
  userText:    { color: '#fff' },
  aiText:      { color: colors.text },
  suggestions: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  suggestion:  { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  suggestionText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.sm, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  inputField:  { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 120 },
  sendBtn:     { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendIcon:    { color: '#fff', fontSize: 20, fontWeight: '700' },
});
