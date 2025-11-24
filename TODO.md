# TODO for Removing Word Bank Duplication and Fixing Errors

- [ ] Refactor src/components/WordScramble.tsx:
  - Remove static wordBanks object.
  - Add API call to fetch word list for selected difficulty from backend /api/game/words/:difficulty.
  - Store the fetched list in local state.
  - Update loadNewWord() to pick a random word from fetched list instead of static wordBanks.
  - Handle API loading errors and fallback gracefully.
- [ ] Verify apiClient usage for proper API requests.
- [ ] Test full gameplay in WordScramble to ensure correct word loading and scoring.
- [ ] Review backend/routes/game.js to verify the word bank correctness.
- [ ] Perform a scan for any other code duplicates or errors, fix if found.
- [ ] Run full app test to confirm no regressions.

# Notes
- Backend /words/:difficulty will remain single source of truth for word list.
- Frontend will dynamically fetch words based on difficulty.
