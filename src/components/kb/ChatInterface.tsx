import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, ThumbsUp, ThumbsDown, Volume2, VolumeX } from "lucide-react";
import { ChatMessage } from "../../types";
import FeedbackModal from "./FeedbackModal";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingResponse?: string;
  onTimestampClick?: (timestamp: number, videoPath?: string) => void;
  onFeedback?: (
    messageId: string,
    feedback: "positive" | "negative",
    comment?: string
  ) => void;
  isVoiceInput: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  streamingResponse,
  onTimestampClick,
  onFeedback,
  isVoiceInput,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    messageId: string;
  }>({ isOpen: false, messageId: "" });

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const currentObjectUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSpokenMessageRef = useRef<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingMessageId, setCurrentSpeakingMessageId] = useState<string | null>(null);

  const apiKey = "sk_667baab04117c3e8d96ca9e27be53aa0a1e680646b3cdf41";

  // Auto-play voice output only for voice input responses
  useEffect(() => {
    console.log("Voice input effect triggered:", { isVoiceInput, messagesLength: messages.length });
    
    if (!isVoiceInput) {
      console.log("Not voice input, skipping auto-play");
      return;
    }

    const lastMessage = messages[messages.length - 1];
    console.log("Last message:", lastMessage);
    
    if (
      !lastMessage ||
      lastMessage.type !== "assistant" ||
      !lastMessage.content ||
      lastMessage.content === lastSpokenMessageRef.current ||
      lastMessage.id?.startsWith('loading-')
    ) {
      console.log("Skipping auto-play:", {
        hasMessage: !!lastMessage,
        isAssistant: lastMessage?.type === "assistant",
        hasContent: !!lastMessage?.content,
        alreadySpoken: lastMessage?.content === lastSpokenMessageRef.current,
        isLoading: lastMessage?.id?.startsWith('loading-')
      });
      return;
    }

    // Only auto-play if this is a voice input session AND the message is new
    console.log("Auto-playing TTS for voice input response:", lastMessage.content);
    speakText(lastMessage.content, lastMessage.id || '');
    lastSpokenMessageRef.current = lastMessage.content;

    return () => {
      // Cleanup on unmount or dependency change
      stopSpeaking();
    };
  }, [messages, isVoiceInput]);

  const speakText = async (text: string, messageId: string) => {
    // Cancel any ongoing request
    stopSpeaking();

    if (!apiKey) {
      console.error("ElevenLabs API key is not set");
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsSpeaking(true);
    setCurrentSpeakingMessageId(messageId);

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();

      // Clean up previous URL
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(audioBlob);
      currentObjectUrlRef.current = objectUrl;

      audioRef.current.src = objectUrl;
      
      // Add event listeners
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        setCurrentSpeakingMessageId(null);
      };
      
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        setCurrentSpeakingMessageId(null);
        console.error("Audio playback failed");
      };

      await audioRef.current.play();
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("TTS Error:", error);
      }
      setIsSpeaking(false);
      setCurrentSpeakingMessageId(null);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const stopSpeaking = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
    setIsSpeaking(false);
    setCurrentSpeakingMessageId(null);
  };

  const handleManualSpeak = (text: string, messageId: string) => {
    if (currentSpeakingMessageId === messageId && isSpeaking) {
      stopSpeaking();
    } else {
      speakText(text, messageId);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: number): string => {
    const totalSeconds = Math.floor(timestamp);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePositiveFeedback = (messageId: string) => {
    onFeedback?.(messageId, "positive");
  };

  const handleNegativeFeedback = (messageId: string) => {
    setFeedbackModal({ isOpen: true, messageId });
  };

  const handleFeedbackSubmit = (comment: string) => {
    onFeedback?.(feedbackModal.messageId, "negative", comment);
    setFeedbackModal({ isOpen: false, messageId: "" });
  };

  const handleFeedbackCancel = () => {
    setFeedbackModal({ isOpen: false, messageId: "" });
  };

  const handleTimestampClick = (timestamp: number, videoPath?: string) => {
    console.log("ChatInterface handleTimestampClick:", { timestamp, videoPath });
    if (onTimestampClick) {
      onTimestampClick(timestamp, videoPath);
    }
  };

  return (
    <>
      <div className="flex h-96 flex-col overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="border-b bg-muted/50 px-4 py-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-card-foreground">
              AI Assistant
            </h3>
            {isSpeaking && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopSpeaking}
                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <VolumeX className="h-3 w-3" />
                <span>Stop</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex max-w-[80%] space-x-2 ${
                    message.type === "user"
                      ? "flex-row-reverse space-x-reverse"
                      : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {message.type === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className="flex flex-col space-y-2">
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.type === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>

                      {/* Timestamp Link */}
                      {message.videoTimestamp !== undefined && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleTimestampClick(message.videoTimestamp!, message.videoPath)}
                          className="mt-2 inline-flex items-center space-x-1 rounded bg-primary/20 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/30"
                        >
                          <span>Jump to answer</span>
                        </motion.button>
                      )}

                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-xs opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        
                        {/* Manual TTS Button for Assistant Messages - Always show */}
                        {message.type === "assistant" && message.content && !message.id?.startsWith('loading-') && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleManualSpeak(message.content, message.id || `${index}`)}
                            className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                              currentSpeakingMessageId === (message.id || `${index}`) && isSpeaking
                                ? "bg-primary/20 text-primary"
                                : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted-foreground/10"
                            }`}
                            title={
                              currentSpeakingMessageId === (message.id || `${index}`) && isSpeaking
                                ? "Stop speaking"
                                : "Read aloud"
                            }
                          >
                            {currentSpeakingMessageId === (message.id || `${index}`) && isSpeaking ? (
                              <VolumeX className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* Feedback Buttons for Assistant Messages */}
                    {message.type === "assistant" && onFeedback && message.content && !message.id?.startsWith('loading-') && (
                      <div className="flex items-center space-x-2 px-1">
                        <span className="text-xs text-muted-foreground">
                          Was this helpful?
                        </span>
                        <div className="flex space-x-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handlePositiveFeedback(message.id || `${index}`)}
                            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                              message.feedback === "positive"
                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                : "text-muted-foreground hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                            }`}
                            title="Helpful"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleNegativeFeedback(message.id || `${index}`)}
                            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                              message.feedback === "negative"
                                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                : "text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            }`}
                            title="Not helpful"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading Indicator with Streaming Response */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg bg-muted px-3 py-2 min-w-[120px]">
                  {streamingResponse ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{streamingResponse}</span>
                      <div className="flex space-x-1">
                        <div className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"></div>
                        <div className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"></div>
                        <div className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onSubmit={handleFeedbackSubmit}
        onCancel={handleFeedbackCancel}
      />
    </>
  );
};

export default ChatInterface;