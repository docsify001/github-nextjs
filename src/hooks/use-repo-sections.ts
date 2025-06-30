import { useState, useCallback } from 'react';

export type RepoSection = 'basic' | 'activity' | 'technical' | 'social' | 'release';

export function useRepoSections() {
  const [expandedSections, setExpandedSections] = useState<Set<RepoSection>>(new Set(['basic']));

  const toggleSection = useCallback((section: RepoSection) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      return newExpanded;
    });
  }, []);

  const expandSection = useCallback((section: RepoSection) => {
    setExpandedSections(prev => new Set([...prev, section]));
  }, []);

  const collapseSection = useCallback((section: RepoSection) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      newExpanded.delete(section);
      return newExpanded;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedSections(new Set(['basic', 'activity', 'technical', 'social', 'release']));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set(['basic']));
  }, []);

  const isExpanded = useCallback((section: RepoSection) => {
    return expandedSections.has(section);
  }, [expandedSections]);

  return {
    expandedSections,
    toggleSection,
    expandSection,
    collapseSection,
    expandAll,
    collapseAll,
    isExpanded,
  };
} 