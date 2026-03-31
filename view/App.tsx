import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';

// --- Types ---
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

interface ApiResponse {
  reply: string;
}

// --- Configuration ---
// ضع رابط ngrok الجديد هنا
const API_ENDPOINT = 'https://karan-pseudooriental-callum.ngrok-free.dev/chat';

// --- Helper Function: Advanced AI Response Cleaner ---
const cleanBotResponse = (rawText: string): string => {
  if (!rawText) return '';

  let cleanedText = rawText
    // 1. إزالة كل الـ Tokens الخاصة بالنماذج (مثل <|endoftext|> أو <|/bl> أو <|/blockquote|>)
    .replace(/<\s*\|[^>]*>?/gi, '')

    // 2. إزالة أي بقايا لكلمات برمجية أو وسوم HTML
    .replace(/<\/?blockquote>/gi, '')
    .replace(/>?ChatDoctorCom/gi, '')

    // 3. إزالة الجمل الترحيبية والختامية المزعجة أو المكررة للنموذج
    .replace(/Thanks for calling Chat Doctor\.?\s*Forum\.?/gi, '')
    .replace(/Hi welcome to Chat Doctor forum\.?/gi, '')

    // 4. تنظيف علامات التنسيق الخاطئة مثل **
    .replace(/\*\*/g, '')

    // 5. إزالة المسافات والأسطر الفارغة الزائدة التي تتركها عملية التنظيف
    .replace(/\n{3,}/g, '\n\n') // تحويل الأسطر الفارغة الكثيرة إلى سطرين كحد أقصى
    .replace(/\s{2,}/g, ' ') // تحويل المسافات المتعددة إلى مسافة واحدة
    .trim();

  return cleanedText;
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I am HealthLens. How can I assist you with your health today?',
      sender: 'bot',
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async (): Promise<void> => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    // التمرير لأسفل فور إرسال رسالة المستخدم
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ question: currentInput }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data: ApiResponse = await response.json();

      // تمرير الرد عبر فلتر التنظيف المطور
      const cleanReply = cleanBotResponse(data.reply);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text:
          cleanReply || 'Sorry, I could not process that. Please try again.',
        sender: 'bot',
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: 'error',
          text: '⚠️ Connection error. Please ensure the server is running.',
          sender: 'bot',
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.messageWrapper,
          isUser ? styles.messageWrapperUser : styles.messageWrapperBot,
        ]}
      >
        {!isUser && (
          <View style={styles.botAvatar}>
            <Text style={styles.botAvatarText}>HL</Text>
          </View>
        )}
        <View
          style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}
        >
          <Text
            style={[styles.text, isUser ? styles.userText : styles.botText]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>HealthLens Pro</Text>
            <Text style={styles.headerSubtitle}>AI Medical Assistant</Text>
          </View>
          <View style={styles.statusDot} />
        </View>

        {/* Chat List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#0066FF" />
            <Text style={styles.loaderText}>Analyzing symptoms...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your symptoms..."
            placeholderTextColor="#8E8E93"
            multiline={true}
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isLoading) && styles.disabledBtn,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    color: '#1A1A1A',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif-medium',
  },
  headerSubtitle: {
    color: '#0066FF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 10,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperBot: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  botAvatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#0066FF',
    borderBottomRightRadius: 4,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  text: {
    fontSize: 15.5,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#333333',
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loaderText: {
    marginLeft: 10,
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E9F2',
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#F4F7FB',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: '#1A1A1A',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  sendBtn: {
    marginLeft: 12,
    backgroundColor: '#0066FF',
    borderRadius: 22,
    paddingHorizontal: 20,
    height: 44,
    justifyContent: 'center',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledBtn: {
    backgroundColor: '#B0C4DE',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default App;
