import { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, Text, TextInput, useAppColors, useThemedStyles, type AppColors } from '@sisig/ui';

interface SummaryResult {
  original: string;
  summary: string;
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
    summaryBox: {
      backgroundColor: c.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    summaryText: {
      fontSize: 14,
      lineHeight: 20,
    },
    statsText: {
      fontSize: 12,
      color: c.foregroundMuted,
      marginTop: 4,
    },
  });

export default function AISummarizerScreen(): JSX.Element {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const colors = useAppColors();
  const styles = useThemedStyles(createStyles);

  const handleSummarize = async (): Promise<void> => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      // Simulated summary - replace with actual Claude API call
      const summary = `This is a placeholder summary of the provided text.
To use Claude, set ANTHROPIC_API_KEY environment variable and call the Claude API.

Key points would appear here after processing the input text.`;

      setResult({
        original: input,
        summary,
      });
    } catch (error) {
      console.error('Failed to summarize:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = (): void => {
    setInput('');
    setResult(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Original Text</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Paste text to summarize..."
          value={input}
          onChangeText={setInput}
          multiline
          editable={!loading}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Summarize" onPress={handleSummarize} style={styles.button} />
        <Button title="Clear" onPress={handleClear} style={styles.button} />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Summarizing...</Text>
        </View>
      )}

      {result && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{result.summary}</Text>
          </View>
          <Text style={styles.statsText}>Original: {result.original.length} characters</Text>
          <Text style={styles.statsText}>Summary: {result.summary.length} characters</Text>
          <Text style={styles.statsText}>
            Compression:{' '}
            {(
              ((result.original.length - result.summary.length) / result.original.length) *
              100
            ).toFixed(1)}
            %
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
