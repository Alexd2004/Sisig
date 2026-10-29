import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Button } from '@sisig/ui';
import { SUPPORTED_LANGUAGES } from '@sisig/claude';

type Language = typeof SUPPORTED_LANGUAGES[number];

interface TranslationState {
  original: string;
  translated: string;
  sourceLanguage: Language;
  targetLanguage: Language;
}

export default function AITranslatorScreen(): JSX.Element {
  const [input, setInput] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] = useState<Language>('English');
  const [targetLanguage, setTargetLanguage] = useState<Language>('Spanish');
  const [result, setResult] = useState<TranslationState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState<boolean>(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState<boolean>(false);

  const handleTranslate = async (): Promise<void> => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      // Placeholder translation - replace with actual Claude API call
      const translation = `[Translated to ${targetLanguage}]
${input}

To enable actual translations, set ANTHROPIC_API_KEY and use:
const { translateText } = require('@sisig/claude');
const result = await translateText(input, sourceLanguage, targetLanguage);`;

      setResult({
        original: input,
        translated: translation,
        sourceLanguage,
        targetLanguage,
      });
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapLanguages = (): void => {
    const temp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(temp);
  };

  const handleClear = (): void => {
    setInput('');
    setResult(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.languageSelector}>
        <View style={styles.languageControl}>
          <Text style={styles.label}>From</Text>
          <Pressable
            style={styles.languageButton}
            onPress={() => setShowSourceDropdown(!showSourceDropdown)}
          >
            <Text style={styles.languageButtonText}>{sourceLanguage}</Text>
          </Pressable>
          {showSourceDropdown && (
            <View style={styles.dropdown}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <Pressable
                  key={lang}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSourceLanguage(lang);
                    setShowSourceDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{lang}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Button title="⇄" onPress={handleSwapLanguages} style={styles.swapButton} />

        <View style={styles.languageControl}>
          <Text style={styles.label}>To</Text>
          <Pressable
            style={styles.languageButton}
            onPress={() => setShowTargetDropdown(!showTargetDropdown)}
          >
            <Text style={styles.languageButtonText}>{targetLanguage}</Text>
          </Pressable>
          {showTargetDropdown && (
            <View style={styles.dropdown}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <Pressable
                  key={lang}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setTargetLanguage(lang);
                    setShowTargetDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{lang}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Original Text</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter text to translate..."
          value={input}
          onChangeText={setInput}
          multiline
          editable={!loading}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Translate"
          onPress={handleTranslate}
          style={styles.button}
        />
        <Button
          title="Clear"
          onPress={handleClear}
          style={styles.button}
        />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Translating...</Text>
        </View>
      )}

      {result && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Translated Text ({result.targetLanguage})</Text>
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{result.translated}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  languageControl: {
    flex: 1,
    position: 'relative',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  languageButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  swapButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownText: {
    fontSize: 14,
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
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    color: '#666',
  },
  resultBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
});
