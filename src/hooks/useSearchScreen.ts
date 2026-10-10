import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchStore } from "../stores/searchStore";
import { errorFor } from "../utils/resource";
import { useSearchHistoryStore } from "../stores/searchHistoryStore";
import { navigateToAnime } from "../utils/navigation";
import { useDebounce } from "./useDebounce";

type SearchStatus = "idle" | "typing" | "searching" | "searched";

// The source site rejects queries shorter than 3 characters
export const MIN_SEARCH_LENGTH = 3;

export function useSearchScreen() {
  const fetchSearch = useSearchStore((s) => s.fetchSearch);
  const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
  const results = useSearchStore((s) => s.results);
  const suggestionsResource = useSearchStore((s) => s.suggestions);
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
  // Bumped by every local transition; an async completion only lands if its
  // token still matches, so a superseded search cannot resurrect "searched"
  const searchTokenRef = useRef(0);
  const debouncedTerm = useDebounce(state.term, 300);

  const searchAnimes = useMemo(() => results.data ?? [], [results.data]);
  const suggestions = useMemo(() => suggestionsResource.data ?? [], [suggestionsResource.data]);
  const isLoading = results.status === "loading";
  const error = errorFor(results, results.key ?? "");

  useEffect(() => {
    const length = debouncedTerm.trim().length;
    if (length >= MIN_SEARCH_LENGTH && state.status === "typing") {
      void fetchSuggestions(debouncedTerm);
      return;
    }
    // Stale suggestions must not linger while the term is below the minimum
    // (e.g. editing a searched term from "jojo" down to "jo")
    // Never reset results here: with debouncedTerm lagging behind a fresh
    // search this effect would wipe just-loaded results
    if (length < MIN_SEARCH_LENGTH && suggestions.length > 0) {
      clearSuggestions();
    }
  }, [debouncedTerm, fetchSuggestions, state.status, suggestions.length, clearSuggestions]);

  const executeSearch = useCallback(
    async (term: string, force = false) => {
      const trimmed = term.trim();
      if (trimmed.length < MIN_SEARCH_LENGTH) return;
      cancelSearch();
      const token = ++searchTokenRef.current;
      setState({ term, status: "searching" });
      setStoreSearchTerm(trimmed);
      try {
        await fetchSearch(trimmed, force);
      } finally {
        // The search was superseded (input cleared or replaced while in flight):
        // don't resurrect "searched", which would show empty results over idle
        if (searchTokenRef.current === token) {
          void saveRecentSearch(trimmed);
          setState({ term, status: "searched" });
        }
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
    searchTokenRef.current += 1;
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      // Clearing the input resets immediately; doing it here (not in the
      // debounced effect) avoids wiping results of an in-flight search
      resetStoreSearch();
      setState({ term: text, status: "idle" });
      return;
    }
    setState({ term: text, status: "typing" });
  }, [resetStoreSearch]);

  const resetSearch = useCallback(() => {
    searchTokenRef.current += 1;
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
