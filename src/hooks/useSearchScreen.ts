import { useCallback, useEffect, useState } from "react";
import { useSearchStore } from "../stores/searchStore";
import { useSearchHistoryStore } from "../stores/searchHistoryStore";
import { navigateToAnime } from "../utils/navigation";
import { useDebounce } from "./useDebounce";

type SearchStatus = "idle" | "typing" | "searching" | "searched";

// The source site rejects queries shorter than 3 characters
export const MIN_SEARCH_LENGTH = 3;

export function useSearchScreen() {
  const fetchSearch = useSearchStore((s) => s.fetchSearch);
  const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
  const searchAnimes = useSearchStore((s) => s.searchAnimes);
  const suggestions = useSearchStore((s) => s.suggestions);
  const isLoading = useSearchStore((s) => s.isSearchLoading);
  const error = useSearchStore((s) => s.error);
  const lastSearchTerm = useSearchStore((s) => s.lastSearchTerm);
  const setStoreSearchTerm = useSearchStore((s) => s.setSearchTerm);
  const resetStoreSearch = useSearchStore((s) => s.resetSearch);
  const clearSuggestions = useSearchStore((s) => s.clearSuggestions);
  const cancelSearch = useSearchStore((s) => s.cancelSearch);

  const recentSearches = useSearchHistoryStore((s) => s.recentSearches);
  const saveRecentSearch = useSearchHistoryStore((s) => s.saveRecentSearch);
  const removeRecentSearch = useSearchHistoryStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useSearchHistoryStore((s) => s.clearRecentSearches);

  const [state, setState] = useState<{ term: string; status: SearchStatus }>({
    term: lastSearchTerm,
    status: lastSearchTerm ? "searched" : "idle",
  });
  const debouncedTerm = useDebounce(state.term, 300);

  useEffect(() => {
    const length = debouncedTerm.trim().length;
    if (length >= MIN_SEARCH_LENGTH && state.status === "typing") {
      void fetchSuggestions(debouncedTerm);
      return;
    }
    // Stale suggestions must not linger while the term is below the minimum
    // (e.g. editing a searched term from "jojo" down to "jo")
    if (length < MIN_SEARCH_LENGTH && suggestions.length > 0) {
      clearSuggestions();
    }
    if (length === 0 && searchAnimes.length > 0) {
      resetStoreSearch();
    }
  }, [debouncedTerm, fetchSuggestions, state.status, suggestions.length, searchAnimes.length, clearSuggestions, resetStoreSearch]);

  const executeSearch = useCallback(
    async (term: string, force = false) => {
      const trimmed = term.trim();
      if (trimmed.length < MIN_SEARCH_LENGTH) return;
      cancelSearch();
      setState({ term, status: "searching" });
      setStoreSearchTerm(trimmed);
      try {
        await fetchSearch(trimmed, force);
        void saveRecentSearch(trimmed);
      } finally {
        setState({ term, status: "searched" });
      }
    },
    [fetchSearch, setStoreSearchTerm, saveRecentSearch, cancelSearch],
  );

  const handleSearch = useCallback(
    (term: string | null | undefined) => {
      if (term == null || term === "") return;
      void executeSearch(term);
    },
    [executeSearch],
  );

  const retrySearch = useCallback(() => {
    void executeSearch(state.term, true);
  }, [executeSearch, state.term]);

  const handleTextChange = useCallback((text: string) => {
    const trimmed = text.trim();
    setState({ term: text, status: trimmed.length > 0 ? "typing" : "idle" });
  }, []);

  const resetSearch = useCallback(() => {
    cancelSearch();
    setState({ term: "", status: "idle" });
    resetStoreSearch();
  }, [resetStoreSearch, cancelSearch]);

  const handleSelectSuggestion = useCallback(
    (suggestion: { slug: string }) => {
      const trimmed = state.term.trim();
      if (trimmed) {
        void saveRecentSearch(trimmed);
        setStoreSearchTerm(trimmed);
      }
      if (suggestion.slug) navigateToAnime(suggestion.slug);
    },
    [state.term, saveRecentSearch, setStoreSearchTerm],
  );

  return {
    searchTerm: state.term,
    searchAnimes,
    suggestions,
    recentSearches,
    isLoading,
    error,
    isIdle: state.status === "idle",
    isTyping: state.status === "typing",
    isSearched: state.status === "searched",
    handleSearch,
    handleTextChange,
    resetSearch,
    retrySearch,
    removeRecentSearch,
    clearRecentSearches,
    handleSelectSuggestion,
  };
}
