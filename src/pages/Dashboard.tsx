import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter } from 'lucide-react';
import { useKnowledgeBases } from '../hooks/useKnowledgeBase';
import { SearchFilters } from '../types';
import KnowledgeBaseCard from '../components/dashboard/KnowledgeBaseCard';
import SearchBar from '../components/dashboard/SearchBar';

const Dashboard: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tags: [],
    dateRange: {},
    duration: {}
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: knowledgeBases, isLoading, error } = useKnowledgeBases(filters);

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h2>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Knowledge Bases</h1>
            <p className="text-muted-foreground">
              Manage and explore your video knowledge bases
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create New</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="mb-8">
        <SearchBar
          onSearch={handleSearch}
          onFilterToggle={() => setShowFilters(!showFilters)}
          placeholder="Search knowledge bases..."
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 rounded-xl bg-muted mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Knowledge Bases Grid */}
      {!isLoading && knowledgeBases && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases.map((kb, index) => (
            <KnowledgeBaseCard
              key={kb.id}
              knowledgeBase={kb}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && knowledgeBases?.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
            <Filter className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No knowledge bases found</h3>
          <p className="text-muted-foreground mb-6">
            {filters.query ? 'Try adjusting your search terms' : 'Create your first knowledge base to get started'}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Create Knowledge Base</span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;