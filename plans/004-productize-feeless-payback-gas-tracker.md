# Plan 004: Productize feeless and Payback economics on the gas tracker

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat f18b415..HEAD -- ui/pages/GasTracker.tsx ui/pages/GasTracker.pw.tsx ui/gasTracker ui/home/Stats.tsx types/api/stats.ts stubs/stats.ts ui/tx/details/TxDetailsFeeRefund.tsx ui/tx/details/TxDetailsPaybackNotice.tsx ui/shared/tx/TxFeeRefundBadge.tsx ui/shared/stats/StatsWidget.tsx`
>
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. On a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `f18b415`, 2026-06-18

## Why this matters

VinuChain's feeless and Payback model is a core product differentiator, but
the gas tracker still reads like a generic Blockscout gas-fee page. The app
already has the data needed for a frontend-only first pass:
`feeless_tx_percentage`, `total_fee_refunded`, transaction refund badges, and
Payback notices. This plan turns the gas tracker into a place where users can
understand both the raw gas market and the net Payback outcome.

## Current state

- `README.md:9-12` says this fork includes gas-stats enrichment.
- `lib/metadata/templates/description.ts:5` describes VinuExplorer as the
  official explorer for VinuChain, "the world's first determinably feeless EVM,
  L1."
- `types/api/stats.ts:26-27` already exposes the stats needed for this plan:

```ts
total_fee_refunded?: string | null;
feeless_tx_percentage?: number | null;
```

- `stubs/stats.ts:43-44` includes placeholder values for those fields:

```ts
total_fee_refunded: '12500000000000000000000',
feeless_tx_percentage: 73.4,
```

- `ui/home/Stats.tsx:216-221` already renders these stats on the home page:

```tsx
(apiData?.total_fee_refunded && apiData.feeless_tx_percentage != null) && {
  id: 'feeless_txs' as const,
  icon: 'gas' as const,
  label: 'Feeless txs',
  value: `${ apiData.feeless_tx_percentage.toFixed(1) }%`,
  hint: `${ BigNumber(apiData.total_fee_refunded).div(WEI).dp(2).toFormat() } VC total refunded`,
```

- `ui/pages/GasTracker.tsx:84-99` currently renders generic gas content:

```tsx
const faq = config.meta.seo.enhancedDataEnabled ? <GasTrackerFaq/> : null;

return (
  <>
    <PageTitle title={ config.meta.seo.enhancedDataEnabled ? `${ config.chain.name } gas tracker` : 'Gas tracker' } />
    <Heading level="2" mt={ 8 } mb={ 4 }>{ `Track ${ config.chain.name } gas fees` }</Heading>
    { snippets }
    { config.features.stats.isEnabled && (
      <Box mt={ 12 } _empty={{ display: 'none' }}>
        <GasTrackerChart/>
```

- `ui/gasTracker/GasTrackerFaq.tsx:13-28` uses generic Blockscout wording,
  including "How can I check gas fees?" and "How does Blockscout calculate gas
  fees?"
- Transaction details already explain Payback refunds:
  - `ui/tx/details/TxDetailsFeeRefund.tsx:16-51` computes refund, gross fee,
    net fee, and renders `Feeless status`, `Gas fee refund`, and
    `Net transaction fee`.
  - `ui/shared/tx/TxFeeRefundBadge.tsx:18-35` renders `Gas-Free` or
    `Quota-Subsidized`.
  - `ui/tx/details/TxDetailsPaybackNotice.tsx:48-55` explains PaybackV2 staking
    context for known Payback calls.
- `ui/shared/stats/StatsWidget.tsx` is the existing compact stats-card
  component used across the explorer.
- `ui/pages/GasTracker.pw.tsx` already renders the gas tracker with mocked
  stats, including the placeholder feeless fields from `stubs/stats.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `yarn install --frozen-lockfile` | exit 0 |
| Typecheck | `yarn lint:tsc` | exit 0, no TypeScript errors |
| Lint | `yarn lint:eslint` | exit 0, no ESLint errors |
| Gas tracker PW | `yarn test:pw -- ui/pages/GasTracker.pw.tsx` | exit 0, selected component test passes |
| Gas tracker component PW | `yarn test:pw -- ui/gasTracker/` | exit 0, selected gas tracker component tests pass |

## Scope

**In scope**:
- `ui/pages/GasTracker.tsx`
- `ui/gasTracker/GasTrackerFeelessStats.tsx` (create)
- `ui/gasTracker/GasTrackerFeelessStats.pw.tsx` (create if useful)
- `ui/gasTracker/GasTrackerFaq.tsx`
- `ui/pages/GasTracker.pw.tsx`
- `stubs/stats.ts` only if additional fixture variants are needed

**Out of scope**:
- Backend stats endpoints or new trend APIs.
- Transaction fee/refund semantics.
- PaybackV2 contract constants or staking detection.
- Home page stats card behavior.
- Marketplace/Revoke functionality.

## Git workflow

- Branch: `advisor/004-feeless-payback-gas-tracker`
- Commit message style: conventional commit, for example
  `feat(gas): surface Payback economics`
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create a reusable feeless stats section

Create `ui/gasTracker/GasTrackerFeelessStats.tsx`.

Use `StatsWidget` and the existing formatting pattern from `ui/home/Stats.tsx`.
Suggested props:

```ts
type Props = {
  totalFeeRefunded?: string | null;
  feelessTxPercentage?: number | null;
  isLoading: boolean;
};
```

Rendering requirements:

- Return `null` when both stats are absent and not loading.
- Render a responsive grid with two or three `StatsWidget` items:
  - `Feeless transactions`: `${ feelessTxPercentage.toFixed(1) }%`
  - `Total refunded`: `BigNumber(totalFeeRefunded).div(WEI).dp(2).toFormat()` plus native symbol if available
  - Optional explanatory stat: `Net fee model` with value `Payback quota`
- Reuse `IconSvg`/`StatsWidget` icons such as `gas`; do not add icons.
- Keep copy factual. Do not claim every transaction is free; the existing badge
  language distinguishes fully `Gas-Free` and partially `Quota-Subsidized`.

Use `WEI` from `ui/shared/value/utils` and `BigNumber`, matching
`ui/home/Stats.tsx`.

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 2: Add the section to the gas tracker page

In `ui/pages/GasTracker.tsx`:

- Import `GasTrackerFeelessStats`.
- Insert it after the main heading and before gas price snippets.
- Pass:

```tsx
<GasTrackerFeelessStats
  totalFeeRefunded={ enrichedData?.total_fee_refunded }
  feelessTxPercentage={ enrichedData?.feeless_tx_percentage }
  isLoading={ isLoading }
/>
```

- Update the heading when enhanced SEO data is enabled from:
  `Track ${ config.chain.name } gas fees`
  to a VinuChain-specific string such as:
  `Track ${ config.chain.name } gas and Payback refunds`

Keep the existing gas price snippets, chart, update timer, and coin price
display.

**Verify**: `yarn lint:tsc` -> exit 0.

### Step 3: Refresh the FAQ copy

Update `ui/gasTracker/GasTrackerFaq.tsx` so it explains VinuChain behavior
without changing the FAQ component structure.

Required copy changes:

- Replace "Blockscout" with "VinuExplorer" where referring to this app.
- Add one FAQ item explaining Payback refunds in plain language:
  - gross gas is still measured on-chain
  - Payback quota can refund all or part of the transaction fee
  - transaction pages show `Gas-Free`, `Quota-Subsidized`, refund amount, and
    net transaction fee when `fee_refund` is present
- Add one FAQ item explaining that gas tracker prices remain useful because
  they show the raw network fee before Payback refunds.

Do not overpromise eligibility rules or staking yields. This plan is about
the explorer UI, not Payback program documentation.

**Verify**: `yarn lint:eslint` -> exit 0.

### Step 4: Add focused Playwright coverage

Update `ui/pages/GasTracker.pw.tsx`:

- Keep the existing base screenshot.
- Assert that the page shows:
  - `Feeless transactions`
  - the mocked percentage (`73.4%` from `stubs/stats.ts` unless the fixture is
    overridden)
  - `Total refunded`
  - `Payback`
- Keep the chart wait logic unchanged.

If the new stats section is complex enough to deserve isolated coverage, add
`ui/gasTracker/GasTrackerFeelessStats.pw.tsx` with:

- normal stats
- missing stats returns no visible section
- loading state renders stable skeleton dimensions

**Verify**:
`yarn test:pw -- ui/pages/GasTracker.pw.tsx` -> exit 0.

### Step 5: Run final gates

**Verify**:

- `yarn test:pw -- ui/pages/GasTracker.pw.tsx` -> exit 0.
- `yarn test:pw -- ui/gasTracker/` -> exit 0 if you added a new gas tracker
  component test.
- `yarn lint:tsc` -> exit 0.
- `yarn lint:eslint` -> exit 0.

## Test plan

- Main integration test: `ui/pages/GasTracker.pw.tsx`.
- Optional component snapshot: `ui/gasTracker/GasTrackerFeelessStats.pw.tsx`.
- Existing `ui/gasTracker/GasTrackerPriceSnippet.pw.tsx` should remain
  unchanged and passing.

## Done criteria

All must hold:

- [ ] Gas tracker displays a VinuChain feeless/Payback section when
      `total_fee_refunded` or `feeless_tx_percentage` is present.
- [ ] The section uses existing stats fields only; no new API endpoint is
      introduced.
- [ ] The page still displays gas price snippets and the gas chart exactly as
      before.
- [ ] FAQ copy explains raw gas fees, Payback refunds, and net fees without
      changing transaction semantics.
- [ ] `yarn test:pw -- ui/pages/GasTracker.pw.tsx` exits 0.
- [ ] `yarn lint:tsc` exits 0.
- [ ] `yarn lint:eslint` exits 0.
- [ ] No files outside the in-scope list are modified, except snapshot files
      generated by the selected Playwright tests if the visual output
      intentionally changed.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- `general:stats` no longer includes `total_fee_refunded` or
  `feeless_tx_percentage`.
- The gas tracker page has been redesigned enough that the current-state
  excerpts no longer match.
- Product direction requires new Payback trend charts or staking eligibility
  rules; those require backend/product input and are outside this plan.
- Implementing the UI requires changing transaction fee/refund calculation.
- Any verification command fails twice after a reasonable fix attempt.

## Maintenance notes

- Reviewers should check copy for overclaiming. The UI should say Payback can
  refund all or part of fees, not that every VinuChain transaction is always
  free to every sender.
- If a future backend adds Payback trend data, add it as a separate plan. Do
  not overload this first frontend-only section.
- Keep transaction detail terminology aligned with `TxFeeRefundBadge`:
  `Gas-Free` for full refunds and `Quota-Subsidized` for partial refunds.
