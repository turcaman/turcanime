import { useCallback, useEffect, useState } from "react";
import { useAnimeStore } from "../store/animeStore";
import { useUserStore } from "../store/userStore";
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
  } = useAnimeStore();

  const { recentSearches, saveRecentSearch, removeRecentSearch } = useUserStore();

  const [state, setState] = useState<SearchState>({
    term: lastSearchTerm,
    status: lastSearchTerm ? "searched" : "idle",
  });
  const debouncedTerm = useDebounce(state.term, 300);

  // Fetch suggestions when user types (only in typing state with text)
  useEffect(() => {
    if (debouncedTerm.trim().length > 0 && state.status === "typing") {
      fetchSuggestions(debouncedTerm);
    }
    // Clear suggestions when text is empty
    if (debouncedTerm.trim().length === 0 && suggestions.length > 0) {
      resetStoreSearch();
    }
  }, [debouncedTerm, fetchSuggestions, state.status, suggestions.length, resetStoreSearch]);

  const executeSearch = useCallback(async (term: string, force = false) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    // Cancel any ongoing search first
    cancelSearch();

    setState({ term, status: "searching" });
    setStoreSearchTerm(trimmed);

    try {
      await fetchSearch(trimmed, force);
      saveRecentSearch(trimmed);
    } finally {
      // Always transition to searched, even if fetch failed
      setState({ term, status: "searched" });
    }
  }, [fetchSearch, setStoreSearchTerm, saveRecentSearch, cancelSearch]);

  const handleSearch = useCallback((term: string | null | undefined) => {
    if (!term) return;
    executeSearch(term);
  }, [executeSearch]);

  const retrySearch = useCallback(() => {
    executeSearch(state.term, true);
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
      saveRecentSearch(trimmed);
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
    handleSelectSuggestion,
  };
}
