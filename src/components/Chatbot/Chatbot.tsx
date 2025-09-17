import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Search,
  Paperclip,
  Mic,
  Globe,
  Palette,
  Type,
  Sun,
  MessageSquare,
  Settings,
  Keyboard,
  Video,
  HelpCircle,
  Trash2,
  Volume2,
  // Mic2,
  Users,
  Download,
  Share2,
  Eye,
  Zap,
} from "lucide-react";
import { BsSoundwave } from "react-icons/bs";

import { motion, AnimatePresence } from "framer-motion";
import {
  sendMessageToAPI,
  getApiLanguageCode,
} from "../services/chatService";
import { voiceRecordingService } from "../services/voiceService";
import { handleVoiceInteraction } from "../services/voiceService";
import ConversationManager, {
  type Message,
  type FontSettings,
  type ThemeSettings,
  type GreetingSettings,
} from "../services/conversationManager";
import { textToSpeech } from "../services/ttsService";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import ColorPaletteModal from "./ColorPaletteModal";
import FontCustomizer from "./FontCustomizer";
import ThemeCustomizer from "./ThemeCustomizer";
import GreetingCustomizer from "./GreetingCustomizer";
import "./Chatbot.css";
import VirtualKeyboard from "./VirtualKeyboard";
import { translationService } from "../services/translationService";
import MultilingualFAQ from "./MultilingualFAQ";
import { useLanguage } from "../services/languageContext";
import UploadForm from "./UploadForm";
import { useAbuseFilter } from "./useAbuseFilter";
import { useLocation } from "react-router-dom";
import FormDialog from "./FormDialog";

const Chatbot: React.FC = () => {
  const location = useLocation();
  const hiddenRoutes = [
    "/customer-admin",
    "/detailed-company-info",
    "/customer-feedback",
    "/super-admin/enquiry",
    "/super-admin/users",
    "/super-admin/companies",
    "/super-admin",
  ]; // add all  the location to hide  chat bot //
  if (hiddenRoutes.includes(location.pathname)) {
    return null;
  }
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isRecording, setIsRecording] = useState(false);

  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [virtualKeyboardOpen, setVirtualKeyboardOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(
    null
  );
  const [isSearchRecording, setIsSearchRecording] = useState(false);
  const [showMicWarning, setShowMicWarning] = useState(false);
  const [recordingTimeout, setRecordingTimeout] = useState<number | null>(null);

  const [colorPaletteOpen, setColorPaletteOpen] = useState(false);
  const [fontCustomizerOpen, setFontCustomizerOpen] = useState(false);
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const [greetingCustomizerOpen, setGreetingCustomizerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // New features state
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [incognitoMode, setIncognitoMode] = useState(false);

  const {
    filteredMessage,
    isAbusive,
    violationCount,
    incrementViolation,
    isBanned,
  } = useAbuseFilter(inputValue, 4);

  const chatbotRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationManager = ConversationManager.getInstance();
  useState(() => conversationManager.getContext("default-user"));

  const [userPreferences, setUserPreferences] = useState(() =>
    conversationManager.getPreferences()
  );
  const [showInitialGreeting, setShowInitialGreeting] = useState(true);

  useEffect(() => {
    const history = conversationManager.getHistory();
    if (history.length === 0) {
      setTimeout(() => {
        const greetingMessage: Message = {
          id: Date.now(),
          text: userPreferences.greetingSettings.message,
          sender: "bot",
          timestamp: new Date(),
        };

        setMessages([greetingMessage]);
        conversationManager.addMessage(greetingMessage);
        setShowInitialGreeting(false);
      }, userPreferences.greetingSettings.delay);
    } else {
      setMessages(history);
      setShowInitialGreeting(false);
    }
  }, [userPreferences.greetingSettings, conversationManager]);

  const scrollToBottom = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, autoScrollEnabled]);

  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredMessages(messages);
    } else {
      const filtered = messages.filter((message) =>
        message.text.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  }, [messages, searchValue]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleVirtualKeyboard = () => {
    setVirtualKeyboardOpen(true);
  };

  const handleVirtualKeyboardClose = () => {
    setVirtualKeyboardOpen(false);
  };

  const handleVirtualKeyboardInput = (text: string) => {
    setInputValue(text);
  };

  const handleFAQOpen = () => {
    setFaqOpen(true);
  };

  const handleFAQClose = () => {
    setFaqOpen(false);
  };

  const [suggestionsByMessageId, setSuggestionsByMessageId] = useState<
    Record<number, string[]>
  >({});

  const handleFAQQuestionClick = async (
    question: string,
    fallbackAnswer: string
  ) => {
    setFaqOpen(false);

    // 1) Push the user's message
    const userMessage: Message = {
      id: Date.now(),
      text: question,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    conversationManager.addMessage(userMessage);

    // 2) Prepare API call
    const contextInfo = conversationManager.getContextualInfo();
    const apiLangCode = getApiLanguageCode(currentLanguage);

    try {
      // 3) Call backend and keep full JSON
      const res = await sendMessageToAPI(question, contextInfo, apiLangCode);
      const answerText = res?.answer ?? "";
      const predicted = Array.isArray(res?.predicted_questions)
        ? res.predicted_questions
        : [];

      // (Optional) translate chips/answer if your UI language isn’t English
      // ...skip if you don’t translate elsewhere

      // 4) Push bot message
      const botId = Date.now() + 1;
      const botResponse: Message = {
        id: botId,
        text: answerText || "I couldn't find an answer.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      conversationManager.addMessage(botResponse);

      // 5) Attach suggestions to THIS bot message
      if (predicted.length) {
        setSuggestionsByMessageId((prev) => ({ ...prev, [botId]: predicted }));
      }
    } catch (error) {
      // Fallback: use the FAQ-provided answer; no suggestions
      const botResponse: Message = {
        id: Date.now() + 1,
        text: fallbackAnswer,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      conversationManager.addMessage(botResponse);
    }
  };

  const handleSearchNavigation = (direction: "up" | "down") => {
    if (filteredMessages.length === 0) return;

    if (direction === "up") {
      setCurrentSearchIndex((prev) =>
        prev <= 0 ? filteredMessages.length - 1 : prev - 1
      );
    } else {
      setCurrentSearchIndex((prev) =>
        prev >= filteredMessages.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSearchNavigation("up");
    } else if (e.key === "ArrowDown" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSearchNavigation("down");
    }
  };

  const scrollToSearchResult = (index: number) => {
    const messageElements = document.querySelectorAll(".message");
    if (messageElements[index]) {
      messageElements[index].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  useEffect(() => {
    if (
      currentSearchIndex >= 0 &&
      currentSearchIndex < filteredMessages.length
    ) {
      scrollToSearchResult(currentSearchIndex);
    }
  }, [currentSearchIndex, filteredMessages]);

  // CHANGE: reusable sender that handles API call, translation, and suggestions
  const sendMessageWithText = async (text: string) => {
    if (!text || !text.trim()) return;

    // 1) push user's message (UI + conversationManager)
    addMessageToChat({ role: "user", text });

    setIsTyping(true);
    try {
      const contextInfo = conversationManager.getContextualInfo();
      const apiLangCode = getApiLanguageCode(currentLanguage);

      // full JSON from API (BackendApiResponse)
      const res = await sendMessageToAPI(text, contextInfo, apiLangCode);

      const answerText = res?.answer ?? "";
      const predicted = Array.isArray(res?.predicted_questions)
        ? res.predicted_questions
        : [];

      // translate the *answer* if UI language != en
      let finalAnswer = answerText;
      if (currentLanguage !== "en" && answerText) {
        const tr = await translationService.translateText(
          answerText,
          "en",
          currentLanguage
        );
        if (tr.success && tr.translatedText) finalAnswer = tr.translatedText;
      }

      // translate suggestion chips too
      let finalPredicted = predicted;
      if (currentLanguage !== "en" && predicted.length) {
        const trs = await Promise.all(
          predicted.map((q) =>
            translationService.translateText(q, "en", currentLanguage)
          )
        );
        finalPredicted = trs.map((r, i) =>
          r?.success && r.translatedText ? r.translatedText : predicted[i]
        );
      }

      // 2) push bot message
      const botMsg = addMessageToChat({
        role: "assistant",
        text: finalAnswer || "I couldn't find an answer.",
        webUsed: res.web_used,
      });

      // 3) attach suggestions to this bot message
      if (finalPredicted.length) {
        setSuggestionsByMessageId((prev) => ({
          ...prev,
          [botMsg.id]: finalPredicted,
        }));
      }
    } catch (err) {
      console.error("Chatbot API Error:", err);
      let errMsg =
        "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
      if (currentLanguage !== "en") {
        const tr = await translationService.translateText(
          errMsg,
          "en",
          currentLanguage
        );
        if (tr.success && tr.translatedText) errMsg = tr.translatedText;
      }

      addMessageToChat({ role: "assistant", text: errMsg });
    } finally {
      setIsTyping(false);
    }
  };

  // CHANGE: keep your abuse-filter logic intact, then delegate to sendMessageWithText
  const handleSendMessage = async () => {
    if (isBanned || !inputValue.trim()) return;

    if (isAbusive) {
      incrementViolation();
      const baseWarningText =
        "Warning: Abusive language detected. {count} more violation(s) will terminate your session.";
      const baseBanText =
        "Warning: Your session has been terminated due to repeated policy violations. You can no longer send messages.";
      const translatedWarningResult = await translationService.translateText(
        baseWarningText,
        "en",
        currentLanguage
      );
      const translatedBanResult = await translationService.translateText(
        baseBanText,
        "en",
        currentLanguage
      );

      let finalWarningMessage: string;
      if (violationCount + 1 < 4) {
        const translatedMsg =
          translatedWarningResult.success &&
          translatedWarningResult.translatedText
            ? translatedWarningResult.translatedText
            : baseWarningText;
        finalWarningMessage = translatedMsg.replace(
          "{count}",
          (3 - violationCount).toString()
        );
      } else {
        finalWarningMessage =
          translatedBanResult.success && translatedBanResult.translatedText
            ? translatedBanResult.translatedText
            : baseBanText;
      }

      // abusive flow is fine: add both user + bot warning manually
      const userMsg: Message = {
        id: Date.now(),
        text: filteredMessage,
        sender: "user",
        timestamp: new Date(),
      };
      const botWarning: Message = {
        id: Date.now() + 1,
        text: finalWarningMessage,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg, botWarning]);
      conversationManager.addMessage(userMsg);
      conversationManager.addMessage(botWarning);
      setInputValue("");
      return;
    }

    // ✅ normal flow — only send via sendMessageWithText
    const text = inputValue.trim();
    setInputValue("");
    await sendMessageWithText(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClickFileInput = () => {
    setShowUploadForm(true);
  };

  const handleUploadFormSubmit = (userMessage: string, botResponse: string) => {
    const userMsg: Message = {
      id: Date.now(),
      text: userMessage,
      sender: "user",
      timestamp: new Date(),
      isFile: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    conversationManager.addMessage(userMsg);

    const botMsg: Message = {
      id: Date.now() + 1,
      text: botResponse,
      sender: "bot",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, botMsg]);
    conversationManager.addMessage(botMsg);
  };

  const stopWaveAnimation = () => {
    if (micButtonRef.current) {
      micButtonRef.current.classList.remove("recording-pulse");
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    clearRecordingTimeout();

    try {
      const response = await voiceRecordingService.completeRecording(
        currentLanguage
      );
      setIsRecording(false);
      stopWaveAnimation();

      if (response?.success && response?.transcription) {
        const cleanedText = response.transcription.replace(/[।.]/g, "");
        setInputValue(cleanedText);
      } else {
        console.warn("Transcription failed:", response?.error);
        setShowMicWarning(true);
        setTimeout(() => setShowMicWarning(false), 5000);
      }
    } catch (error) {
      console.error("Stop Recording Error:", error);
      setIsRecording(false);
      stopWaveAnimation();
      setShowMicWarning(true);
      setTimeout(() => setShowMicWarning(false), 5000);
    }
  };

  // const addMessageToChat = (message: { role: string; text: any }) => {
  //   const newMessage: Message = {
  //     id: Date.now(),
  //     text: message.text,
  //     sender: message.role === "user" ? "user" : "bot",
  //     timestamp: new Date(),
  //   };

  //   setMessages((prev) => [...prev, newMessage]);
  //   conversationManager.addMessage(newMessage);
  // };
  // Chatbot.tsx
  // Chatbot.tsx — replace current addMessageToChat with this
  // Move interface to module level
  interface Message {
    id: number;
    text: string;
    sender: "user" | "bot"; // Restrict sender to only these two values
    timestamp: Date;
    isFile?: boolean;
    fileName?: string;
    webUsed?: Array<{ url: string; title?: string }>;
  }

  const addMessageToChat = (
    message: { role: string; text: any; webUsed?: any[] },
    skipConversationManager = false
  ): Message => {
    const safeText =
      typeof message.text === "string"
        ? message.text.trim()
        : String(message.text?.answer ?? message.text ?? "").trim();

    const sender = message.role === "user" ? "user" : "bot";

    const newMessage: Message = {
      id: Date.now() + Math.floor(Math.random() * 1000), // numeric unique id
      text: safeText,
      sender,
      timestamp: new Date(),
      webUsed: message.webUsed,
    };

    setMessages((prev) => {
      // dedupe guard: same sender + same text as last message -> ignore
      const last = prev[prev.length - 1];
      if (
        last &&
        last.sender === newMessage.sender &&
        last.text === newMessage.text
      ) {
        console.log("addMessageToChat: skipped duplicate", newMessage);
        return prev;
      }
      return [...prev, newMessage];
    });

    // only call conversationManager when caller wants persistence
    if (!skipConversationManager) {
      try {
        // guard for missing conversationManager
        if (typeof conversationManager?.addMessage === "function") {
          conversationManager.addMessage(newMessage);
        }
      } catch (err) {
        console.warn("conversationManager.addMessage failed:", err);
      }
    }

    return newMessage;
  };

  const handleMicPress2 = async () => {
    await handleVoiceInteraction(currentLanguage, addMessageToChat);
  };

  const handleLanguageChange = async (languageCode: string) => {
    setCurrentLanguage(languageCode);
    conversationManager.updatePreferences({ language: languageCode });

    const selectedLanguage = translationService
      .getSupportedLanguages()
      .find((lang) => lang.id === languageCode);
    const languageName = selectedLanguage
      ? selectedLanguage.name
      : languageCode;

    const messageText = `Language changed to ${languageName}`;
    let translatedMessage = messageText;

    if (languageCode !== "en") {
      const translationResult = await translationService.translateText(
        messageText,
        "en",
        languageCode
      );
      if (translationResult.success && translationResult.translatedText) {
        translatedMessage = translationResult.translatedText;
      }
    }

    const systemMessage: Message = {
      id: Date.now(),
      text: translatedMessage,
      sender: "bot",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, systemMessage]);
    conversationManager.addMessage(systemMessage);
    setLanguageModalOpen(false);
  };

  const handleColorChange = (color: string) => {
    const newPreferences = {
      ...userPreferences,
      colorTheme: color,
    };
    setUserPreferences(newPreferences);
    conversationManager.updatePreferences(newPreferences);
    setColorPaletteOpen(false);
  };

  const handleFontChange = (fontSettings: FontSettings) => {
    const newPreferences = {
      ...userPreferences,
      fontSettings,
    };
    setUserPreferences(newPreferences);
    conversationManager.updatePreferences(newPreferences);
    setFontCustomizerOpen(false);
  };

  const handleThemeChange = (themeSettings: ThemeSettings) => {
    const newPreferences = {
      ...userPreferences,
      themeSettings,
    };
    setUserPreferences(newPreferences);
    conversationManager.updatePreferences(newPreferences);
    setThemeCustomizerOpen(false);
  };

  const handleGreetingChange = (greetingSettings: GreetingSettings) => {
    const newPreferences = {
      ...userPreferences,
      greetingSettings,
    };
    setUserPreferences(newPreferences);
    conversationManager.updatePreferences(newPreferences);
    setGreetingCustomizerOpen(false);
  };

  const handleClearHistory = () => {
    setMessages([]);
    conversationManager.clearHistory();
    setSettingsOpen(false);
  };

  const handleStats = () => {
    // Show conversation statistics in a card
    const totalMessages = messages.length;
    const userMessages = messages.filter((m) => m.sender === "user").length;
    const botMessages = messages.filter((m) => m.sender === "bot").length;

    // Create stats card
    const statsCard = document.createElement("div");
    statsCard.className = "stats-card";
    statsCard.innerHTML = `
      <div class="stats-card-header">
        <h3>📊 Chat Statistics</h3>
        <button class="stats-close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="stats-card-content">
        <div class="stat-item">
          <span class="stat-label">Total Messages:</span>
          <span class="stat-value">${totalMessages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">User Messages:</span>
          <span class="stat-value">${userMessages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Bot Messages:</span>
          <span class="stat-value">${botMessages}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Conversation Duration:</span>
          <span class="stat-value">${
            messages.length > 0
              ? Math.round(
                  (Date.now() - new Date(messages[0].timestamp).getTime()) /
                    60000
                )
              : 0
          } min</span>
        </div>
      </div>
    `;

    document.body.appendChild(statsCard);
    setSettingsOpen(false);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (statsCard.parentElement) {
        statsCard.remove();
      }
    }, 5000);
  };

  const handleExport = () => {
    // Export conversation history in .txt format
    let conversationText = `AI Chatbot Conversation History\n`;
    conversationText += `Generated on: ${new Date().toLocaleString()}\n`;
    conversationText += `Language: ${currentLanguage}\n`;
    conversationText += `Total Messages: ${messages.length}\n`;
    conversationText += `\n${"=".repeat(50)}\n\n`;

    messages.forEach((message) => {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const sender = message.sender === "user" ? "You" : "AI Assistant";
      conversationText += `[${timestamp}] ${sender}:\n`;
      conversationText += `${message.text}\n\n`;
    });

    const blob = new Blob([conversationText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSettingsOpen(false);
  };

  const handleShare = () => {
    // Share conversation (placeholder for future implementation)
    if (navigator.share) {
      navigator.share({
        title: "AI Chatbot Conversation",
        text: "Check out my conversation with the AI chatbot!",
        url: window.location.href,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
    setSettingsOpen(false);
  };

  const handleIncognito = () => {
    setIncognitoMode(!incognitoMode);

    // Create incognito popup
    const incognitoPopup = document.createElement("div");
    incognitoPopup.className = "feature-popup incognito-popup";
    incognitoPopup.innerHTML = `
      <div class="feature-popup-content">
        <div class="feature-popup-icon">${!incognitoMode ? "👁️" : "👁️‍🗨️"}</div>
        <div class="feature-popup-text">
          <h4>${
            !incognitoMode
              ? "Incognito Mode Enabled"
              : "Incognito Mode Disabled"
          }</h4>
          <p>${
            !incognitoMode
              ? "Your conversation will not be saved to history."
              : "Your conversation will now be saved to history."
          }</p>
        </div>
        <button class="feature-popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    document.body.appendChild(incognitoPopup);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (incognitoPopup.parentElement) {
        incognitoPopup.remove();
      }
    }, 3000);
  };

  const handleAutoScroll = () => {
    setAutoScrollEnabled(!autoScrollEnabled);

    // Create auto-scroll popup
    const autoScrollPopup = document.createElement("div");
    autoScrollPopup.className = "feature-popup auto-scroll-popup";
    autoScrollPopup.innerHTML = `
      <div class="feature-popup-content">
        <div class="feature-popup-icon">⚡</div>
        <div class="feature-popup-text">
          <h4>${
            !autoScrollEnabled ? "Auto-scroll Enabled" : "Auto-scroll Disabled"
          }</h4>
          <p>${
            !autoScrollEnabled
              ? "Messages will automatically scroll to bottom."
              : "You can now manually scroll through messages."
          }</p>
        </div>
        <button class="feature-popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    document.body.appendChild(autoScrollPopup);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (autoScrollPopup.parentElement) {
        autoScrollPopup.remove();
      }
    }, 3000);
  };

  const startRecordingTimeout = () => {
    if (recordingTimeout) {
      clearTimeout(recordingTimeout);
    }

    const timeout = setTimeout(() => {
      if (isRecording) {
        stopRecording();
        setShowMicWarning(true);
        setTimeout(() => setShowMicWarning(false), 5000);
      }
      if (isSearchRecording) {
        handleSearchVoiceToggle();
        setShowMicWarning(true);
        setTimeout(() => setShowMicWarning(false), 5000);
      }
      setRecordingTimeout(null);
    }, 10000);

    setRecordingTimeout(timeout);
  };

  const clearRecordingTimeout = () => {
    if (recordingTimeout) {
      clearTimeout(recordingTimeout);
      setRecordingTimeout(null);
    }
  };

  const handleSearchVoiceToggle = async () => {
    if (isSearchRecording) {
      try {
        clearRecordingTimeout();

        const response = await voiceRecordingService.completeRecording(
          currentLanguage
        );
        setIsSearchRecording(false);

        if (response?.success && response?.transcription) {
          const cleanedText = response.transcription.replace(/[।.]/g, "");
          setSearchValue(cleanedText);
        } else {
          console.warn("Transcription failed:", response?.error);
          setShowMicWarning(true);
          setTimeout(() => setShowMicWarning(false), 5000);
        }
      } catch (error) {
        console.error("Search voice recording error:", error);
        setIsSearchRecording(false);
        setShowMicWarning(true);
        setTimeout(() => setShowMicWarning(false), 5000);
      }
    } else {
      try {
        if (!voiceRecordingService.isRecordingSupported()) {
          throw new Error("Voice recording is not supported in this browser");
        }

        setIsSearchRecording(true);
        await voiceRecordingService.startRecording();

        startRecordingTimeout();
      } catch (error) {
        console.error("Search voice recording start error:", error);
        setIsSearchRecording(false);
        setShowMicWarning(true);
        setTimeout(() => setShowMicWarning(false), 5000);
      }
    }
  };

  const languageKeyMap: { [key: string]: string } = {
    en: "english",
    hi: "hindi",
    te: "telugu",
    ta: "tamil",
    bn: "bengali",
    gu: "gujarati",
    mr: "marathi",
    kn: "kannada",
    ml: "malayalam",
    pa: "punjabi",
    ur: "urdu",
    or: "odia",
    as: "assamese",
    ar: "arabic",
    zh: "chinese",
    ja: "japanese",
    ne: "nepali",
    ko: "korean",
    ru: "russian",
  };

  const browserLangMap: { [key: string]: string } = {
    en: "en-US",
    hi: "hi-IN",
    te: "te-IN",
    ta: "ta-IN",
    bn: "bn-IN",
    gu: "gu-IN",
    mr: "mr-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
    ur: "ur-PK",
    or: "or-IN",
    as: "as-IN",
  };

  const handleSpeakText = async (
    text: string,
    currentLanguage: string,
    messageId?: number
  ) => {
    const langKey = languageKeyMap[currentLanguage] || "english";

    try {
      const response = await textToSpeech(text, langKey);
      console.log("TTS API response:", response);

      if (response?.audio) {
        const binary = atob(response.audio);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          buffer[i] = binary.charCodeAt(i);
        }

        const blob = new Blob([buffer], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        if (messageId) setSpeakingMessageId(messageId);
        audio.onended = () => setSpeakingMessageId(null);
        audio.play();
      } else {
        throw new Error("No audio received.");
      }
    } catch (error) {
      console.warn("Falling back to browser TTS:", error);

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = browserLangMap[currentLanguage] || "en-US";
        utterance.rate = 0.9;
        utterance.volume = 1;
        if (messageId) setSpeakingMessageId(messageId);
        utterance.onend = () => setSpeakingMessageId(null);
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error("Browser TTS failed:", fallbackError);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatbotRef.current &&
        !chatbotRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "scroll";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      clearRecordingTimeout();
    };
  }, [isOpen]);

  // Form displayed

  const [formData, setFormData] = useState<any | null>(null);
  const [, setFormResponses] = useState<Record<string, any>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const API_BASE = import.meta.env.VITE_BACKEND_URL;

  async function handleSidebarClick(category: string) {
    if (!API_BASE) {
      console.error("VITE_BACKEND_URL is not set in .env");
      return;
    }

    setFormLoading(true);
    setCurrentCategory(category);
    setFormData(null);
    setShowFormDialog(false);

    try {
      const res = await fetch(`${API_BASE}/forms/all`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!res.ok) throw new Error(`Failed ${res.status}`);

      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];

      // Normalizer: lowercase + remove non-alnum
      const normalize = (s?: any) =>
        (s ?? "")
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

      // Simple Levenshtein distance for fuzzy matching
      const levenshtein = (a: string, b: string) => {
        const A = a || "";
        const B = b || "";
        const m = A.length;
        const n = B.length;
        const dp: number[][] = Array.from({ length: m + 1 }, () =>
          new Array(n + 1).fill(0)
        );
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            dp[i][j] =
              A[i - 1] === B[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
          }
        }
        return dp[m][n];
      };

      const normalizedCategory = normalize(category);

      // 1) exact normalized match
      let matchingForm = items.find(
        (f: any) => normalize(f.title) === normalizedCategory
      );

      // 2) includes (e.g., "customerfeedback" includes "feedback")
      if (!matchingForm) {
        matchingForm = items.find((f: any) => {
          const nt = normalize(f.title);
          return (
            nt.includes(normalizedCategory) || normalizedCategory.includes(nt)
          );
        });
      }

      // 3) fuzzy fallback (small typos) - threshold = 2 (tune if needed)
      if (!matchingForm) {
        matchingForm = items.find((f: any) => {
          const nt = normalize(f.title);
          const dist = levenshtein(nt, normalizedCategory);
          return dist <= 2; // small typo tolerance
        });
      }

      if (!matchingForm) {
        console.warn(`No form found for category "${category}"`);
        setFormData(null);
        setFormResponses({});
        // optionally inform user in UI instead of console:
        // setErrors({ general: `No ${category} form available.` })
        return;
      }

      // Normalize questions so FormDialog always receives the same shape
      const normalizedQuestions =
        (matchingForm.questions || []).map((q: any, idx: number) => ({
          id:
            q.id ||
            q._id ||
            q.key ||
            `q_${idx}_${Math.random().toString(36).slice(2, 9)}`,
          type: q.type || q.kind || "text",
          label: q.label || q.text || q.question || `Question ${idx + 1}`,
          required: !!q.required,
          placeholder: q.placeholder || "",
          options: Array.isArray(q.options)
            ? q.options
            : q.options
            ? [q.options]
            : [],
          validation: q.validation || {},
        })) || [];

      const normalizedForm = {
        ...matchingForm,
        questions: normalizedQuestions,
      };

      setFormData(normalizedForm);
      setShowFormDialog(true);

      // init responses from the matching form questions
      const init: Record<string, any> = {};
      normalizedQuestions.forEach((q: any) => {
        init[q.id] = q.type === "checkbox" ? [] : "";
      });
      setFormResponses(init);
    } catch (err) {
      console.error("Error fetching form:", err);
    } finally {
      setFormLoading(false);
    }
  }

  const handleFormSubmit = async (payload: any) => {
    if (!API_BASE) {
      console.error("VITE_BACKEND_URL is not set in .env");
      return;
    }

    try {
      console.log("[Form Submit] Sending payload:", payload);

      const res = await fetch(`${API_BASE}/form_responses/submit_public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to submit form: ${res.status}`);

      const result = await res.json();
      console.log("Form submitted successfully:", result);

      // ... success handling ...
    } catch (err) {
      console.error("Error submitting form:", err);
      // ... error handling ...
    }
  };

  return (
    <div
      ref={chatbotRef}
      className="chatbot-container"
      style={{
        fontFamily: userPreferences.fontSettings.fontFamily,
        fontSize: `${userPreferences.fontSettings.fontSize}px`,
        fontWeight: userPreferences.fontSettings.fontWeight,
        lineHeight: userPreferences.fontSettings.lineHeight,
        letterSpacing: `${userPreferences.fontSettings.letterSpacing}px`,
      }}
    >
      {/* Chat Toggle Button */}
      <motion.button
        className={`chat-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: isOpen
            ? userPreferences.colorTheme ||
              userPreferences.themeSettings.primary
            : userPreferences.themeSettings.primary,
          boxShadow: userPreferences.themeSettings.shadow,
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: 0 }}
              animate={{ rotate: 0 }}
              exit={{ rotate: 180 }}
            >
              <X size={24} style={{ color: "white" }} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              className="robot-container"
              initial={{ rotate: 180 }}
              animate={{ rotate: 0 }}
            >
              <div className="robot-icon-circle">
                <span className="robot-emoji">
                  {userPreferences.greetingSettings.showEmoji
                    ? userPreferences.greetingSettings.emoji
                    : "🤖"}
                </span>
              </div>
              {!showInitialGreeting && (
                <motion.div
                  className="speech-bubble speech-bubble-animated"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
                >
                  Hello!
                  <div className="speech-bubble-arrow"></div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chat-window"
            style={{
              background: userPreferences.themeSettings.background,
              color: userPreferences.themeSettings.text,
              boxShadow: userPreferences.themeSettings.shadow,
              border: `1px solid ${userPreferences.themeSettings.border}`,
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Sidebar */}
            <div className="chat-sidebar">
              {/* Offers */}
              <div
                className="sidebar-icon"
                title="Offers"
                onClick={() => handleSidebarClick("offers")}
              >
                <div className="sidebar-tooltip">Offers</div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 12V8H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                  <path d="M4 6v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6" />
                  <path d="M12 12h.01" />
                  <path d="M12 16h.01" />
                  <path d="M12 8h.01" />
                </svg>
              </div>

              {/* Feedback */}
              <div
                className={`sidebar-icon ${
                  formLoading && currentCategory === "feedback" ? "loading" : ""
                }`}
                title="Feedback"
                onClick={() => handleSidebarClick("feedback")}
                style={{
                  opacity:
                    formLoading && currentCategory === "feedback" ? 0.6 : 1,
                  cursor: formLoading ? "not-allowed" : "pointer",
                }}
              >
                <div className="sidebar-tooltip">Feedback</div>
                {formLoading && currentCategory === "feedback" ? (
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid #f3f3f3",
                      borderTop: "2px solid #4285f4",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M13 8H7" />
                    <path d="M17 12H7" />
                  </svg>
                )}
              </div>

              {/* Survey */}
              <div
                className="sidebar-icon"
                title="Survey"
                onClick={() => handleSidebarClick("survey")}
              >
                <div className="sidebar-tooltip">Survey</div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
              </div>

              {/* Appointment */}
              <div
                className="sidebar-icon"
                title="Appointment"
                onClick={() => handleSidebarClick("appointment")}
              >
                <div className="sidebar-tooltip">Appointment</div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>

              {/* Others (5th icon) */}
              <div
                className="sidebar-icon"
                title="Other Forms"
                onClick={() => handleSidebarClick("test")}
              >
                <div className="sidebar-tooltip">Other Forms</div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5" />
                  <line x1="12" y1="17" x2="12" y2="17" />
                </svg>
              </div>
            </div>

            <FormDialog
              isOpen={showFormDialog}
              onClose={() => setShowFormDialog(false)}
              formData={formData}
              currentCategory={currentCategory || undefined}
              userPreferences={userPreferences}
              onSubmit={handleFormSubmit}
            />

            {/* Header */}
            <div
              className="chat-header"
              style={{
                background: userPreferences.themeSettings.surface,
                borderBottom: `1px solid ${userPreferences.themeSettings.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
              }}
            >
              {/* Left side - AI Info */}
              <div className="chat-header-info">
                <div
                  className="ai-avatar"
                  style={{
                    background: userPreferences.colorTheme,
                    color: "white",
                  }}
                >
                  AI
                </div>
                <div className="header-text">
                  <h3 style={{ color: userPreferences.themeSettings.text }}>
                    AI Assistant
                  </h3>
                  <div className="status-container">
                    <div
                      className="status-dot"
                      style={{ background: "#22c55e" }}
                    ></div>
                    <span
                      className="status"
                      style={{
                        color: userPreferences.themeSettings.textSecondary,
                      }}
                    >
                      Online
                    </span>
                  </div>
                </div>
              </div>

              {/* Center - Language selection */}
              <button
                className="language-tag"
                onClick={() => setLanguageModalOpen(true)}
                style={{
                  background: userPreferences.themeSettings.surface,
                  color: userPreferences.themeSettings.text,
                  border: `1px solid ${userPreferences.themeSettings.border}`,
                  padding: "6px 12px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                <Globe
                  size={14}
                  className="language-icon"
                  style={{
                    color: userPreferences.colorTheme,
                  }}
                />
                {currentLanguage === "en"
                  ? "ENGLISH"
                  : currentLanguage === "es"
                  ? "ESPAÑOL"
                  : currentLanguage === "fr"
                  ? "FRANÇAIS"
                  : currentLanguage === "de"
                  ? "DEUTSCH"
                  : currentLanguage === "it"
                  ? "ITALIANO"
                  : currentLanguage === "pt"
                  ? "PORTUGUÊS"
                  : currentLanguage === "ru"
                  ? "РУССКИЙ"
                  : currentLanguage === "ja"
                  ? "日本語"
                  : currentLanguage === "zh"
                  ? "中文"
                  : currentLanguage === "hi"
                  ? "हिन्दी"
                  : currentLanguage === "ar"
                  ? "العربية"
                  : currentLanguage === "bn"
                  ? "বাংলা"
                  : currentLanguage.toUpperCase()}
              </button>

              {/* Right side - Settings and Close buttons */}
              <div
                className="header-actions"
                style={{ display: "flex", gap: "8px" }}
              >
                <motion.button
                  className="palette-btn"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  whileHover={{
                    scale: 1.1,
                    color: userPreferences.colorTheme,
                  }}
                  whileTap={{ scale: 0.9 }}
                  title={settingsOpen ? "Close Settings" : "Customize"}
                  style={{
                    color: settingsOpen
                      ? userPreferences.colorTheme
                      : userPreferences.themeSettings.text,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "6px",
                  }}
                >
                  <Settings
                    size={18}
                    color={
                      settingsOpen
                        ? userPreferences.colorTheme
                        : userPreferences.themeSettings.text
                    }
                    style={{
                      transition: "color 0.2s",
                    }}
                  />
                </motion.button>

                <button
                  className="close-chat"
                  onClick={() => setIsOpen(false)}
                  style={{
                    color: userPreferences.themeSettings.text,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "6px",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {settingsOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSettingsOpen(false)}
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(0, 0, 0, 0.3)",
                      zIndex: 999,
                    }}
                  />

                  {/* Settings Modal */}
                  <motion.div
                    className="settings-panel"
                    initial={{ opacity: 0, scale: 0.9, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    style={{
                      position: "absolute",
                      top: "60px",
                      right: "8px",
                      background: userPreferences.themeSettings.surface,
                      border: `1px solid ${userPreferences.themeSettings.border}`,
                      borderRadius: "12px",
                      padding: "8px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                      zIndex: 1000,
                      width: "200px",
                    }}
                  >
                    <div
                      className="settings-list"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <motion.button
                        className="settings-item"
                        onClick={() => {
                          setColorPaletteOpen(true);
                          setSettingsOpen(false);
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Palette size={18} />
                        <span>Colors</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={() => {
                          setFontCustomizerOpen(true);
                          setSettingsOpen(false);
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Type size={18} />
                        <span>Fonts</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={() => {
                          setThemeCustomizerOpen(true);
                          setSettingsOpen(false);
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Sun size={18} />
                        <span>Theme</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={() => {
                          setGreetingCustomizerOpen(true);
                          setSettingsOpen(false);
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <MessageSquare size={18} />
                        <span>Greeting</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleStats}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Users size={18} />
                        <span>Stats</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleExport}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Download size={18} />
                        <span>Export</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleShare}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Share2 size={18} />
                        <span>Share</span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleIncognito}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: incognitoMode
                            ? "#ef444420"
                            : userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: incognitoMode
                            ? "#ef4444"
                            : userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Eye size={18} />
                        <span>
                          {incognitoMode ? "Incognito On" : "Incognito"}
                        </span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleAutoScroll}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: userPreferences.colorTheme + "20",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: userPreferences.themeSettings.text,
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Zap size={18} />
                        <span>
                          {autoScrollEnabled
                            ? "Auto-scroll On"
                            : "Auto-scroll Off"}
                        </span>
                      </motion.button>

                      <motion.button
                        className="settings-item"
                        onClick={handleClearHistory}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: "#ef444420",
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          background: userPreferences.themeSettings.background,
                          color: "#ef4444",
                          border: `1px solid ${userPreferences.themeSettings.border}`,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Trash2 size={18} />
                        <span>Clear History</span>
                      </motion.button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Search Bar */}
            <div className="search-input-container">
              <Search
                size={16}
                className="search-icon"
                style={{ color: userPreferences.themeSettings.textSecondary }}
              />
              <div
                className="search-bar-wrapper"
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search messages..."
                  className="search-input"
                />
                {searchValue && filteredMessages.length > 0 && (
                  <div className="search-navigation">
                    <button
                      className="search-nav-btn"
                      onClick={() => handleSearchNavigation("up")}
                      title="Previous result (Ctrl+↑)"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                        color: userPreferences.themeSettings.textSecondary,
                      }}
                    >
                      ↑
                    </button>
                    <span className="search-counter">
                      {currentSearchIndex + 1}/{filteredMessages.length}
                    </span>
                    <button
                      className="search-nav-btn"
                      onClick={() => handleSearchNavigation("down")}
                      title="Next result (Ctrl+↓)"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                        color: userPreferences.themeSettings.textSecondary,
                      }}
                    >
                      ↓
                    </button>
                  </div>
                )}
                <motion.button
                  className="search-mic-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSearchVoiceToggle();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={
                    isSearchRecording
                      ? {
                          scale: [1, 1.2, 1],
                        }
                      : {}
                  }
                  transition={
                    isSearchRecording
                      ? {
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                      : {}
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    marginLeft: "8px",
                    cursor: "pointer",
                    borderRadius: "50%",
                    padding: "4px",
                  }}
                  title={isSearchRecording ? "Stop recording" : "Voice search"}
                >
                  <Mic
                    size={18}
                    color={
                      isSearchRecording
                        ? "#ef4444"
                        : userPreferences.themeSettings.textSecondary
                    }
                  />
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="chat-messages"
              style={{ background: userPreferences.themeSettings.background }}
            >
              {/* Microphone Warning */}
              <AnimatePresence>
                {showMicWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{
                      position: "sticky",
                      top: "0",
                      zIndex: 100,
                      background: "#fef3c7",
                      border: "1px solid #f59e0b",
                      borderRadius: "8px",
                      margin: "8px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#92400e",
                      fontSize: "14px",
                    }}
                  >
                    <div style={{ fontSize: "16px" }}>⚠️</div>
                    <div>
                      <strong>Microphone Issue:</strong> Unable to detect voice.
                      Please check your microphone permissions and try again.
                    </div>
                    <button
                      onClick={() => setShowMicWarning(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        marginLeft: "auto",
                        fontSize: "18px",
                        color: "#92400e",
                      }}
                    >
                      ×
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {(searchValue ? filteredMessages : messages)
                .sort(
                  (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime()
                )
                .map((message, index) => {
                  const isCurrentSearchResult =
                    searchValue &&
                    currentSearchIndex >= 0 &&
                    index === currentSearchIndex;

                  return (
                    <motion.div
                      key={message.id}
                      className={`message ${message.sender} ${
                        isCurrentSearchResult ? "current-search-result" : ""
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      style={{
                        border: isCurrentSearchResult
                          ? "2px solid #4285f4"
                          : "none",
                        borderRadius: isCurrentSearchResult ? "8px" : "0",
                        padding: isCurrentSearchResult ? "8px" : "0",
                        background: isCurrentSearchResult
                          ? "rgba(66, 133, 244, 0.1)"
                          : "transparent",
                      }}
                    >
                      <div className="message-avatar">
                        <div
                          className="avatar-circle"
                          style={{
                            background:
                              message.sender === "bot"
                                ? userPreferences.colorTheme
                                : userPreferences.themeSettings.textSecondary,
                            color: "white",
                          }}
                        >
                          {message.sender === "bot" ? "AI" : "U"}
                        </div>
                      </div>
                      <div className="message-content">
                        <div
                          className="message-bubble"
                          style={{
                            background:
                              message.sender === "bot"
                                ? userPreferences.themeSettings.surface
                                : userPreferences.colorTheme,
                            color:
                              message.sender === "bot"
                                ? userPreferences.themeSettings.text
                                : "white",
                            border: `1px solid ${userPreferences.themeSettings.border}`,
                          }}
                        >
                          {message.isFile ? (
                            <div className="file-message">
                              📎 {message.fileName}
                            </div>
                          ) : (
                            <div
                              style={{
                                position: "relative",
                                paddingBottom: "40px",
                                paddingRight: "8px",
                              }}
                            >
                              <span
                                dangerouslySetInnerHTML={{
                                  __html:
                                    searchValue &&
                                    message.text
                                      .toLowerCase()
                                      .includes(searchValue.toLowerCase())
                                      ? message.text.replace(
                                          new RegExp(`(${searchValue})`, "gi"),
                                          '<span class="search-highlight">$1</span>'
                                        )
                                      : message.text,
                                }}
                              />
                              <motion.button
                                onClick={() =>
                                  handleSpeakText(message.text, currentLanguage)
                                }
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                animate={
                                  speakingMessageId === message.id
                                    ? {
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 5, -5, 0],
                                      }
                                    : {}
                                }
                                transition={
                                  speakingMessageId === message.id
                                    ? {
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                      }
                                    : {}
                                }
                                style={{
                                  position: "absolute",
                                  bottom: "8px",
                                  right: "8px",
                                  background:
                                    speakingMessageId === message.id
                                      ? userPreferences.colorTheme
                                      : "rgba(0, 0, 0, 0.1)",
                                  border: "none",
                                  cursor: "pointer",
                                  borderRadius: "50%",
                                  padding: "8px",
                                  color:
                                    speakingMessageId === message.id
                                      ? "white"
                                      : userPreferences.themeSettings
                                          .textSecondary,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  zIndex: 10,
                                  minWidth: "32px",
                                  minHeight: "32px",
                                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                }}
                                title={
                                  speakingMessageId === message.id
                                    ? "Playing..."
                                    : "Play response"
                                }
                              >
                                <Volume2 size={16} />
                              </motion.button>
                            </div>
                          )}

                          {/* Render web links only for bot messages */}
                          {message.sender === "bot" &&
                            message.webUsed &&
                            message.webUsed.length > 0 && (
                              <div
                                className="web-links-container"
                                style={{
                                  marginTop: "10px",
                                  padding: "10px",
                                  borderTop: `1px solid ${userPreferences.themeSettings.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    marginBottom: "6px",
                                    color:
                                      userPreferences.themeSettings
                                        .textSecondary,
                                  }}
                                >
                                  🌐 Web Sources
                                </div>
                                <ul
                                  style={{ listStyleType: "none", padding: 0 }}
                                >
                                  {message.webUsed.map((link, i) => (
                                    <li key={i} style={{ marginBottom: "5px" }}>
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          fontSize: "12px",
                                          color: userPreferences.colorTheme,
                                          textDecoration: "underline",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          display: "block",
                                        }}
                                        title={link.url}
                                      >
                                        🔗 {link.title || link.url}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>

                        {/* Render predicted questions only for bot messages */}
                        {message.sender === "bot" &&
                          suggestionsByMessageId[message.id]?.length > 0 && (
                            <div style={{ marginTop: "10px" }}>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  marginBottom: "6px",
                                  color:
                                    userPreferences.themeSettings.textSecondary,
                                }}
                              >
                                Related Searches
                              </div>
                              <div
                                className="predicted-questions"
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "8px",
                                }}
                              >
                                {suggestionsByMessageId[message.id].map(
                                  (q, i) => (
                                    <button
                                      key={i}
                                      onClick={() => sendMessageWithText(q)}
                                      style={{
                                        border: `1px solid ${userPreferences.themeSettings.border}`,
                                        background:
                                          userPreferences.themeSettings
                                            .background,
                                        color:
                                          userPreferences.themeSettings.text,
                                        borderRadius: "999px",
                                        padding: "6px 10px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {q}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        <div
                          className="message-time"
                          style={{
                            color: userPreferences.themeSettings.textSecondary,
                          }}
                        >
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

              {searchValue && filteredMessages.length === 0 && (
                <motion.div
                  className="no-results-message"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px 20px",
                    textAlign: "center",
                    color: userPreferences.themeSettings.textSecondary,
                  }}
                >
                  <div
                    style={{
                      fontSize: "48px",
                      marginBottom: "16px",
                      opacity: 0.5,
                    }}
                  >
                    🔍
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "500",
                      marginBottom: "8px",
                      color: userPreferences.themeSettings.text,
                    }}
                  >
                    No results found
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      opacity: 0.7,
                    }}
                  >
                    Try searching with different keywords
                  </div>
                </motion.div>
              )}
              {isTyping && (
                <motion.div
                  className="message bot"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="message-avatar">
                    <div
                      className="avatar-circle"
                      style={{
                        background:
                          userPreferences.themeSettings.primary ||
                          userPreferences.colorTheme,
                        color: "white",
                      }}
                    >
                      AI
                    </div>
                  </div>
                  <div className="message-content">
                    <div
                      className="message-bubble typing"
                      style={{
                        background: userPreferences.themeSettings.surface,
                        border: `1px solid ${userPreferences.themeSettings.border}`,
                      }}
                    >
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="input-container">
              <div className="input-actions-container">
                <motion.button
                  className="input-action-btn"
                  onClick={handleClickFileInput}
                  title="Attach file"
                  whileHover={{ scale: 1.1, color: userPreferences.colorTheme }}
                  whileTap={{ scale: 0.9 }}
                  style={{ color: userPreferences.themeSettings.textSecondary }}
                >
                  <Paperclip size={22} />
                </motion.button>
                <motion.button
                  className="input-action-btn"
                  onClick={handleVirtualKeyboard}
                  title="Virtual Keyboard"
                  whileHover={{ scale: 1.1, color: userPreferences.colorTheme }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    color: userPreferences.themeSettings.textSecondary,
                  }}
                >
                  <Keyboard size={22} />
                </motion.button>
                <motion.button
                  className="input-action-btn"
                  onClick={() => {
                    alert("Camera feature coming soon!");
                  }}
                  title="Take photo"
                  whileHover={{ scale: 1.1, color: userPreferences.colorTheme }}
                  whileTap={{ scale: 0.9 }}
                  style={{ color: userPreferences.themeSettings.textSecondary }}
                >
                  <Video size={22} />
                </motion.button>

                <motion.button
                  className="input-action-btn"
                  onClick={handleFAQOpen}
                  title="FAQ"
                  whileHover={{ scale: 1.1, color: userPreferences.colorTheme }}
                  whileTap={{ scale: 0.9 }}
                  style={{ color: userPreferences.themeSettings.textSecondary }}
                >
                  <HelpCircle size={22} />
                </motion.button>

                <motion.button
                  className="input-action-btn"
                  onClick={handleMicPress2}
                  title="FAQ"
                  whileHover={{ scale: 1.1, color: userPreferences.colorTheme }}
                  whileTap={{ scale: 0.9 }}
                  style={{ color: userPreferences.themeSettings.textSecondary }}
                >
                  <BsSoundwave size={22} />
                </motion.button>
              </div>
              <div className="input-area">
                <textarea
                  className="inputtextarea"
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isBanned
                      ? "Session terminated"
                      : isRecording
                      ? "Recording..."
                      : "Type your message..."
                  }
                  disabled={isTyping || isRecording || isBanned}
                  style={{
                    background: userPreferences.themeSettings.background,
                    color: userPreferences.themeSettings.text,
                    border: `1px solid ${userPreferences.themeSettings.border}`,
                  }}
                ></textarea>

                <div className="input-actions">
                  <motion.button
                    className="send-btn"
                    onClick={handleSendMessage}
                    disabled={
                      !inputValue.trim() || isTyping || isRecording || isBanned
                    }
                    title="Send message"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background:
                        inputValue.trim() &&
                        !isTyping &&
                        !isRecording &&
                        !isBanned
                          ? userPreferences.colorTheme
                          : userPreferences.themeSettings.textSecondary,
                      color: "white",
                    }}
                  >
                    <Send size={18} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language Selector Modal */}
      <LanguageSelector
        isOpen={languageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
      />

      {/* Customization Modals */}
      <ColorPaletteModal
        isOpen={colorPaletteOpen}
        onClose={() => setColorPaletteOpen(false)}
        onColorSelect={handleColorChange}
        currentColor={userPreferences.colorTheme}
      />

      <FontCustomizer
        isOpen={fontCustomizerOpen}
        onClose={() => setFontCustomizerOpen(false)}
        onFontChange={handleFontChange}
        currentSettings={userPreferences.fontSettings}
      />

      <ThemeCustomizer
        isOpen={themeCustomizerOpen}
        onClose={() => setThemeCustomizerOpen(false)}
        onThemeChange={handleThemeChange}
        currentTheme={userPreferences.themeSettings}
      />

      <GreetingCustomizer
        isOpen={greetingCustomizerOpen}
        onClose={() => setGreetingCustomizerOpen(false)}
        onGreetingChange={handleGreetingChange}
        currentGreeting={userPreferences.greetingSettings}
      />

      {/* Upload Form Modal */}
      <AnimatePresence>
        {showUploadForm && (
          <UploadForm
            onSubmit={handleUploadFormSubmit}
            onClose={() => setShowUploadForm(false)}
            userPreferences={userPreferences}
          />
        )}
      </AnimatePresence>

      {/* FAQ Modal */}
      <AnimatePresence>
        {faqOpen && (
          <motion.div
            className="faq-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleFAQClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <motion.div
              className="faq-modal-content"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: userPreferences.themeSettings.surface,
                borderRadius: "12px",
                padding: "20px",
                width: window.innerWidth < 900 ? "95vw" : "800px",
                height: window.innerHeight < 700 ? "90vh" : "600px",
                overflow: "auto",
                border: `1px solid ${userPreferences.themeSettings.border}`,
                boxShadow: userPreferences.themeSettings.shadow,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <motion.button
                  onClick={handleFAQClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: userPreferences.themeSettings.textSecondary,
                    fontSize: "1.5rem",
                  }}
                >
                  <X size={24} />
                </motion.button>
              </div>
              <div style={{ color: userPreferences.themeSettings.text }}>
                <MultilingualFAQ onFAQQuestionClick={handleFAQQuestionClick} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VirtualKeyboard
        isOpen={virtualKeyboardOpen}
        onClose={handleVirtualKeyboardClose}
        onTextInput={handleVirtualKeyboardInput}
        currentText={inputValue}
        defaultLanguage={currentLanguage}
      />
    </div>
  );
};

export default Chatbot;
