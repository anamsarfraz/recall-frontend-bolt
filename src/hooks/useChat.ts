import { useState, useCallback } from "react";
import { queryKnowledgeBase } from "./useKnowledgeBase";
import { submitQueryFeedback } from "./useQueryFeedback";
import { ChatMessage } from "../types";

export const useChat = (videoId?: string, onVideoUpdate?: (videoPath: string, timestamp: number) => void) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState<string>("");
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<ChatMessage | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      type: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingResponse("");
    setCurrentStreamingMessage(null);

    try {
      // Create initial streaming message
      const loadingMessage: ChatMessage = {
        id: `loading-${Date.now()}`,
        type: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, loadingMessage]);
      setCurrentStreamingMessage(loadingMessage);

      let finalResponse: any = null;
      
      // Handle streaming updates
      const handleStreamUpdate = (chunk: any) => {
        finalResponse = chunk;
        
        // Update the streaming message content
        const updatedMessage: ChatMessage = {
          ...loadingMessage,
          content: chunk.response,
          videoTimestamp: chunk.start_time,
          videoPath: chunk.video_path,
          originalQuery: content,
          knowledgeBaseId: videoId,
        };
        
        setCurrentStreamingMessage(updatedMessage);
        
        // Update the message in the messages array
        setMessages((prev) => 
          prev.map(msg => 
            msg.id === loadingMessage.id ? updatedMessage : msg
          )
        );
        
        // Proactively update video if callback provided
        if (onVideoUpdate && chunk.video_path && chunk.start_time !== undefined) {
          onVideoUpdate(chunk.video_path, chunk.start_time);
        }
      };

      // Start the streaming API call
      await queryKnowledgeBase(videoId!, content, 5, handleStreamUpdate);
      
      setStreamingResponse("");
      setCurrentStreamingMessage(null);
      
      // Ensure we have a final response
      if (!finalResponse) {
        throw new Error("No response received from streaming API");
      }

      // Create final message with complete response
      const finalMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        content: finalResponse.response,
        timestamp: new Date().toISOString(),
        videoTimestamp: finalResponse.start_time,
        videoPath: finalResponse.video_path,
        originalQuery: content,
        knowledgeBaseId: videoId,
      };

      // Replace streaming message with final message
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === loadingMessage.id ? finalMessage : msg
        )
      );

    } catch (error) {
      console.error("Error querying knowledge base:", error);
      
      // Clear streaming state
      setStreamingResponse("");
      setCurrentStreamingMessage(null);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: "assistant",
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date().toISOString(),
      };
      
      setMessages((prev) => 
        prev.map(msg => 
          msg.id?.startsWith('loading-') ? errorMessage : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [videoId, onVideoUpdate]);

  const submitFeedback = useCallback(
    async (
      messageId: string,
      feedback: "positive" | "negative",
      comment?: string
    ) => {
      // Find the message to get the required data
      const message = messages.find(msg => msg.id === messageId);
      if (!message || message.type !== "assistant" || !message.originalQuery || !message.knowledgeBaseId) {
        console.error("Cannot submit feedback: missing required message data", {
          messageFound: !!message,
          isAssistant: message?.type === "assistant",
          hasOriginalQuery: !!message?.originalQuery,
          hasKnowledgeBaseId: !!message?.knowledgeBaseId,
          message: message
        });
        return;
      }

      // Optimistically update UI
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, feedback, feedbackComment: comment }
            : msg
        )
      );

      try {
        // Prepare the feedback data with proper validation
        const feedbackData = {
          knowledge_base_id: parseInt(message.knowledgeBaseId, 10), // Convert to integer
          query: message.originalQuery,
          response: message.content,
          thumbs_up: feedback === "positive", // Required boolean field
          // Only include comments if provided and not empty
          ...(comment && comment.trim() && { comments: comment.trim() })
        };

        // Validate the knowledge_base_id is a valid integer
        if (isNaN(feedbackData.knowledge_base_id)) {
          throw new Error(`Invalid knowledge base ID: ${message.knowledgeBaseId}`);
        }

        console.log('Submitting feedback with data:', feedbackData);

        // Submit feedback to API
        const result = await submitQueryFeedback(feedbackData);

        if (result.success) {
          console.log("Query feedback submitted successfully");
          // Show success message (you could add a toast notification here)
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error("Failed to submit query feedback:", error);
        
        // Revert UI changes on error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, feedback: undefined, feedbackComment: undefined }
              : msg
          )
        );
        
        // You could show an error toast here
        alert("Failed to submit feedback. Please try again.");
      }
    },
    [messages]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setStreamingResponse("");
  }, []);

  return {
    messages,
    isLoading,
    streamingResponse,
    sendMessage,
    submitFeedback,
    clearChat,
  };
};