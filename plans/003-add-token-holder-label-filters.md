# Plan 003: Add backend-backed label filters to token holders

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat f18b415..HEAD -- lib/api/services/general/token.ts types/api/token.ts ui/pages/Token.tsx ui/token/TokenHolders ui/shared/EntityTags docs/superpowers/specs/2026-05-21-vinuexplorer-tags-everywhere-and-holders-parity-design.md ui/pages/Token.pw.tsx ui/token/TokenHolders/TokenHoldersTable.pw.tsx ui/token/TokenHolders/TokenHoldersList.pw.tsx`
>
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. On a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: backend support for holder filtering by `address_to_tags`
- **Category**: direction
- **Planned at**: commit `f18b415`, 2026-06-18

## Why this matters

Token holder rows already show public label badges such as Exchange, Meme, or
Liquidity Pool, but users cannot narrow the holder list to one of those labels.
That forces manual scanning and makes the label system less useful on one of
the highest-value token pages. This must be backend-backed, because filtering
only the current page would be misleading on a paginated holder list.

## Current state

- `docs/FORK.md:38-41` identifies public labels/tags as a fork delta and names
  the relevant frontend pages and metadata hydration hooks.
- The existing design note explicitly deferred this exact feature until there
  was backend support:

```md
// docs/superpowers/specs/2026-05-21-vinuexplorer-tags-everywhere-and-holders-parity-design.md:571
- **Tag-based filter on the Holders table** - "show me only Exchange-tagged holders"; needs backend filter on `address_to_tags`; defer until requested
```

- `lib/api/services/general/token.ts:29-33` currently allows only sort/order
  filters on token holders:

```ts
token_holders: {
  path: '/api/v2/tokens/:hash/holders',
  pathParams: [ 'hash' as const ],
  filterFields: [ 'sort' as const, 'order' as const ],
  paginated: true,
},
```

- `types/api/token.ts:163-165` matches that frontend contract:

```ts
export type TokenHoldersFilters = {
  sort?: TokenHoldersSortField;
  order?: TokenHoldersSortOrder;
};
```

- `ui/pages/Token.tsx:168-178` sends only sort/order to the holders query:

```tsx
const holdersOrderQuery = getQueryParamString(router.query.order);
const holdersOrder: 'asc' | 'desc' = holdersOrderQuery === 'asc' ? 'asc' : 'desc';

const holdersQuery = useQueryWithPages({
  resourceName: 'general:token_holders',
  pathParams: { hash: hashString },
  filters: { sort: 'value', order: holdersOrder },
```

- `ui/token/TokenHolders/TokenHolders.tsx:54-71` enriches holder rows with
  address metadata before rendering table/list views:

```tsx
const items = holdersQuery.data?.items;
const hashesForMetadata = useMemo(
  () => (items ?? []).map((i) => i.address.hash),
  [ items ],
);
const { getMetadata } = useAddressesMetadata(hashesForMetadata);

const enrichedItems = useMemo(() => {
  if (!items) return items;
  return items.map((i) => ({
    ...i,
    address: { ...i.address, metadata: getMetadata(i.address.hash) ?? i.address.metadata },
  }));
}, [ items, getMetadata ]);
```

- `ui/token/TokenHolders/TokenHoldersTableItem.tsx:43` and
  `ui/token/TokenHolders/TokenHoldersListItem.tsx:26` already render every
  meaningful non-name, non-generic tag as a label badge.
- `ui/pages/AccountsLabelSearch.tsx:170-174` is the current backend-backed
  label filter pattern for addresses:

```tsx
useQueryWithPages({
  resourceName: 'general:addresses_metadata_search',
  filters: {
    slug: isCategoryBrowse ? undefined : slug,
    tag_type: tagType,
  },
```

- `ui/shared/EntityTags/utils.ts` defines the `_category` sentinel and explains
  the category-only convention:

```ts
export const CATEGORY_BROWSE_SLUG = '_category';
```

## Backend contract required before coding

Before implementing frontend changes, verify that the backend supports:

```http
GET /api/v2/tokens/:hash/holders?sort=value&order=desc&tag_type=exchange
GET /api/v2/tokens/:hash/holders?sort=value&order=desc&tag_type=protocol&slug=some-protocol
```

Required behavior:

- Response shape remains exactly `TokenHolders`.
- Pagination is filtered globally, not just on the current page.
- `sort=value` and `order=asc|desc` still work with the tag filter.
- Category mode works by sending `tag_type` without `slug`.
- Specific-tag mode works by sending both `tag_type` and `slug`.
- Unknown labels return an empty holder list with `next_page_params: null`.

If this contract is not available, stop. Do not implement a client-only filter.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `yarn install --frozen-lockfile` | exit 0 |
| Typecheck | `yarn lint:tsc` | exit 0, no TypeScript errors |
| Lint | `yarn lint:eslint` | exit 0, no ESLint errors |
| Token page PW tests | `yarn test:pw -- ui/pages/Token.pw.tsx` | exit 0, all selected component tests pass |
| Holder PW tests | `yarn test:pw -- ui/token/TokenHolders/` | exit 0, all selected holder component tests pass |

## Scope

**In scope**:
- `lib/api/services/general/token.ts`
- `types/api/token.ts`
- `ui/pages/Token.tsx`
- `ui/token/TokenHolders/TokenHolders.tsx`
- `ui/token/TokenHolders/TokenHoldersLabelFilters.tsx` (create)
- `ui/token/TokenHolders/TokenHoldersLabelFilters.pw.tsx` (create if useful)
- `ui/pages/Token.pw.tsx`
- `ui/token/TokenHolders/TokenHoldersTable.pw.tsx`
- `ui/token/TokenHolders/TokenHoldersList.pw.tsx`

**Out of scope**:
- Backend implementation. If backend support is missing, stop and report.
- Client-side filtering of the current page.
- Changing how `EntityTag` routes to `/accounts/label/[slug]`.
- Refactoring token holder analytics, charts, CSV exports, or ranking logic.
- Public tag submission/moderation flows.

## Git workflow

- Branch: `advisor/003-token-holder-label-filters`
- Commit message style: conventional commit, for example
  `feat(holders): add label filters`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Verify or obtain the backend contract

Confirm the backend endpoint accepts `tag_type` and optional `slug` on
`/api/v2/tokens/:hash/holders`. Use a local backend, testnet backend, or the
backend PR/spec that introduced the contract.

If using a running backend, make two requests against a token known to have at
least one tagged holder:

```sh
curl '<backend>/api/v2/tokens/<hash>/holders?sort=value&order=desc&tag_type=exchange'
curl '<backend>/api/v2/tokens/<hash>/holders?sort=value&order=desc&tag_type=exchange&slug=<specific-slug>'
```

Expected: both return the normal holder response shape and do not ignore the
filter. Document the backend version or PR in the implementation notes.

**Verify**: the backend response includes only matching holders, or STOP.

### Step 2: Extend the frontend API resource and types

In `lib/api/services/general/token.ts`, update `token_holders.filterFields` to:

```ts
filterFields: [ 'sort' as const, 'order' as const, 'slug' as const, 'tag_type' as const ],
```

In `types/api/token.ts`, extend `TokenHoldersFilters`:

```ts
export type TokenHoldersFilters = {
  sort?: TokenHoldersSortField;
  order?: TokenHoldersSortOrder;
  slug?: string;
  tag_type?: string;
};
```

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 3: Map token-page query params into holder filters

In `ui/pages/Token.tsx`:

- Import `CATEGORY_BROWSE_SLUG` from `ui/shared/EntityTags/utils`.
- Read:
  - `const holderTagType = getQueryParamString(router.query.tag_type) || undefined;`
  - `const holderTagSlug = getQueryParamString(router.query.slug) || undefined;`
  - `const holderTagName = getQueryParamString(router.query.tagName) || undefined;`
- Build `holdersFilters` before `useQueryWithPages`:

```tsx
const holderTagFilters = holderTagType ? {
  tag_type: holderTagType,
  ...(holderTagSlug && holderTagSlug !== CATEGORY_BROWSE_SLUG ? { slug: holderTagSlug } : {}),
} : {};

const holdersFilters = {
  sort: 'value' as const,
  order: holdersOrder,
  ...holderTagFilters,
};
```

- Pass `filters: holdersFilters` into `useQueryWithPages`.
- Pass active filter display state and a callback down to `TokenHolders`.

The callback should call `holdersQuery.onFilterChange(...)` so pagination is
reset by the existing hook. When setting a category filter, send `tag_type`
and omit `slug`. When clearing, send only `{ sort: 'value', order: holdersOrder }`.
Preserve the current sort order.

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 4: Add the holder label filter UI

Create `ui/token/TokenHolders/TokenHoldersLabelFilters.tsx`.

Requirements:

- Render above `TokenHoldersSummaryLine`, after `TokenHoldersConcentration`.
- Use compact buttons/chips, not a page section or nested cards.
- Include category filters for the labels most relevant to token holders:
  `exchange`, `liquidity_pool`, `protocol`, `project`, `meme`, `stablecoin`,
  `burn`.
- Use `getCategoryLabel(tagType)` for display labels where available.
- Include a clear button only when a filter is active.
- Use `aria-pressed` on selected filters.
- Keep wrapping/responsive layout stable on mobile.

Suggested props:

```ts
type ActiveHolderLabelFilter = {
  tagType: string;
  slug?: string;
  tagName?: string;
};

type Props = {
  activeFilter?: ActiveHolderLabelFilter;
  isLoading?: boolean;
  onChange: (filter?: ActiveHolderLabelFilter) => void;
};
```

Do not change `EntityTag` click behavior in this plan. Existing badges should
continue to link to the global label aggregation page.

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 5: Wire the UI into TokenHolders

In `ui/token/TokenHolders/TokenHolders.tsx`:

- Add props for active filter and `onLabelFilterChange`.
- Render `TokenHoldersLabelFilters` when `token` exists and `shouldRender` is
  true.
- Place it before the summary line so users see the active scope before the
  holder count.
- Update empty state copy when a filter is active:
  - default: `There are no holders for this token.`
  - filtered: `There are no holders matching this label.`

Do not alter rank math. Ranks should continue to reflect the filtered,
backend-sorted result order.

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 6: Add Playwright coverage

Add or update tests:

- `ui/token/TokenHolders/TokenHoldersLabelFilters.pw.tsx`:
  - renders all filter buttons
  - selected filter has `aria-pressed=true`
  - clear button is absent when no filter is active and present when active
- `ui/pages/Token.pw.tsx`:
  - render the holders tab with `tag_type=exchange`
  - mock `general:token_holders` with query params including
    `{ sort: 'value', order: 'desc', tag_type: 'exchange' }`
  - assert the Exchange filter is visibly active
  - click clear and assert the next mocked holders query drops `tag_type`
- Keep `ui/token/TokenHolders/TokenHoldersTable.pw.tsx` and
  `ui/token/TokenHolders/TokenHoldersList.pw.tsx` passing.

**Verify**:

- `yarn test:pw -- ui/pages/Token.pw.tsx` -> exit 0.
- `yarn test:pw -- ui/token/TokenHolders/` -> exit 0.

### Step 7: Run final gates

**Verify**:

- `yarn lint:tsc` -> exit 0.
- `yarn lint:eslint` -> exit 0.
- `yarn test:pw -- ui/pages/Token.pw.tsx ui/token/TokenHolders/` -> exit 0.

## Test plan

- Playwright component coverage for the filter UI.
- Token page integration coverage proving URL/query state maps to backend
  `tag_type`/`slug` params.
- Existing holder table/list snapshots remain stable except for intentional
  filter UI additions.

## Done criteria

All must hold:

- [ ] Backend holder endpoint is verified to support `tag_type` and optional
      `slug` filters globally across pagination.
- [ ] `general:token_holders` accepts `sort`, `order`, `tag_type`, and `slug`.
- [ ] Token holder filters are represented in the URL as `tag_type`, optional
      `slug`, and optional `tagName`.
- [ ] Applying a filter resets pagination to page 1.
- [ ] Clearing a filter removes `tag_type` and `slug` and preserves current
      sort order.
- [ ] No client-only filtering is used for the holder list.
- [ ] Filtered empty state says `There are no holders matching this label.`
- [ ] `yarn test:pw -- ui/pages/Token.pw.tsx ui/token/TokenHolders/` exits 0.
- [ ] `yarn lint:tsc` exits 0.
- [ ] `yarn lint:eslint` exits 0.
- [ ] No files outside the in-scope list are modified, except snapshot files
      generated by the selected Playwright tests if the visual output
      intentionally changed.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- The backend does not support global holder filtering by `tag_type` and
  optional `slug`.
- The backend filters only the current page or ignores the filter while still
  returning 200.
- The code at the current-state locations no longer matches this plan.
- Adding the UI requires changing public tag submission, `EntityTag`, or
  global label page routing.
- Type-safe filter fields require broad API resource refactoring outside
  `lib/api/services/general/token.ts` and `types/api/token.ts`.
- Any verification command fails twice after a reasonable fix attempt.

## Maintenance notes

- Reviewers should inspect the mocked API query params. The most important
  regression risk is accidentally shipping page-local filtering.
- If future work adds specific tag selection from visible badges, it should
  send both `tag_type` and `slug` and can reuse the same backend contract.
- If backend semantics change for category-only mode, keep this page aligned
  with `AccountsLabelSearch`, which currently drops `slug` when browsing a
  whole category.
