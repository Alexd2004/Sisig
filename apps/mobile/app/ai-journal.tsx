import { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, Text, TextInput, useAppColors, useThemedStyles, type AppColors } from '@sisig/ui';

interface JournalEntry {
  id: string;
  content: string;
  insights: string;
  timestamp: number;
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    textInput: {
      backgroundColor: c.surface,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      minHeight: 150,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: c.border,
    },
    buttonContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 16,
    },
    button: {
      flex: 1,
    },
    loadingContainer: {
      padding: 32,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: c.foregroundMuted,
    },
    entryCard: {
      backgroundColor: c.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    entryDate: {
      fontSize: 12,
      color: c.placeholder,
      marginBottom: 8,
    },
    entryContent: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    insightsContainer: {
      backgroundColor: c.surfaceMuted,
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
      paddingLeft: 12,
      paddingVertical: 8,
    },
    insightsTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: c.primary,
      marginBottom: 6,
    },
    insightsText: {
      fontSize: 13,
      lineHeight: 18,
      color: c.foregroundMuted,
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: 16,
      color: c.placeholder,
      textAlign: 'center',
    },
  });

export default function AIJournalScreen(): JSX.Element {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const colors = useAppColors();
  const styles = useThemedStyles(createStyles);

  const handleSaveEntry = async (): Promise<void> => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      // Placeholder insights - replace with actual Claude API call
      const insights = `Key themes in your entry:
- Emotion: Thoughtful and reflective
- Topics: Personal growth, learning
- Sentiment: Positive with room for improvement

To enable real insights, use:
const { ClaudeClient } = require('@sisig/claude');
const client = new ClaudeClient();
const insights = await client.generateText(
  \`Analyze this journal entry and provide 3 key insights: \${input}\`,
  { maxTokens: 500 }
);`;

      const newEntry: JournalEntry = {
        id: `entry-${Date.now()}`,
        content: input,
        insights,
        timestamp: Date.now(),
      };

      setEntries((prev) => [newEntry, ...prev]);
      setInput('');
    } catch (error) {
      console.error('Failed to save entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = (): void => {
    setInput('');
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Thoughts</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Write your thoughts, feelings, or experiences..."
          value={input}
          onChangeText={setInput}
          multiline
          editable={!loading}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Save & Analyze" onPress={handleSaveEntry} style={styles.button} />
        <Button title="Clear" onPress={handleClear} style={styles.button} />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing your thoughts...</Text>
        </View>
      )}

      {entries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Journal Entries ({entries.length})</Text>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <Text style={styles.entryDate}>{formatDate(entry.timestamp)}</Text>
              <Text style={styles.entryContent} numberOfLines={3}>
                {entry.content}
              </Text>
              <View style={styles.insightsContainer}>
                <Text style={styles.insightsTitle}>Claude Insights:</Text>
                <Text style={styles.insightsText}>{entry.insights}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {entries.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Start writing to get AI-powered insights on your thoughts and feelings
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
