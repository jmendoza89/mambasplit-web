# Refactoring Roadmap - Remaining Improvements

This document tracks the remaining code quality improvements identified during the code review. Issues #1, #2, #3, and #6 have been completed in PR #[TBD].

## 🟠 HIGH Priority (Recommended Next Steps)

### #4: Token Refresh Race Condition Improvements
**Estimated Time:** 2 hours  
**File:** `src/api.js` (lines 48-73)

**Current Issue:**
- `refreshInFlight` promise caching prevents concurrent refreshes but has subtle issues
- No timeout mechanism for hanging requests  
- Error state isn't cached, could cause refresh storm
- Finally block sets to null even on error

**Improvements Needed:**
- Add timeout wrapper (e.g., 10s)
- Cache errors temporarily to prevent retry storm
- Add exponential backoff for failed refreshes
- Better error recovery logic

---

### #5: State Update Race Conditions
**Estimated Time:** 3 hours  
**Files:** `src/controllers/useDashboardController.js`, `src/controllers/useGroupController.js`

**Current Issue:**
Complex state update logic with potential race conditions in `setGroupOwnershipById` and similar updates.

**Improvements Needed:**
- Use `useReducer` for complex state updates
- Add state normalization layer
- Keep derived state separate from source state
- Add tests for concurrent state updates

---

### #7: Missing Error States for Operations
**Estimated Time:** 2 hours  
**Files:** All controllers

**Current Issue:**
Some async operations don't show loading indicators:
- Group deletion
- Expense deletion  
- Invite acceptance

**Improvements Needed:**
- Add granular loading states per operation
- Use loading state object: `{ deleting: { [id]: boolean } }`
- Show loading spinners for each operation
- Disable action buttons during operations

---

### #8: Memory Leaks in Effects
**Estimated Time:** 1 hour  
**File:** `src/controllers/useAuthController.js` (lines 56-76)

**Current Issue:**
Google script loading adds event listeners that may not be cleaned up properly.

**Improvements Needed:**
- Ensure all event listeners have cleanup
- Add abort controllers for fetch requests
- Cancel pending promises on unmount
- Add useEffect cleanup functions

---

## 🟡 MEDIUM Priority (Plan for Later)

### #9: Expense Normalization Complexity
**Estimated Time:** 2 hours  
**File:** `src/models/expenseModel.js` (lines 3-33)

**Current Issue:**
Deep nested property access with multiple fallbacks. Hard to understand data shape.

**Improvements Needed:**
- Document expected input/output schemas (JSDoc or TypeScript)
- Extract fallback chains into named helper functions
- Consider using optional chaining more consistently
- Add unit tests for edge cases

---

### #10: No Optimistic Updates
**Estimated Time:** 4 hours  
**Files:** All controllers

**Current Issue:**
All mutations wait for server response before updating UI. This feels sluggish.

**Improvements Needed:**
- Implement optimistic updates for create/delete operations
- Add rollback logic on failure
- Show pending states differently from completed states (opacity, icons)
- Add success animations

---

### #11: localStorage Not Synced Across Tabs
**Estimated Time:** 1 hour  
**Files:** `src/api.js`, controllers

**Current Issue:**
Multiple places write to localStorage. No synchronization between tabs.

**Improvements Needed:**
- Add `storage` event listener to sync auth state across tabs
- Use single source of truth for user state
- Consider session storage for temporary data
- Handle logout in one tab affecting other tabs

---

### #12: Redundant Memo Chains
**Estimated Time:** 2 hours  
**File:** `src/controllers/useGroupController.js` (lines 28-87)

**Current Issue:**
Many `useMemo` hooks that recalculate on every render. Some create dependency chains.

**Improvements Needed:**
- Combine related memos to reduce dependency chains
- Profile actual render performance before over-optimizing
- Some memos may not need memoization at all
- Consider React.memo for child components instead

---

### #13: Add TypeScript or PropTypes
**Estimated Time:** 8 hours (TypeScript) or 2 hours (PropTypes)  
**Files:** All files

**Current Issue:**
No runtime or compile-time type checking.

**Improvements Needed:**
- **Option A (Recommended):** Migrate to TypeScript
  - Install TypeScript and types
  - Rename files incrementally (.jsx → .tsx)
  - Add type annotations
  - Configure strict mode gradually
  
- **Option B (Faster):** Add PropTypes
  - Install prop-types
  - Add PropTypes to all components
  - Add ESLint rules for prop validation

---

## 🟢 LOW Priority (Nice to Have)

### #14: Magic Strings & Numbers
**Estimated Time:** 1 hour  
**Files:** Multiple files

**Current Issue:**
- Storage keys defined inline
- Timeout values without explanation
- HTTP status codes checked inline

**Improvements Needed:**
- Create `src/constants/` directory
- Extract storage keys to constants
- Extract timeout values with explanatory names
- Create HTTP status code constants

---

### #15: Inconsistent Naming Conventions
**Estimated Time:** 1 hour  
**Files:** Multiple files

**Current Issue:**
- `displayedGroup` vs `selectedGroup` vs `groupDetail`
- `busy` vs `loading` vs `groupLoading`
- `netBalanceCents` suggests backend data in frontend models

**Improvements Needed:**
- Standardize naming: use `isLoading`, `isBusy` consistently
- Document when values are in cents vs dollars
- Use `fetched`, `selected`, `active` prefixes consistently
- Create naming convention guide

---

### #16: Low Test Coverage
**Estimated Time:** 6 hours  
**Files:** All `__tests__` directories

**Current Issue:**
Only 3 test files exist (now 6 updated). Many critical paths untested.

**Improvements Needed:**
- Add tests for all model functions (pure, easy to test)
- Add integration tests for controllers
- Add E2E tests for critical flows (auth, expense creation)
- Target 80%+ coverage for business logic
- Set up coverage reporting in CI/CD

---

### #17: No JSDoc Comments
**Estimated Time:** 3 hours  
**Files:** All files

**Current Issue:**
Zero inline documentation. Function purposes and parameters aren't clear.

**Improvements Needed:**
- Add JSDoc to all public functions
- Document complex algorithms
- Add usage examples for utility functions
- Add @param and @returns tags
- Configure IDE to show JSDoc on hover

---

## Implementation Strategy

### Phase 1: Quick Wins (4 hours)
Focus on high-impact, low-effort improvements:
1. **#8** - Memory leaks (1 hr)
2. **#7** - Missing error states (2 hrs)
3. **#11** - localStorage sync (1 hr)

### Phase 2: Performance & Reliability (7 hours)
1. **#4** - Token refresh improvements (2 hrs)
2. **#5** - State race conditions (3 hrs)
3. **#12** - Memo optimization (2 hrs)

### Phase 3: Long-term Quality (17+ hours)
1. **#13** - TypeScript migration (8 hrs)
2. **#10** - Optimistic updates (4 hrs)
3. **#16** - Test coverage (6 hrs)

### Phase 4: Polish (5 hours)
1. **#9** - Simplify normalization (2 hrs)
2. **#14** - Constants extraction (1 hr)
3. **#15** - Naming conventions (1 hr)
4. **#17** - JSDoc comments (3 hrs)

---

## Tracking Progress

Consider creating separate GitHub issues for each item with labels:
- `refactor` - Code quality improvements
- `priority: high` / `priority: medium` / `priority: low`
- `good-first-issue` - For simpler items like #14, #15
- `tech-debt` - General technical debt

---

## Notes

- **Completed in PR #[TBD]:**
  - ✅ #1: Code duplication (ownership detection)
  - ✅ #2: Prop drilling (React Context)
  - ✅ #3: API error handling standardization
  - ✅ #6: Input validation

- **Total Estimated Time Remaining:** ~33 hours
- **Recommended Next Sprint:** Items #4, #7, #8 (5 hours total)

---

## Product Backlog Additions (2026-03-08)

### Invite by user picker flow
**Priority:** High  
**Related backend dependency:** `MambaSplit.Api` user search + invite-by-user endpoints

**Goal:**
- Allow invite creation by selecting an existing app user instead of typing email manually.

**Planned UI/logic scope:**
- Add invite mode toggle: `By user` and `By email`.
- Add async user search input and selectable results list.
- Submit selected user through invite-by-user API when available.
- Keep email-based flow as fallback for backward compatibility.
