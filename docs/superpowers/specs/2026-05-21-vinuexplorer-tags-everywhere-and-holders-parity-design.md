# VinuExplorer — public tags everywhere + token holders BscScan parity

**Date:** 2026-05-21
**Repos touched:** `vinuexplorer-frontend` (Next.js / Blockscout v6 fork), `vinuexplorer-backend` (Elixir/Phoenix / Blockscout v5.3.1 fork)
**Driver branch (frontend):** `feat/tags-everywhere-and-holders-parity`
**Status:** design approved, awaiting implementation plan

## Goal

Three interlocking deliverables:

1. **Public tags display instead of the bare address everywhere** the address appears — token holders, transfer lists, recent tx tables, address-page subtables, search. The address remains hyperlinked: clicking the tag label navigates to `/address/<hash>` (already true today via `AddressEntity`'s wrapping `<Link>`).
2. **Search matches against public tag names.** Typing a tag display name in the header search box (or hitting the results page) lands the user on the tagged address.
3. **Token holders page reaches feature parity with BscScan's `/token/<hash>#balances`.** Adds Rank, separate Label column, USD Value, sortable headers, a concentration summary card (Top 5/10/100 %, whale count, Gini), a holder-count line chart, a value-distribution histogram, CSV exports for the new datasets, and a "Top N of M holders" summary line.

## Non-goals

None remaining. The conversation deliberately folded every initial out-of-scope item back in. The only explicit deferral is the **hourly-resolution holder-count aggregator** — the `24h` chart tab interpolates from the most recent daily snapshot in v1, with the hourly job a follow-up.

## Background

- `AddressEntity.tsx:126–167` already prefers a `tagType==='name'` tag from `props.address.metadata?.tags` over the raw hash and already wraps the rendered label in a `<Link>` to `/address/[hash]`. The "address hyperlinked in tag text" requirement is satisfied today *whenever metadata is populated on the AddressParam passed in.*
- The `/api/v1/metadata` endpoint shipped 2026-05-21 (PR #15 + #16 + commit `4f04c54`) returns canonical `AddressMetadataInfo` with `bgColor / textColor / tagUrl / tagIcon / tooltipDescription`. The Address page consumes it via `useAddressMetadataInfoQuery`; list pages do not.
- The bottleneck is that list endpoints (`/api/v2/tokens/<hash>/holders`, `/api/v2/tokens/<hash>/transfers`, etc.) return `AddressParam`s **without** `.metadata.tags` populated. So `AddressEntity` falls back to the bare hash on every list view.
- Backend chosen approach (decided in brainstorming): **frontend batches a single `/api/v1/metadata` call per page** and merges the response into each row's `AddressParam` before passing to `AddressEntity`. No backend preloader changes needed for tag delivery. This keeps the backend fork's divergence from upstream Blockscout small.
- Search approach: **extend `Explorer.Chain.Search.quick_search/1`** to union public-tag matches. Single backend change covers the header suggest dropdown, the search-results page, and any future suggest consumer.
- Concentration / chart / distribution approach: **new backend aggregation endpoints** so we get accurate numbers for tokens with millions of holders without scanning client-side.

## Architecture

```
┌──────────────── vinuexplorer-frontend ────────────────┐
│                                                       │
│  TokenHolders.tsx                                     │
│   ├─ useAddressesMetadata(items.map(hash))   ──┐      │
│   ├─ enrichedItems = items + metadata          │      │
│   └─ renders:                                  │      │
│       TokenHoldersConcentration (PR #4)        │      │
│       TokenHoldersSummaryLine    (PR #3)       │      │
│       TokenHoldersTable / List   (PR #3)       │      │
│       Tabs: Holder chart | Distribution (PR#4) │      │
│                                                │      │
│  ┌──── lib/address/useAddressesMetadata.ts ────┴────┐ │
│  │ batch-fetches /api/v1/metadata,                  │ │
│  │ memoized getMetadata(hash) lookup                │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  Same enrichment pattern wired into                   │
│  TokenTransferTable, TxsListItem,                     │
│  AddressInternalTxsListItem, etc.                     │
└───────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────── vinuexplorer-backend ─────────────────┐
│                                                       │
│  GET /api/v1/metadata           ── existing, no chg   │
│  GET /api/v2/search/quick       ── (PR #1) +tag join  │
│  GET /api/v2/tokens/<h>/holders ── (PR #1) +sort      │
│  GET .../holders/distribution   ── (PR #1) NEW        │
│  GET .../holders/chart          ── (PR #1) NEW        │
│  GET .../holders/distribution/csv ── (PR #1) NEW      │
│  GET .../holders/chart/csv      ── (PR #1) NEW        │
│                                                       │
│  Oban workers (PR #1):                                │
│   ── HolderCountAggregator  (daily, 00:05 UTC)        │
│   ── VinuSwapPriceFiller    (daily, 00:30 UTC)        │
│                                                       │
│  New table: token_holder_counts                       │
│   (token_contract_address_hash, day, holder_count)    │
└───────────────────────────────────────────────────────┘
```

## PR sequence (4 PRs, independently shippable)

Each PR is small enough to review in one sitting and ships independently to **testnet first, mainnet ≥48 h later** per existing rollout cadence.

| PR  | Repo     | Title                                                                               |
| --- | -------- | ----------------------------------------------------------------------------------- |
| #1  | backend  | `feat(holders,search): tag-aware search + holder analytics endpoints`               |
| #2  | frontend | `feat(metadata): batch tag fetch for list pages`                                    |
| #3  | frontend | `feat(holders): Rank + Label + USD Value columns + sortable headers`                |
| #4  | frontend | `feat(holders): concentration card, chart, distribution, tag-aware search`          |

Sequencing rationale:

- **PR #1 first** so PR #3 has the `sort` param and PR #4 has the data endpoints to render.
- **PR #2 ships in parallel** — it is independent of backend work, lights up tags everywhere on lists immediately, and has the smallest blast radius.
- **PR #3 next** because it lights up the holders table without depending on the new analytics endpoints landing in prod.
- **PR #4 last** because it consumes both backend endpoints and the metadata wiring from PR #2 (the search-suggest "Public tag" group renders the metadata bgColor/textColor inline).

## PR #1 — Backend (vinuexplorer-backend)

Branch: `feat/holders-analytics-and-tag-search`

### 1.1 Quick-search public-tag join

**File:** `apps/explorer/lib/explorer/chain/search.ex`

Add `search_public_tag_query/2` that joins `address_tags` ⨝ `address_to_tags` ⨝ `addresses` and `ILIKE`-matches `address_tags.display_name`. UNION into `quick_search/1` between the existing labels query and the address-hash query. Result shape:

```elixir
%{
  type: "public_tag",
  address_hash: a.hash,
  tag_name: t.display_name,
  tag_type: t.tag_type,           # "name" | "protocol" | "generic"
  tag_meta: t.meta,
  priority: 2
}
```

**View:** `apps/block_scout_web/lib/block_scout_web/views/api/v2/search_view.ex` — render `:public_tag` items with `address_hash`, `tag_name`, `tag_type`, `tag_meta` fields. Frontend consumes in PR #4.

**Index audit:** confirm `address_tags.display_name` has a trigram (`gin_trgm_ops`) index from PR #15's hardening; add migration `<ts>_address_tags_display_name_trgm_index.exs` if missing.

### 1.2 Holders endpoint sort params

**File:** `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/token_controller.ex` `:holders`

Read `sort` ∈ `{value, rank}` (default `value`) and `order` ∈ `{asc, desc}` (default `desc`). Pass through as `[sorting: [{order_atom, sort_field}]]` to `Chain.fetch_token_holders_from_token_hash/2`. Validate via `Action.cast(:sort, :atom, [:value, :rank])` style guard; return `422` on invalid.

### 1.3 Distribution endpoint

**Route:** `get "/tokens/:address_hash_param/holders/distribution"` → `TokenController.holders_distribution/2`
**New module:** `apps/explorer/lib/explorer/chain/token/distribution.ex`

Two queries:

**Query A — aggregates:**

```sql
WITH ranked AS (
  SELECT value, ROW_NUMBER() OVER (ORDER BY value DESC) AS rn
  FROM current_token_balances
  WHERE token_contract_address_hash = $1 AND value > 0
),
agg AS (SELECT SUM(value) AS sum_value, COUNT(*) AS n FROM ranked),
slabs AS (
  SELECT
    SUM(value) FILTER (WHERE rn <= 5)   AS top5_sum,
    SUM(value) FILTER (WHERE rn <= 10)  AS top10_sum,
    SUM(value) FILTER (WHERE rn <= 100) AS top100_sum,
    SUM(value * rn)                     AS sum_value_rank
  FROM ranked
),
whales AS (
  SELECT COUNT(*) AS c
  FROM ranked, (SELECT total_supply FROM tokens WHERE contract_address_hash = $1) ts
  WHERE value >= ts.total_supply / 100
)
SELECT
  agg.n                                                              AS total_holders,
  agg.sum_value                                                      AS total_value,
  slabs.top5_sum   / NULLIF(agg.sum_value, 0) * 100                  AS top5_pct,
  slabs.top10_sum  / NULLIF(agg.sum_value, 0) * 100                  AS top10_pct,
  slabs.top100_sum / NULLIF(agg.sum_value, 0) * 100                  AS top100_pct,
  (2.0 * slabs.sum_value_rank / NULLIF(agg.sum_value * agg.n, 0))
    - ((agg.n + 1)::numeric / NULLIF(agg.n, 0))                      AS gini,
  whales.c                                                           AS whale_count
FROM agg, slabs, whales;
```

**Query B — USD value histogram (8 buckets):**

```sql
SELECT
  width_bucket(usd_value, ARRAY[1, 10, 100, 1000, 10000, 100000, 1000000]) AS bucket,
  COUNT(*) AS holder_count,
  SUM(usd_value) AS sum_usd
FROM (
  SELECT (ctb.value::numeric / POWER(10, t.decimals)) * t.exchange_rate AS usd_value
  FROM current_token_balances ctb
  JOIN tokens t ON t.contract_address_hash = ctb.token_contract_address_hash
  WHERE ctb.token_contract_address_hash = $1
    AND ctb.value > 0
    AND t.exchange_rate IS NOT NULL
) sub
GROUP BY bucket
ORDER BY bucket;
```

Bucket labels rendered server-side: `<$1`, `$1–$10`, `$10–$100`, `$100–$1k`, `$1k–$10k`, `$10k–$100k`, `$100k–$1M`, `>$1M`. Returns empty `value_buckets: []` if no exchange rate (frontend hides the histogram tab).

**Cache:** `Cachex` named `:token_distribution_cache`, TTL 60 s, keyed by token hash. Cold miss falls back to fresh query.

**View:** `views/api/v2/token_view.ex` `render("distribution.json", _)` returns:

```json
{
  "total_holders": 72631,
  "total_value": "1000000000000000000000000",
  "top5_percentage": 51.94,
  "top10_percentage": 61.18,
  "top100_percentage": 83.59,
  "whale_holders_count": 0,
  "gini_coefficient": 0.9862,
  "value_buckets": [
    {"label": "<$1", "min_usd": 0, "max_usd": 1, "holder_count": 50000, "sum_usd": 12345.67},
    ...
  ]
}
```

### 1.4 Holder-count chart endpoint

**Route:** `get "/tokens/:address_hash_param/holders/chart"` → `:holders_chart`. Accepts `period` ∈ `{24h, 7d, 30d, 90d}`. 24 h interpolates the most recent daily snapshot into 24 hourly points in v1.

**Migration:** `<ts>_create_token_holder_counts.exs`

```elixir
create table(:token_holder_counts, primary_key: false) do
  add :token_contract_address_hash, :bytea, null: false, primary_key: true
  add :day, :date, null: false, primary_key: true
  add :holder_count, :integer, null: false
  timestamps()
end
create index(:token_holder_counts, [:token_contract_address_hash, :day])
```

**Aggregator:** `Explorer.Token.HolderCountAggregator` Oban worker, cron `"5 0 * * *"`. For each token with `transfers_count > 100`:

```sql
INSERT INTO token_holder_counts (token_contract_address_hash, day, holder_count, inserted_at, updated_at)
SELECT
  $1,
  $2::date,
  COUNT(DISTINCT address_hash) FILTER (WHERE value > 0),
  NOW(), NOW()
FROM address_token_balances
WHERE token_contract_address_hash = $1
  AND block_number = (
    SELECT MAX(number) FROM blocks
    WHERE consensus = true AND timestamp::date = $2::date
  )
ON CONFLICT (token_contract_address_hash, day) DO UPDATE
  SET holder_count = EXCLUDED.holder_count, updated_at = NOW();
```

**Backfill:** one-shot Mix task `mix vinu.backfill_holder_counts --token <hash> --days 90`. Documented in deploy guide.

### 1.5 VinuSwap price filler

**New module:** `apps/explorer/lib/explorer/token/vinuswap_price_filler.ex` (Oban worker, cron `"30 0 * * *"`)

- Selects tokens where `exchange_rate IS NULL` AND `transfers_count > 100`
- For each, calls VinuSwap quoter contract `0xEed635Fa…` `quoteExactInputSingle(token, WVC, fee_tier, 1e18, 0)` via `EthereumJSONRPC.execute_contract_functions/3`; tries fee tiers `[500, 3000, 10000]` and picks the first successful quote
- Multiplies the quote (denominated in WVC wei) by the current VC/USD rate from `Explorer.Market.get_native_coin_exchange_rate/0`
- `UPDATE tokens SET exchange_rate = $1 WHERE contract_address_hash = $2`

This keeps the request hot-path free of RPC fan-out — by the time the holders endpoint runs the histogram query, `tokens.exchange_rate` is already populated.

### 1.6 CSV export

**File:** `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/csv_export_controller.ex`

Two new streaming actions:

- `:holders_distribution_csv` — columns `bucket_label, min_usd, max_usd, holder_count, sum_usd`
- `:holders_chart_csv` — columns `day, holder_count`

Routes:

```elixir
get "/tokens/:address_hash_param/holders/distribution/csv", CsvExportController, :holders_distribution_csv
get "/tokens/:address_hash_param/holders/chart/csv",        CsvExportController, :holders_chart_csv
```

### 1.7 Tests

- `test/explorer/chain/search_test.exs` — public-tag match returns shape, prefix vs substring, deduplication when address also has a `name` tag
- `test/explorer/chain/token/distribution_test.exs` — Gini against a known 5-holder fixture, top-N percentages, whale count with `total_supply = 0` edge case, value-bucket query with `exchange_rate = NULL`
- `test/block_scout_web/controllers/api/v2/token_controller_test.exs` — sort=value/rank, order asc/desc, distribution endpoint JSON shape, chart `period` validation, 404 on unknown token, CSV `content-type: text/csv`
- `test/explorer/token/vinuswap_price_filler_test.exs` — mock `EthereumJSONRPC.execute_contract_functions/3`, asserts `exchange_rate` written only when quote succeeds, asserts NULL preserved when all three fee tiers revert

### 1.8 Acceptance gates

```sh
cd ~/vinuexplorer-backend
mix format --check-formatted
mix credo --strict
mix dialyzer
MIX_ENV=test mix test --only api --only chain --only token
```

Plus manual smoke against testnet:

```sh
curl -s 'https://testnet.vinuexplorer.org/api/v2/search/quick?q=VIR' | jq '.[] | select(.type == "public_tag")'
curl -s 'https://testnet.vinuexplorer.org/api/v2/tokens/<hash>/holders/distribution' | jq
curl -s 'https://testnet.vinuexplorer.org/api/v2/tokens/<hash>/holders/chart?period=30d' | jq '.[0]'
```

## PR #2 — Frontend, batch metadata for list pages

Branch: `feat/tags-everywhere-and-holders-parity` (driver, also hosts #3 and #4 atop)

### 2.1 New helper hook

**New file:** `lib/address/useAddressesMetadata.ts`

```ts
import { useCallback, useMemo } from 'react';
import useAddressMetadataInfoQuery from './useAddressMetadataInfoQuery';

export default function useAddressesMetadata(addresses: Array<string>) {
  const dedupedLowercase = useMemo(
    () => Array.from(new Set(addresses.map(a => a.toLowerCase()))),
    [addresses],
  );
  const query = useAddressMetadataInfoQuery(dedupedLowercase);
  const getMetadata = useCallback(
    (hash: string) => query.data?.addresses[hash.toLowerCase()],
    [query.data],
  );
  return { getMetadata, isLoading: query.isLoading, isError: query.isError };
}
```

### 2.2 Enrichment pattern (same in every list parent)

```ts
const { getMetadata } = useAddressesMetadata(items?.map(i => i.address.hash) ?? []);
const enrichedItems = useMemo(
  () => items?.map(i => ({
    ...i,
    address: { ...i.address, metadata: getMetadata(i.address.hash) ?? i.address.metadata },
  })),
  [items, getMetadata],
);
```

…then pass `enrichedItems` down. `AddressEntity` already handles the rest.

### 2.3 Wire targets

- `ui/token/TokenHolders/TokenHolders.tsx` — parent enriches once, passes to both Table + List
- `ui/token/TokenTransfer/TokenTransferTable.tsx` + mobile list (sender + receiver)
- `ui/txs/TxsListItem.tsx` + `TxsTable.tsx` (from + to)
- `ui/address/internals/AddressInternalTxsListItem.tsx` + table sibling
- `ui/address/AddressTokenTransfers.tsx` (from + to)
- `ui/address/AddressBlocksValidated.tsx` (validator)

**YAGNI guardrail:** wire only pages that show >1 address per row. Single-address pages already fetch metadata via the existing hook.

### 2.4 Tests

- `lib/address/useAddressesMetadata.test.ts` (Vitest) — memoization, lowercase dedup, returns `undefined` for unknown hash
- `ui/token/TokenHolders/TokenHoldersTable.pw.tsx` — Playwright snapshot with two holders, one tagged

### 2.5 Acceptance gates

```sh
cd ~/vinuexplorer-frontend-tags-everywhere
yarn lint
yarn tsc --noEmit
yarn test:jest lib/address/
yarn test:pw -- ui/token/TokenHolders/
```

## PR #3 — Frontend, token holders table revamp

### 3.1 Table

**File:** `ui/token/TokenHolders/TokenHoldersTable.tsx`

New column layout (desktop):

```
| Rank | Holder | Label | Quantity ↕ | USD Value ↕ | Percentage ↕ |
```

- **Rank:** 60 px fixed, right-aligned, `(page - 1) * pageSize + index + 1`
- **Holder:** unchanged shape, now renders enriched metadata
- **Label:** 180 px. Render `holder.address.metadata.tags` filtered to `tagType in ['protocol', 'generic']` using existing `EntityTag` rendering — bgColor/textColor/tagIcon all applied. Empty cell if no tags.
- **Quantity:** sortable, default sort
- **USD Value:** 140 px right-aligned, `format.currency(...)`, `-` when both `token.exchange_rate == null` AND backend `holder.usd_value == null`
- **Percentage:** sortable

Sortable headers: clickable chevron toggles asc/desc through the `useQueryWithPages` query param (passes `sort=value&order=desc` to backend).

### 3.2 Mobile list

**File:** `ui/token/TokenHolders/TokenHoldersListItem.tsx`

Add Rank, Label, USD Value rows above Quantity using the existing `ListItemMobileGrid.Label / Value` pairs.

### 3.3 Summary line

**New file:** `ui/token/TokenHolders/TokenHoldersSummaryLine.tsx`

Renders `"Top {pageSize × totalPages} holders (from a total of {total_count} holders)"` using the pagination metadata. Falls back to `"{total_count} holders"` when only one page.

### 3.4 Tests

- `ui/token/TokenHolders/TokenHoldersTable.pw.tsx` — fixture with rank shown, tag badges visible, sort chevron toggles, USD `-` rendered when no rate
- `ui/token/TokenHolders/TokenHoldersListItem.pw.tsx` — mobile parity

### 3.5 Acceptance gates

Same as PR #2 plus visual snapshot diff approval.

## PR #4 — Frontend, concentration card + charts + search + CSV

### 4.1 Concentration card

**New file:** `ui/token/TokenHolders/TokenHoldersConcentration.tsx`

4 stat tiles, horizontal flex, responsive to 2×2 on mobile:

```
[Top 100: 83.59%]  [Top 10: 61.18%]  [Whale ≥1%: 0]  [Gini: 0.9862]
```

Uses `useApiQuery('general:token_holders_distribution', { pathParams: { hash } })`. Skeleton while loading. Hidden on `isError` (graceful degrade). Tooltip on Gini explains "0 = perfect equality, 1 = total inequality".

### 4.2 Charts

**New file:** `ui/token/TokenHolders/TokenHoldersChart.tsx`

- Line chart, holder count over time
- Time-range tabs: 24 h / 7 d / 30 d / 90 d (drives `?period=` query param)
- Chart library: `@nivo/line` (already used in `ui/stats/` for the Daily Transactions chart). Theme wrapped via existing `nivo theme` helper to inherit dark/light mode tokens.

**New file:** `ui/token/TokenHolders/TokenHoldersDistribution.tsx`

- Bar histogram of value buckets from `/distribution.value_buckets[]`
- Hidden when `value_buckets` is empty (token has no `exchange_rate` and no fallback price yet)
- `@nivo/bar` for consistency

### 4.3 Render order in `TokenHolders.tsx`

```
<TokenHoldersConcentration/>
<TokenHoldersSummaryLine/>
<TokenHoldersTable/> | <TokenHoldersList/>
<Tabs>
  <Tab label="Holder count over time"> <TokenHoldersChart/> </Tab>
  <Tab label="Value distribution">     <TokenHoldersDistribution/> </Tab>
</Tabs>
```

### 4.4 Search-suggest "Public tag" group

- `types/api/search.ts` — add `SearchResultPublicTag` to the union with `address_hash`, `tag_name`, `tag_type`, `tag_meta`
- `ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggest.tsx` — add new group "Public tag", render rows showing the tag badge (bgColor/textColor/icon from `tag_meta`) + the address hash beneath
- `ui/searchResults/SearchResultsList.tsx` — same group rendering on the dedicated search-results page

### 4.5 CSV menu items

**File:** `ui/address/AddressCsvExportLink.tsx`

Accept `type='distribution'` and `type='holder_chart'`. Render as menu items in the token holders action bar (next to the existing `holders` export).

### 4.6 Tests

- `ui/token/TokenHolders/TokenHoldersConcentration.pw.tsx` — fixture renders 4 tiles, Gini tooltip shows
- `ui/token/TokenHolders/TokenHoldersChart.pw.tsx` — fixture line graph, time-range tab switch
- `ui/token/TokenHolders/TokenHoldersDistribution.pw.tsx` — fixture bar graph
- `ui/snippets/searchBar/SearchBarSuggest.pw.tsx` — fixture with `type: 'public_tag'` result, badge visible, click navigates to `/address/<hash>`

### 4.7 Acceptance gates

Same as PRs #2 / #3 plus manual smoke:

- Search "VINU Republic" on testnet, click suggestion, lands on `/address/<vir_address>`
- Token page renders concentration card + chart + distribution
- CSV downloads open in Excel with correct columns

## Data flow — holders page (post-rollout)

```
TokenHolders.tsx mount
  │
  ├─→ holdersQuery: GET /api/v2/tokens/<h>/holders?sort=value&order=desc
  ├─→ distributionQuery: GET /api/v2/tokens/<h>/holders/distribution     (PR #4)
  ├─→ chartQuery (on tab focus): GET .../holders/chart?period=90d        (PR #4)
  │
  ├─→ items = holdersQuery.data.items
  ├─→ metadataQuery: GET /api/v1/metadata?addresses[]=...&chainId=207    (PR #2)
  ├─→ enrichedItems = items merged with metadata
  │
  └─→ render
       ├─ <TokenHoldersConcentration distributionQuery=... />
       ├─ <TokenHoldersSummaryLine total=... />
       ├─ <TokenHoldersTable items=enrichedItems />
       │     └─ each row: <AddressEntity address={enriched.address}>
       │           └─ AddressEntity renders tag label, links to /address/<hash>
       └─ <Tabs>
             ├─ <TokenHoldersChart chartQuery=... />
             └─ <TokenHoldersDistribution buckets=distributionQuery.data.value_buckets />
```

## Error handling

- Metadata query failure → `getMetadata(hash)` returns `undefined`, AddressEntity falls back to bare hash. Log warning, do not surface error UI.
- Distribution query failure → concentration card hides itself; table still renders.
- Chart query failure → tab shows "Holder count history is being computed" message; switches to Distribution tab automatically if it has data.
- VinuSwap price filler failure → leaves `exchange_rate` NULL, frontend renders `-` for that token's USD column. No user-visible error.
- Sort query param invalid → backend returns 422; frontend falls back to default sort and clears the param.

## Rollback plan

- Each PR carries a feature flag in `configs/app/features.ts` (`addressMetadataOnLists`, `holderAnalytics`, `tagSearch`) defaulting to `true`. Toggle to `false` for instant revert without a deploy.
- Backend endpoints are additive — no schema changes other than the new `token_holder_counts` table. Migration is reversible via `mix ecto.rollback`.
- VinuSwap price filler runs as a separate Oban worker; disable via `config :explorer, Explorer.Token.VinuSwapPriceFiller, enabled: false`.

## Testing strategy

- Unit tests at the boundary of every new module
- Playwright snapshots for every new visual component (locked to fixture data)
- Manual smoke against testnet for every PR before mainnet rollout
- Mainnet rollout staggered ≥48 h after testnet activation, monitoring `vinu-stats-lag-probe-mainnet` for any indexer impact from the new aggregator load

## Open follow-ups (post-merge)

- **Hourly-resolution holder-count aggregator** — currently the `24h` chart tab interpolates from daily; replace with a true hourly Oban worker after we see real load on the daily aggregator
- **Per-address total-portfolio-USD column** — would require pulling all of an address's token balances and pricing each; out of scope here but a natural extension
- **Tag-based filter on the Holders table** — "show me only Exchange-tagged holders"; needs backend filter on `address_to_tags`; defer until requested
