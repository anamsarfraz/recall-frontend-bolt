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
  max_results: number = 5
): Promise<IQueryResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/query`, {
      knowledge_base_id,
      query,
      max_results,
    });

    if (response.status !== 200)
      throw new Error("Failed to fetch data from the knowledge base.");

    const data: IQueryResponse = await response.data;
    console.log("Query response:", data);
    return data;
  } catch (error) {
    console.error("Error while querying the knowledge base:", error);
    throw new Error("Failed to fetch data from the knowledge base.");
  }
};
