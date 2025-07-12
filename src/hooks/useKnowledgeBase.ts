import { useQuery } from "@tanstack/react-query";
import {
  KnowledgeBase,
  SearchFilters,
  KnowledgeBaseResponse,
  IQueryResponse,
} from "../types";

import axios from "axios";

const API_BASE_URL = "https://api.videoindex.app";

export const useKnowledgeBases = (filters?: SearchFilters) => {
  return useQuery({
    queryKey: ["knowledgeBases", filters],
    queryFn: async () => {
      const url = new URL(`${API_BASE_URL}/knowledge-bases`);

      // Add query parameters
      if (filters) {
        if (filters.query) url.searchParams.append("query", filters.query);
        if (filters.tags.length) {
          filters.tags.forEach((tag) => url.searchParams.append("tags", tag));
        }
      }

      console.log('Fetching knowledge bases from:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch knowledge bases:', response.status, response.statusText);
        throw new Error(`Failed to fetch knowledge bases: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Knowledge bases response:', data);
      return data as KnowledgeBase[];
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const fetchKnowledgeBase = (id: string) => {
  return useQuery({
    queryKey: ["knowledgeBase", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/knowledge-bases/${id}`);
      if (!response.ok) throw new Error("Knowledge base not found");

      // Store the parsed JSON data
      const data: KnowledgeBaseResponse = await response.json();

      // Now you can log and use the actual data
      console.log("Knowledge base response:", data);
      return data;
    },
  });
};

export const queryKnowledgeBase = async (
  knowledge_base_id: string,
  query: string,
  max_results: number = 5,
  onStreamUpdate?: (chunk: IQueryResponse) => void
): Promise<IQueryResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        knowledge_base_id: parseInt(knowledge_base_id, 10),
        query,
        max_results,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body available for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastCompleteChunk: IQueryResponse | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete JSON objects from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the incomplete line in buffer
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            try {
              const chunk: IQueryResponse = JSON.parse(trimmedLine);
              lastCompleteChunk = chunk;
              
              // Call the streaming update callback if provided
              if (onStreamUpdate) {
                onStreamUpdate(chunk);
              }
            } catch (parseError) {
              console.warn('Failed to parse JSON chunk:', trimmedLine, parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Process any remaining data in buffer
    if (buffer.trim()) {
      try {
        const finalChunk: IQueryResponse = JSON.parse(buffer.trim());
        lastCompleteChunk = finalChunk;
        if (onStreamUpdate) {
          onStreamUpdate(finalChunk);
        }
      } catch (parseError) {
        console.warn('Failed to parse final JSON chunk:', buffer, parseError);
      }
    }

    if (!lastCompleteChunk) {
      throw new Error('No valid response chunks received');
    }

    return lastCompleteChunk;
  } catch (error) {
    console.error("Error while querying the knowledge base:", error);
    throw new Error("Failed to fetch data from the knowledge base.");
  }
};
