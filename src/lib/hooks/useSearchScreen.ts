import { useCallback, useEffect, useState } from "react";
import { useSearchStore } from "../store/searchStore";
import { useSearchHistoryStore } from "../store/user";
import { navigateToAnime } from "../utils/navigation";
import { useDebounce } from "./useDebounce";

type SearchStatus = "idle" | "typing" | "searching" | "searched";

interface SearchState {
  term: string;
  status: SearchStatus;
}

export function useSearchScreen() {
  const {
    fetchSearch,
    fetchSuggestions,
    searchAnimes,
    suggestions,
    isSearchLoading: isLoading,
    lastSearchTerm,
    setSearchTerm: setStoreSearchTerm,
    resetSearch: resetStoreSearch,
    cancelSearch,
  } = useSearchStore();

  const { recentSearches, saveRecentSearch, removeRecentSearch, clearRecentSearches } = useSearchHistoryStore();

  const [state, setState] = useState<SearchState>({
    term: lastSearchTerm,
    status: lastSearchTerm ? "searched" : "idle",
  });
  const debouncedTerm = useDebounce(state.term, 300);

  useEffect(() => {
    if (debouncedTerm.trim().length > 0 && state.status === "typing") {
      void fetchSuggestions(debouncedTerm);
    }
    if (debouncedTerm.trim().length === 0 && suggestions.length > 0) {
      resetStoreSearch();
    }
  }, [debouncedTerm, fetchSuggestions, state.status, suggestions.length, resetStoreSearch]);

  const executeSearch = useCallback(async (term: string, force = false) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    cancelSearch();

    setState({ term, status: "searching" });
    setStoreSearchTerm(trimmed);

    try {
      await fetchSearch(trimmed, force);
      void saveRecentSearch(trimmed);
    } finally {
      // Always transition to searched, even if fetch failed
      setState({ term, status: "searched" });
    }
  }, [fetchSearch, setStoreSearchTerm, saveRecentSearch, cancelSearch]);

  const handleSearch = useCallback((term: string | null | undefined): void => {
    if (term == null || term === '') return;
    void executeSearch(term);
  }, [executeSearch]);

  const retrySearch = useCallback(() => {
    void executeSearch(state.term, true);
  }, [executeSearch, state.term]);

  const handleTextChange = useCallback((text: string) => {
    const trimmed = text.trim();
    setState({
      term: text,
      status: trimmed.length > 0 ? "typing" : "idle"
    });
  }, []);

  const resetSearch = useCallback(() => {
    cancelSearch();
    setState({ term: "", status: "idle" });
    resetStoreSearch();
  }, [resetStoreSearch, cancelSearch]);

  const handleSelectSuggestion = useCallback((suggestion: { slug: string }) => {
    const trimmed = state.term.trim();
    if (trimmed) {
      void saveRecentSearch(trimmed);
      setStoreSearchTerm(trimmed);
    }
    if (suggestion.slug) {
      navigateToAnime(suggestion.slug);
    }
  }, [state.term, saveRecentSearch, setStoreSearchTerm]);

  return {
    searchTerm: state.term,
    searchAnimes,
    suggestions,
    recentSearches,
    isLoading,
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
