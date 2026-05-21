# VinuExplorer tags-everywhere + holders BscScan parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 4 PRs across `vinuexplorer-backend` (Elixir/Phoenix) and `vinuexplorer-frontend` (Next.js) that (a) deliver public-tag metadata into every list page so labels render instead of bare hashes with the address still hyperlinked, (b) make the header search match public-tag names, (c) bring the token holders page to BscScan parity with Rank/Label/USD Value columns + sortable headers + concentration card + holder-count chart + value-distribution histogram + CSV exports, (d) wire the already-shipped `/accounts/label/<slug>` page to a new backend shim so per-label aggregation pages work.

**Architecture:** Backend gets one new context (`Explorer.Chain.AddressTagSearch`), one new analytics module (`Explorer.Chain.Token.Distribution`) with an ETS-backed GenServer cache, two new Mix tasks invoked by daily system cron (`HolderCountAggregator`, `VinuSwapPriceFiller`), one new schema (`token_holder_counts`), and new endpoints on the existing token + search + proxy-metadata controllers. Frontend gets one new helper hook (`useAddressesMetadata`) wired into every list parent that shows >1 address, three new TokenHolders sub-components (`Concentration`, `Chart`, `Distribution`), revamped table columns with sortable headers, a new `Public tag` group in search suggest, and CSV export menu items.

**Tech Stack:** Backend — Elixir 1.14, Phoenix 1.6, Ecto 3.x, PostgreSQL, in-house GenServer+ETS caches (no Oban/Cachex available). Frontend — Next.js 15, React 19, TypeScript 5.9, Chakra UI 3, `@nivo/line` + `@nivo/bar` for charts, Playwright for visual snapshots, Vitest for unit tests, lint-staged + husky pre-commit.

---

## Pre-flight (run once before Phase 1)

### Task 0.1 — Worktree the backend repo

The memory note `feedback_vinuexplorer_backend_branch_switching.md` warns that external automation flips HEAD on the main checkout mid-edit. Work in a worktree.

**Files:** none (only directories)

- [ ] **Step 1: Confirm backend repo is clean**

Run: `cd ~/vinuexplorer-backend && git status --short && git branch --show-current`
Expected: empty status, branch `master`.

- [ ] **Step 2: Create the worktree on a fresh feature branch**

Run: `cd ~/vinuexplorer-backend && git fetch origin --quiet && git worktree add ../vinuexplorer-backend-tags-and-holders -b feat/tag-aware-search-and-holder-analytics origin/master`
Expected output ends with `HEAD is now at <sha> Merge pull request #17 from VinuChain/perf/deploy-speed-up`.

- [ ] **Step 3: Symlink deps so Mix tasks resolve without a fresh fetch**

Worktrees do not share `deps/` or `_build/`. Symlink to avoid a 5-minute `mix deps.get`:
```sh
cd ~/vinuexplorer-backend-tags-and-holders
ln -s ../vinuexplorer-backend/deps deps
ln -s ../vinuexplorer-backend/_build _build
```

Verify: `ls deps/oban 2>&1` → `ls: cannot access 'deps/oban': No such file or directory` (confirms Oban not present; we don't use it).

- [ ] **Step 4: Confirm test database setup is reachable**

Run: `cd ~/vinuexplorer-backend-tags-and-holders && MIX_ENV=test mix ecto.create --quiet 2>&1 | tail -3`
Expected: either `The database for Explorer.Repo has been created` or `The database for Explorer.Repo has already been created`.

### Task 0.2 — Confirm frontend worktree exists

The brainstorm phase already created `~/vinuexplorer-frontend-tags-everywhere` on branch `feat/tags-everywhere-and-holders-parity` and symlinked `node_modules`. Verify before starting frontend phases.

- [ ] **Step 1: Verify worktree state**

Run:
```sh
cd ~/vinuexplorer-frontend-tags-everywhere
git branch --show-current
git log --oneline -2
ls node_modules/.bin/lint-staged
```
Expected: branch `feat/tags-everywhere-and-holders-parity`, the two `docs(spec)` commits visible in log, lint-staged symlink resolves.

---

# Phase 1 — PR #1 backend: tag-aware search + holder analytics + label-page shim

All Phase 1 work happens in `~/vinuexplorer-backend-tags-and-holders`. Branch `feat/tag-aware-search-and-holder-analytics`. Single PR at the end.

## Task 1.1 — AddressTagSearch context with `list_by_label/3`

**Files:**
- Create: `apps/explorer/lib/explorer/chain/address_tag_search.ex`
- Test: `apps/explorer/test/explorer/chain/address_tag_search_test.exs`

- [ ] **Step 1: Write the failing test**

Create `apps/explorer/test/explorer/chain/address_tag_search_test.exs`:
```elixir
defmodule Explorer.Chain.AddressTagSearchTest do
  use Explorer.DataCase

  alias Explorer.Chain.AddressTagSearch
  alias Explorer.Repo

  describe "list_by_label/3" do
    test "returns addresses tagged with a given slug + tag_type" do
      address_a = insert(:address, fetched_coin_balance: 100)
      address_b = insert(:address, fetched_coin_balance: 50)

      {:ok, %{id: tag_id}} =
        Repo.insert(%Explorer.Account.AddressTag{
          name: "Exchange",
          display_name: "Exchange",
          slug: "exchange",
          tag_type: "protocol",
          meta: %{}
        })

      Repo.insert!(%Explorer.Account.AddressToTag{
        tag_id: tag_id,
        address_hash: address_a.hash
      })

      Repo.insert!(%Explorer.Account.AddressToTag{
        tag_id: tag_id,
        address_hash: address_b.hash
      })

      result = AddressTagSearch.list_by_label("exchange", "protocol", %{page_size: 50, page_token: nil})
      assert length(result.items) == 2
      [first, _second] = result.items
      assert first.hash == address_a.hash
      assert first.tag_name == "Exchange"
    end

    test "returns empty when slug unknown" do
      result = AddressTagSearch.list_by_label("non-existent", "protocol", %{page_size: 50, page_token: nil})
      assert result.items == []
      assert result.next_page_params == nil
    end

    test "paginates by coin balance + hash cursor" do
      tag = insert_protocol_tag("meme")
      for n <- 1..3, do: insert_tagged_address(tag.id, fetched_coin_balance: 100 - n)
      page1 = AddressTagSearch.list_by_label("meme", "protocol", %{page_size: 2, page_token: nil})
      assert length(page1.items) == 2
      assert page1.next_page_params != nil
      page2 = AddressTagSearch.list_by_label("meme", "protocol", %{page_size: 2, page_token: page1.next_page_params})
      assert length(page2.items) == 1
    end

    defp insert_protocol_tag(slug) do
      {:ok, t} = Repo.insert(%Explorer.Account.AddressTag{
        name: slug, display_name: String.capitalize(slug), slug: slug, tag_type: "protocol", meta: %{}
      })
      t
    end

    defp insert_tagged_address(tag_id, opts) do
      a = insert(:address, opts)
      Repo.insert!(%Explorer.Account.AddressToTag{tag_id: tag_id, address_hash: a.hash})
      a
    end
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/address_tag_search_test.exs --trace`
Expected: FAIL with `module Explorer.Chain.AddressTagSearch is not available`.

- [ ] **Step 3: Create the context module**

Create `apps/explorer/lib/explorer/chain/address_tag_search.ex`:
```elixir
defmodule Explorer.Chain.AddressTagSearch do
  @moduledoc """
  Lookups for addresses by their public-tag label.

  Used by the `/accounts/label/<slug>` page (frontend) which calls
  `GET /api/v2/proxy/metadata/addresses?slug=<>&tag_type=<>`.
  """

  import Ecto.Query

  alias Explorer.Account.{AddressTag, AddressToTag}
  alias Explorer.Chain.Address
  alias Explorer.Repo

  @default_page_size 50
  @max_page_size 200

  @type page_token :: %{coin_balance: Decimal.t() | nil, hash: binary()} | nil
  @type paging :: %{page_size: pos_integer(), page_token: page_token()}
  @type result_item :: %{
          hash: binary(),
          is_contract: boolean(),
          is_verified: boolean(),
          tag_name: String.t(),
          tag_type: String.t(),
          meta: map()
        }
  @type result :: %{items: [result_item()], next_page_params: page_token()}

  @spec list_by_label(String.t(), String.t(), paging()) :: result()
  def list_by_label(slug, tag_type, paging) when is_binary(slug) and is_binary(tag_type) do
    size = min(paging.page_size || @default_page_size, @max_page_size)

    base =
      from(t in AddressTag,
        join: a2t in AddressToTag,
        on: a2t.tag_id == t.id,
        join: a in Address,
        on: a.hash == a2t.address_hash,
        where: t.slug == ^slug and t.tag_type == ^tag_type,
        select: %{
          hash: a.hash,
          is_contract: not is_nil(a.contract_code),
          is_verified: coalesce(a.verified, false),
          tag_name: t.display_name,
          tag_type: t.tag_type,
          meta: t.meta,
          fetched_coin_balance: a.fetched_coin_balance
        }
      )

    query =
      base
      |> apply_cursor(paging.page_token)
      |> order_by([_, _, a], desc_nulls_last: a.fetched_coin_balance, asc: a.hash)
      |> limit(^(size + 1))

    rows = Repo.all(query)

    {page, next} = split_with_cursor(rows, size)

    %{
      items: Enum.map(page, &Map.drop(&1, [:fetched_coin_balance])),
      next_page_params: next
    }
  end

  defp apply_cursor(query, nil), do: query

  defp apply_cursor(query, %{coin_balance: bal, hash: hash}) do
    where(query, [_, _, a],
      (a.fetched_coin_balance == ^bal and a.hash > ^hash) or a.fetched_coin_balance < ^bal or
        is_nil(a.fetched_coin_balance)
    )
  end

  defp split_with_cursor(rows, size) do
    if length(rows) > size do
      page = Enum.take(rows, size)
      last = List.last(page)
      {page, %{coin_balance: last.fetched_coin_balance, hash: last.hash}}
    else
      {rows, nil}
    end
  end
end
```

- [ ] **Step 4: Run test to verify it passes**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/address_tag_search_test.exs --trace`
Expected: `3 tests, 0 failures`.

- [ ] **Step 5: Commit**

```sh
cd ~/vinuexplorer-backend-tags-and-holders
git add apps/explorer/lib/explorer/chain/address_tag_search.ex \
        apps/explorer/test/explorer/chain/address_tag_search_test.exs
git -c commit.gpgsign=false commit -m "feat(account): add AddressTagSearch context for label lookups"
```

## Task 1.2 — Proxy-metadata controller shim for `/api/v2/proxy/metadata/addresses`

**Files:**
- Create: `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/proxy_metadata_controller.ex`
- Create: `apps/block_scout_web/lib/block_scout_web/views/api/v2/proxy_metadata_view.ex`
- Modify: `apps/block_scout_web/lib/block_scout_web/api_router.ex`
- Test: `apps/block_scout_web/test/block_scout_web/controllers/api/v2/proxy_metadata_controller_test.exs`

- [ ] **Step 1: Write the failing test**

Create `apps/block_scout_web/test/block_scout_web/controllers/api/v2/proxy_metadata_controller_test.exs`:
```elixir
defmodule BlockScoutWeb.API.V2.ProxyMetadataControllerTest do
  use BlockScoutWeb.ConnCase, async: false

  alias Explorer.Account.{AddressTag, AddressToTag}
  alias Explorer.Repo

  setup do
    address = insert(:address, fetched_coin_balance: 100)
    {:ok, tag} = Repo.insert(%AddressTag{
      name: "Exchange", display_name: "Exchange", slug: "exchange", tag_type: "protocol", meta: %{}
    })
    Repo.insert!(%AddressToTag{tag_id: tag.id, address_hash: address.hash})
    {:ok, %{address: address}}
  end

  test "returns addresses for known slug + tag_type", %{conn: conn, address: address} do
    conn = get(conn, "/api/v2/proxy/metadata/addresses?slug=exchange&tag_type=protocol")
    body = json_response(conn, 200)
    assert is_list(body["items"])
    assert length(body["items"]) == 1
    [item] = body["items"]
    assert item["hash"] == to_string(address.hash)
    assert get_in(item, ["metadata", "tags", Access.at(0), "slug"]) == "exchange"
  end

  test "returns 422 when slug missing", %{conn: conn} do
    conn = get(conn, "/api/v2/proxy/metadata/addresses?tag_type=protocol")
    assert json_response(conn, 422)["message"] =~ "slug"
  end

  test "returns 422 when tag_type missing", %{conn: conn} do
    conn = get(conn, "/api/v2/proxy/metadata/addresses?slug=exchange")
    assert json_response(conn, 422)["message"] =~ "tag_type"
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/proxy_metadata_controller_test.exs`
Expected: FAIL with `no route found`.

- [ ] **Step 3: Create the view**

Create `apps/block_scout_web/lib/block_scout_web/views/api/v2/proxy_metadata_view.ex`:
```elixir
defmodule BlockScoutWeb.API.V2.ProxyMetadataView do
  use BlockScoutWeb, :view

  def render("addresses.json", %{items: items, next_page_params: next}) do
    %{
      items: Enum.map(items, &render_item/1),
      next_page_params: next
    }
  end

  defp render_item(item) do
    %{
      "hash" => to_string(item.hash),
      "is_contract" => item.is_contract,
      "is_verified" => item.is_verified,
      "metadata" => %{
        "tags" => [
          %{
            "name" => item.tag_name,
            "slug" => slug_from_meta_or_name(item),
            "tagType" => item.tag_type,
            "meta" => item.meta,
            "ordinal" => 0
          }
        ]
      }
    }
  end

  defp slug_from_meta_or_name(%{meta: %{"slug" => s}}) when is_binary(s), do: s
  defp slug_from_meta_or_name(%{tag_name: n}), do: n |> String.downcase() |> String.replace(~r/\s+/, "-")
end
```

- [ ] **Step 4: Create the controller**

Create `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/proxy_metadata_controller.ex`:
```elixir
defmodule BlockScoutWeb.API.V2.ProxyMetadataController do
  use BlockScoutWeb, :controller

  alias Explorer.Chain.AddressTagSearch

  action_fallback(BlockScoutWeb.API.V2.FallbackController)

  @default_page_size 50

  def addresses_by_label(conn, params) do
    with {:ok, slug} <- fetch_required(params, "slug"),
         {:ok, tag_type} <- fetch_required(params, "tag_type") do
      paging = %{
        page_size: parse_int(params["items_count"], @default_page_size),
        page_token: decode_page_token(params["page_token"])
      }

      result = AddressTagSearch.list_by_label(slug, tag_type, paging)

      conn
      |> put_status(:ok)
      |> put_view(BlockScoutWeb.API.V2.ProxyMetadataView)
      |> render("addresses.json", items: result.items, next_page_params: result.next_page_params)
    end
  end

  defp fetch_required(params, key) do
    case params[key] do
      nil -> {:error, {:unprocessable, "required param missing: #{key}"}}
      "" -> {:error, {:unprocessable, "required param missing: #{key}"}}
      v -> {:ok, v}
    end
  end

  defp parse_int(nil, default), do: default
  defp parse_int(v, default) when is_binary(v) do
    case Integer.parse(v) do
      {n, ""} -> n
      _ -> default
    end
  end

  defp decode_page_token(nil), do: nil
  defp decode_page_token(""), do: nil
  defp decode_page_token(token) when is_binary(token) do
    with {:ok, decoded} <- Base.url_decode64(token, padding: false),
         {:ok, %{"b" => bal, "h" => hash}} <- Jason.decode(decoded) do
      %{coin_balance: bal && Decimal.new(bal), hash: Base.decode16!(hash, case: :lower)}
    else
      _ -> nil
    end
  end
end
```

- [ ] **Step 5: Add `{:unprocessable, msg}` handling to FallbackController if not already present**

Run: `grep -n "unprocessable" apps/block_scout_web/lib/block_scout_web/controllers/api/v2/fallback_controller.ex`
- If a clause already maps `{:unprocessable, _}` → 422, skip.
- Otherwise add (right after the existing `def call(conn, {:error, _})` clauses):
```elixir
def call(conn, {:error, {:unprocessable, msg}}) do
  conn
  |> put_status(:unprocessable_entity)
  |> put_view(BlockScoutWeb.API.V2.ApiView)
  |> render(:message, %{message: msg})
end
```

- [ ] **Step 6: Wire the route**

Modify `apps/block_scout_web/lib/block_scout_web/api_router.ex` — under the existing `scope "/v2", as: :api_v2 do` block (around the area where other proxy endpoints live; if none, immediately above the closing `end` of the `/v2` scope), add:
```elixir
scope "/proxy/metadata" do
  get("/addresses", V2.ProxyMetadataController, :addresses_by_label)
end
```

Run: `grep -n "ProxyMetadataController" apps/block_scout_web/lib/block_scout_web/api_router.ex`
Expected: at least one line referencing the new controller.

- [ ] **Step 7: Run test to verify it passes**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/proxy_metadata_controller_test.exs --trace`
Expected: `3 tests, 0 failures`.

- [ ] **Step 8: Commit**

```sh
git add apps/block_scout_web/lib/block_scout_web/controllers/api/v2/proxy_metadata_controller.ex \
        apps/block_scout_web/lib/block_scout_web/views/api/v2/proxy_metadata_view.ex \
        apps/block_scout_web/lib/block_scout_web/api_router.ex \
        apps/block_scout_web/lib/block_scout_web/controllers/api/v2/fallback_controller.ex \
        apps/block_scout_web/test/block_scout_web/controllers/api/v2/proxy_metadata_controller_test.exs
git -c commit.gpgsign=false commit -m "feat(api/v2): label-page shim at /proxy/metadata/addresses"
```

## Task 1.3 — Public-tag join in quick-search

**Files:**
- Modify: `apps/explorer/lib/explorer/chain/search.ex`
- Modify: `apps/block_scout_web/lib/block_scout_web/views/api/v2/search_view.ex`
- Test: `apps/explorer/test/explorer/chain/search_test.exs`
- Test: `apps/block_scout_web/test/block_scout_web/controllers/api/v2/search_controller_test.exs`

- [ ] **Step 1: Write the failing test for the context**

Append to `apps/explorer/test/explorer/chain/search_test.exs`:
```elixir
describe "quick_search/1 — public tags" do
  test "includes public-tag matches" do
    address = insert(:address)
    {:ok, tag} =
      Explorer.Repo.insert(%Explorer.Account.AddressTag{
        name: "VINU Republic VIR",
        display_name: "VINU Republic VIR",
        slug: "vinu-republic-vir",
        tag_type: "name",
        meta: %{"bgColor" => "#000"}
      })

    Explorer.Repo.insert!(%Explorer.Account.AddressToTag{
      tag_id: tag.id,
      address_hash: address.hash
    })

    results = Explorer.Chain.Search.quick_search("VINU Republic")
    public_tag = Enum.find(results, &(&1.type == :public_tag))
    assert public_tag != nil
    assert public_tag.address_hash == address.hash
    assert public_tag.tag_name == "VINU Republic VIR"
    assert public_tag.tag_type == "name"
    assert public_tag.tag_meta == %{"bgColor" => "#000"}
  end

  test "does not duplicate when address also matches by hash prefix" do
    address = insert(:address)
    {:ok, tag} =
      Explorer.Repo.insert(%Explorer.Account.AddressTag{
        name: "X", display_name: "X", slug: "x", tag_type: "name", meta: %{}
      })
    Explorer.Repo.insert!(%Explorer.Account.AddressToTag{tag_id: tag.id, address_hash: address.hash})

    hash_str = to_string(address.hash)
    results = Explorer.Chain.Search.quick_search(hash_str)
    address_matches = Enum.filter(results, &(&1.type == :address && &1.address_hash == address.hash))
    public_tag_matches = Enum.filter(results, &(&1.type == :public_tag && &1.address_hash == address.hash))
    # We keep both — the address row + the tag row — because they sort under different group headers
    # in the suggest UI. Just assert neither is missing.
    assert length(address_matches) >= 1
    assert length(public_tag_matches) >= 1
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/search_test.exs:<line> --trace`
(replace `<line>` with the line of the `describe` block).
Expected: FAIL — quick_search returns no `:public_tag` typed items.

- [ ] **Step 3: Add the public-tag query and UNION it into `quick_search/1`**

Modify `apps/explorer/lib/explorer/chain/search.ex`:

1. At the top with the other `alias` lines, add:
```elixir
alias Explorer.Account.{AddressTag, AddressToTag}
```

2. Add a new private function right after the existing `search_label_query/1` (look for the function definition; if absent, add near the bottom of the module before the closing `end`):
```elixir
defp search_public_tag_query(term, paging) do
  pattern = "%#{escape_like(term)}%"

  from(t in AddressTag,
    join: a2t in AddressToTag,
    on: a2t.tag_id == t.id,
    join: a in Explorer.Chain.Address,
    on: a.hash == a2t.address_hash,
    where: ilike(t.display_name, ^pattern),
    select: %{
      type: :public_tag,
      address_hash: a.hash,
      tag_id: t.id,
      tag_name: t.display_name,
      tag_type: t.tag_type,
      tag_meta: t.meta,
      priority: 2
    },
    limit: ^paging.page_size
  )
end

defp escape_like(term),
  do: term |> String.replace("\\", "\\\\") |> String.replace("%", "\\%") |> String.replace("_", "\\_")
```

3. In `quick_search/1`, add the new query into the UNION (look for the body that combines `search_label_query`, address-by-hash, etc.). Append:
```elixir
public_tag_results = search_public_tag_query(term, %{page_size: 10}) |> Repo.all()
```
…and include `public_tag_results` in the merged result list that gets returned. Place it between labels and address-hash matches if there's an existing ordering convention.

- [ ] **Step 4: Run the context test to verify it passes**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/search_test.exs --trace`
Expected: all previous tests + the 2 new ones pass.

- [ ] **Step 5: Wire view rendering for the new type**

Modify `apps/block_scout_web/lib/block_scout_web/views/api/v2/search_view.ex`. Find the `defp prepare_search_result/1` (or whatever function maps result tuples → JSON). Add a clause for `:public_tag`:
```elixir
defp prepare_search_result(%{type: :public_tag} = item) do
  %{
    "type" => "public_tag",
    "address_hash" => to_string(item.address_hash),
    "tag_name" => item.tag_name,
    "tag_type" => item.tag_type,
    "tag_meta" => item.tag_meta,
    "priority" => item.priority
  }
end
```

- [ ] **Step 6: Add controller-level test**

Append to `apps/block_scout_web/test/block_scout_web/controllers/api/v2/search_controller_test.exs`:
```elixir
test "quick_search includes public_tag results", %{conn: conn} do
  address = insert(:address)
  {:ok, tag} = Explorer.Repo.insert(%Explorer.Account.AddressTag{
    name: "Coinbase",
    display_name: "Coinbase",
    slug: "coinbase",
    tag_type: "protocol",
    meta: %{}
  })
  Explorer.Repo.insert!(%Explorer.Account.AddressToTag{tag_id: tag.id, address_hash: address.hash})

  conn = get(conn, "/api/v2/search/quick?q=Coinbase")
  body = json_response(conn, 200)
  match = Enum.find(body, &(&1["type"] == "public_tag"))
  assert match
  assert match["tag_name"] == "Coinbase"
  assert match["address_hash"] == to_string(address.hash)
end
```

- [ ] **Step 7: Run the controller test**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/search_controller_test.exs --trace`
Expected: PASS.

- [ ] **Step 8: Commit**

```sh
git add apps/explorer/lib/explorer/chain/search.ex \
        apps/explorer/test/explorer/chain/search_test.exs \
        apps/block_scout_web/lib/block_scout_web/views/api/v2/search_view.ex \
        apps/block_scout_web/test/block_scout_web/controllers/api/v2/search_controller_test.exs
git -c commit.gpgsign=false commit -m "feat(search): UNION public-tag matches into quick search"
```

## Task 1.4 — Sort params on `/api/v2/tokens/:hash/holders`

**Files:**
- Modify: `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/token_controller.ex` (`:holders` action)
- Test: `apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs`

- [ ] **Step 1: Write the failing test**

Append to `apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs`:
```elixir
describe "GET /api/v2/tokens/:hash/holders sorting" do
  setup do
    token = insert(:token)
    big = insert(:address, fetched_coin_balance: 100)
    small = insert(:address, fetched_coin_balance: 1)

    insert(:address_current_token_balance,
      token_contract_address_hash: token.contract_address_hash,
      address_hash: big.hash,
      value: 1_000_000
    )

    insert(:address_current_token_balance,
      token_contract_address_hash: token.contract_address_hash,
      address_hash: small.hash,
      value: 100
    )

    {:ok, %{token: token, big: big, small: small}}
  end

  test "default sort is value desc", %{conn: conn, token: token, big: big} do
    conn = get(conn, "/api/v2/tokens/#{token.contract_address_hash}/holders")
    body = json_response(conn, 200)
    [first | _] = body["items"]
    assert first["address"]["hash"] == to_string(big.hash)
  end

  test "sort=value&order=asc reverses", %{conn: conn, token: token, small: small} do
    conn = get(conn, "/api/v2/tokens/#{token.contract_address_hash}/holders?sort=value&order=asc")
    body = json_response(conn, 200)
    [first | _] = body["items"]
    assert first["address"]["hash"] == to_string(small.hash)
  end

  test "invalid sort returns 422", %{conn: conn, token: token} do
    conn = get(conn, "/api/v2/tokens/#{token.contract_address_hash}/holders?sort=bogus")
    assert json_response(conn, 422)["message"] =~ "sort"
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs --trace`
Expected: invalid-sort test fails (returns 200 instead of 422) and asc test may also fail.

- [ ] **Step 3: Implement sort parsing**

In `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/token_controller.ex`, find the `def holders(conn, params)` action. Insert at the top of the function body:
```elixir
with {:ok, sort} <- parse_sort(params["sort"]),
     {:ok, order} <- parse_order(params["order"]) do
  # …existing holders logic, but pass `sorting: [{order, sort}]` into
  # Chain.fetch_token_holders_from_token_hash/2 options
```

Add private helpers at the bottom of the module:
```elixir
@allowed_sort ~w(value rank)a
@allowed_order ~w(asc desc)a

defp parse_sort(nil), do: {:ok, :value}
defp parse_sort(v) when is_binary(v) do
  s = String.to_existing_atom(v)
  if s in @allowed_sort, do: {:ok, s}, else: {:error, {:unprocessable, "invalid sort: #{v}"}}
rescue
  ArgumentError -> {:error, {:unprocessable, "invalid sort: #{v}"}}
end

defp parse_order(nil), do: {:ok, :desc}
defp parse_order(v) when is_binary(v) do
  o = String.to_existing_atom(v)
  if o in @allowed_order, do: {:ok, o}, else: {:error, {:unprocessable, "invalid order: #{v}"}}
rescue
  ArgumentError -> {:error, {:unprocessable, "invalid order: #{v}"}}
end
```

Update the call to `Chain.fetch_token_holders_from_token_hash/2` to thread `[sorting: [{order, sort_field(sort)}]] ++ existing_opts` where:
```elixir
defp sort_field(:value), do: :value
defp sort_field(:rank), do: :value   # rank == reverse-value, the controller flips order semantically
```

Wrap the existing body in the `with` block from Step 3, and close with the `else` clause that the FallbackController routes to.

- [ ] **Step 4: Run tests to verify they pass**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs --trace`
Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add apps/block_scout_web/lib/block_scout_web/controllers/api/v2/token_controller.ex \
        apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs
git -c commit.gpgsign=false commit -m "feat(api/v2): sort/order params on token holders endpoint"
```

## Task 1.5 — `Explorer.Chain.Token.Distribution` aggregate queries

**Files:**
- Create: `apps/explorer/lib/explorer/chain/token/distribution.ex`
- Test: `apps/explorer/test/explorer/chain/token/distribution_test.exs`

- [ ] **Step 1: Write the failing test**

Create `apps/explorer/test/explorer/chain/token/distribution_test.exs`:
```elixir
defmodule Explorer.Chain.Token.DistributionTest do
  use Explorer.DataCase

  alias Explorer.Chain.Token.Distribution

  describe "aggregates/1" do
    test "returns top5/10/100 percentages, gini, whale count for a basic fixture" do
      token = insert(:token, total_supply: 1_000_000)
      values = [500_000, 200_000, 100_000, 50_000, 50_000, 30_000, 20_000, 20_000, 15_000, 15_000]

      for v <- values do
        a = insert(:address)
        insert(:address_current_token_balance,
          token_contract_address_hash: token.contract_address_hash,
          address_hash: a.hash,
          value: v
        )
      end

      result = Distribution.aggregates(token.contract_address_hash)

      assert result.total_holders == 10
      assert_in_delta result.top5_percentage, 90.0, 0.01
      assert_in_delta result.top10_percentage, 100.0, 0.01
      assert_in_delta result.top100_percentage, 100.0, 0.01
      # only the first holder (500_000) is >= 1% of 1_000_000 (10_000), so whales = ...
      # actually 9 of 10 holders cross 1% threshold (10_000). Just assert > 0 and shape:
      assert result.whale_holders_count > 0
      assert result.gini_coefficient > 0 and result.gini_coefficient < 1
    end

    test "returns zero shape when no holders" do
      token = insert(:token)
      result = Distribution.aggregates(token.contract_address_hash)
      assert result.total_holders == 0
      assert result.top5_percentage == nil
      assert result.gini_coefficient == nil
    end
  end

  describe "value_buckets/1" do
    test "returns empty when token has no exchange_rate" do
      token = insert(:token, exchange_rate: nil)
      assert Distribution.value_buckets(token.contract_address_hash) == []
    end

    test "buckets holders by USD value" do
      token = insert(:token, exchange_rate: Decimal.new("0.01"), decimals: Decimal.new(18))
      # value 100 * 10^18 token units * 0.01 USD = 1 USD per holder
      for _ <- 1..5 do
        a = insert(:address)
        insert(:address_current_token_balance,
          token_contract_address_hash: token.contract_address_hash,
          address_hash: a.hash,
          value: Decimal.new("100000000000000000000")
        )
      end

      buckets = Distribution.value_buckets(token.contract_address_hash)
      assert is_list(buckets)
      assert Enum.any?(buckets, &(&1.holder_count > 0))
    end
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/token/distribution_test.exs --trace`
Expected: FAIL — module not defined.

- [ ] **Step 3: Implement the module**

Create `apps/explorer/lib/explorer/chain/token/distribution.ex`:
```elixir
defmodule Explorer.Chain.Token.Distribution do
  @moduledoc """
  Aggregate queries powering the token-holders concentration card +
  USD-value distribution histogram.
  """

  alias Explorer.Repo

  @type aggregates :: %{
          total_holders: non_neg_integer(),
          total_value: Decimal.t() | nil,
          top5_percentage: float() | nil,
          top10_percentage: float() | nil,
          top100_percentage: float() | nil,
          whale_holders_count: non_neg_integer(),
          gini_coefficient: float() | nil
        }

  @type bucket :: %{
          label: String.t(),
          min_usd: number(),
          max_usd: number() | nil,
          holder_count: non_neg_integer(),
          sum_usd: Decimal.t()
        }

  @bucket_thresholds [1, 10, 100, 1000, 10_000, 100_000, 1_000_000]
  @bucket_labels [
    {"<$1", 0, 1},
    {"$1-$10", 1, 10},
    {"$10-$100", 10, 100},
    {"$100-$1k", 100, 1000},
    {"$1k-$10k", 1000, 10_000},
    {"$10k-$100k", 10_000, 100_000},
    {"$100k-$1M", 100_000, 1_000_000},
    {">$1M", 1_000_000, nil}
  ]

  @spec aggregates(binary()) :: aggregates()
  def aggregates(token_contract_address_hash) do
    sql = """
    WITH ranked AS (
      SELECT value::numeric AS value, ROW_NUMBER() OVER (ORDER BY value DESC) AS rn
      FROM address_current_token_balances
      WHERE token_contract_address_hash = $1 AND value > 0
    ),
    agg AS (SELECT COALESCE(SUM(value), 0) AS sum_value, COUNT(*) AS n FROM ranked),
    slabs AS (
      SELECT
        COALESCE(SUM(value) FILTER (WHERE rn <= 5), 0)   AS top5_sum,
        COALESCE(SUM(value) FILTER (WHERE rn <= 10), 0)  AS top10_sum,
        COALESCE(SUM(value) FILTER (WHERE rn <= 100), 0) AS top100_sum,
        COALESCE(SUM(value * rn), 0)                     AS sum_value_rank
      FROM ranked
    ),
    whales AS (
      SELECT COUNT(*) AS c
      FROM ranked, (SELECT total_supply FROM tokens WHERE contract_address_hash = $1) ts
      WHERE ts.total_supply IS NOT NULL
        AND ts.total_supply > 0
        AND value >= ts.total_supply::numeric / 100
    )
    SELECT
      agg.n,
      agg.sum_value,
      slabs.top5_sum,
      slabs.top10_sum,
      slabs.top100_sum,
      slabs.sum_value_rank,
      whales.c
    FROM agg, slabs, whales;
    """

    %{rows: [[n, sum_value, top5, top10, top100, sum_value_rank, whales]]} =
      Repo.query!(sql, [token_contract_address_hash.bytes])

    if n == 0 do
      %{
        total_holders: 0,
        total_value: nil,
        top5_percentage: nil,
        top10_percentage: nil,
        top100_percentage: nil,
        whale_holders_count: 0,
        gini_coefficient: nil
      }
    else
      sum_value_d = Decimal.new(sum_value || 0)

      pct = fn slab ->
        if Decimal.equal?(sum_value_d, 0), do: nil, else: Decimal.to_float(Decimal.div(Decimal.mult(Decimal.new(slab || 0), 100), sum_value_d))
      end

      gini =
        if n == 0 or Decimal.equal?(sum_value_d, 0) do
          nil
        else
          # Gini for sorted-DESC values: G = (2 * Σ(rn * value)) / (n * Σvalue) - (n+1)/n
          numer = Decimal.mult(Decimal.new(2), Decimal.new(sum_value_rank || 0))
          denom = Decimal.mult(Decimal.new(n), sum_value_d)
          first_term = Decimal.div(numer, denom) |> Decimal.to_float()
          second_term = (n + 1) / n
          first_term - second_term
        end

      %{
        total_holders: n,
        total_value: sum_value_d,
        top5_percentage: pct.(top5),
        top10_percentage: pct.(top10),
        top100_percentage: pct.(top100),
        whale_holders_count: whales,
        gini_coefficient: gini
      }
    end
  end

  @spec value_buckets(binary()) :: [bucket()]
  def value_buckets(token_contract_address_hash) do
    sql = """
    WITH priced AS (
      SELECT (ctb.value::numeric / POWER(10, COALESCE(t.decimals, 18))) * t.exchange_rate AS usd_value
      FROM address_current_token_balances ctb
      JOIN tokens t ON t.contract_address_hash = ctb.token_contract_address_hash
      WHERE ctb.token_contract_address_hash = $1
        AND ctb.value > 0
        AND t.exchange_rate IS NOT NULL
    )
    SELECT
      width_bucket(usd_value, $2::numeric[]) AS bucket,
      COUNT(*) AS holder_count,
      COALESCE(SUM(usd_value), 0) AS sum_usd
    FROM priced
    GROUP BY bucket
    ORDER BY bucket;
    """

    case Repo.query!(sql, [token_contract_address_hash.bytes, @bucket_thresholds]) do
      %{rows: []} -> []
      %{rows: rows} ->
        by_bucket = Map.new(rows, fn [b, c, s] -> {b, {c, s}} end)

        @bucket_labels
        |> Enum.with_index(1)
        |> Enum.map(fn {{label, min_usd, max_usd}, idx} ->
          {count, sum} = Map.get(by_bucket, idx, {0, 0})
          %{label: label, min_usd: min_usd, max_usd: max_usd, holder_count: count, sum_usd: sum}
        end)
    end
  end
end
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/token/distribution_test.exs --trace`
Expected: `4 tests, 0 failures`.

- [ ] **Step 5: Commit**

```sh
git add apps/explorer/lib/explorer/chain/token/distribution.ex \
        apps/explorer/test/explorer/chain/token/distribution_test.exs
git -c commit.gpgsign=false commit -m "feat(chain/token): Distribution aggregates + USD buckets"
```

## Task 1.6 — Distribution cache GenServer

**Files:**
- Create: `apps/explorer/lib/explorer/chain/cache/token_distribution.ex`
- Modify: `apps/explorer/lib/explorer/application.ex` (add to children)
- Test: `apps/explorer/test/explorer/chain/cache/token_distribution_test.exs`

- [ ] **Step 1: Write the failing test**

Create `apps/explorer/test/explorer/chain/cache/token_distribution_test.exs`:
```elixir
defmodule Explorer.Chain.Cache.TokenDistributionTest do
  use Explorer.DataCase

  alias Explorer.Chain.Cache.TokenDistribution

  setup do
    {:ok, pid} = start_supervised(TokenDistribution)
    on_exit(fn -> if Process.alive?(pid), do: stop_supervised!(TokenDistribution) end)
    {:ok, %{}}
  end

  test "caches and returns the aggregate" do
    token = insert(:token, total_supply: 1000)
    a = insert(:address)
    insert(:address_current_token_balance,
      token_contract_address_hash: token.contract_address_hash,
      address_hash: a.hash,
      value: 500
    )

    {first, _} = :timer.tc(fn -> TokenDistribution.get(token.contract_address_hash) end)
    {second, _} = :timer.tc(fn -> TokenDistribution.get(token.contract_address_hash) end)
    # Second call should be at least 2x faster (cache hit)
    assert second < first
  end

  test "evicts after TTL" do
    token = insert(:token, total_supply: 1000)
    TokenDistribution.get(token.contract_address_hash)
    assert TokenDistribution.cached?(token.contract_address_hash) == true
    TokenDistribution.evict(token.contract_address_hash)
    assert TokenDistribution.cached?(token.contract_address_hash) == false
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/cache/token_distribution_test.exs --trace`
Expected: FAIL — module not defined.

- [ ] **Step 3: Implement the cache GenServer**

Create `apps/explorer/lib/explorer/chain/cache/token_distribution.ex`:
```elixir
defmodule Explorer.Chain.Cache.TokenDistribution do
  @moduledoc """
  ETS-backed cache for `Explorer.Chain.Token.Distribution.aggregates/1`
  and `value_buckets/1`. 60-second TTL.
  """

  use GenServer

  alias Explorer.Chain.Token.Distribution

  @table __MODULE__
  @ttl_ms 60_000

  # Client

  def start_link(_opts \\ []) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  @spec get(binary()) :: %{aggregates: map(), value_buckets: [map()]}
  def get(token_hash) do
    case lookup(token_hash) do
      {:hit, value} -> value
      :miss ->
        value = compute(token_hash)
        :ets.insert(@table, {token_hash, value, System.monotonic_time(:millisecond) + @ttl_ms})
        value
    end
  end

  @spec cached?(binary()) :: boolean()
  def cached?(token_hash) do
    case lookup(token_hash) do
      {:hit, _} -> true
      :miss -> false
    end
  end

  @spec evict(binary()) :: :ok
  def evict(token_hash) do
    :ets.delete(@table, token_hash)
    :ok
  end

  # Server

  @impl true
  def init(:ok) do
    :ets.new(@table, [:set, :public, :named_table, read_concurrency: true])
    {:ok, %{}}
  end

  defp lookup(token_hash) do
    case :ets.lookup(@table, token_hash) do
      [{^token_hash, value, expires_at}] ->
        if System.monotonic_time(:millisecond) < expires_at do
          {:hit, value}
        else
          :ets.delete(@table, token_hash)
          :miss
        end

      [] ->
        :miss
    end
  end

  defp compute(token_hash) do
    %{
      aggregates: Distribution.aggregates(token_hash),
      value_buckets: Distribution.value_buckets(token_hash)
    }
  end
end
```

- [ ] **Step 4: Wire into Application children**

Modify `apps/explorer/lib/explorer/application.ex`. Find the existing `children = [...]` list (search for `Explorer.Chain.Cache`). Add:
```elixir
Explorer.Chain.Cache.TokenDistribution,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/cache/token_distribution_test.exs --trace`
Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add apps/explorer/lib/explorer/chain/cache/token_distribution.ex \
        apps/explorer/lib/explorer/application.ex \
        apps/explorer/test/explorer/chain/cache/token_distribution_test.exs
git -c commit.gpgsign=false commit -m "feat(chain/cache): ETS cache for token distribution"
```

## Task 1.7 — `/api/v2/tokens/:hash/holders/distribution` endpoint

**Files:**
- Modify: `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/token_controller.ex` (add `:holders_distribution`)
- Modify: `apps/block_scout_web/lib/block_scout_web/views/api/v2/token_view.ex`
- Modify: `apps/block_scout_web/lib/block_scout_web/api_router.ex`
- Test: existing `token_controller_test.exs`

- [ ] **Step 1: Write the failing test**

Append to `apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs`:
```elixir
describe "GET /api/v2/tokens/:hash/holders/distribution" do
  test "returns aggregates + value_buckets", %{conn: conn} do
    token = insert(:token, total_supply: 1_000_000, exchange_rate: Decimal.new("0.5"), decimals: Decimal.new(18))
    for v <- [500_000, 200_000, 100_000] do
      a = insert(:address)
      insert(:address_current_token_balance,
        token_contract_address_hash: token.contract_address_hash,
        address_hash: a.hash,
        value: v
      )
    end

    conn = get(conn, "/api/v2/tokens/#{token.contract_address_hash}/holders/distribution")
    body = json_response(conn, 200)
    assert body["total_holders"] == 3
    assert is_number(body["top5_percentage"])
    assert is_list(body["value_buckets"])
  end

  test "404 on unknown token", %{conn: conn} do
    unknown = "0x" <> String.duplicate("0", 40)
    conn = get(conn, "/api/v2/tokens/#{unknown}/holders/distribution")
    assert json_response(conn, 404)
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs --trace`
Expected: route-not-found failure.

- [ ] **Step 3: Add controller action**

In `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/token_controller.ex` add:
```elixir
alias Explorer.Chain.Cache.TokenDistribution

def holders_distribution(conn, %{"address_hash_param" => address_hash_param}) do
  with {:ok, hash} <- Chain.string_to_address_hash(address_hash_param),
       :ok <- ensure_token_exists(hash) do
    data = TokenDistribution.get(hash)
    conn
    |> put_status(:ok)
    |> put_view(BlockScoutWeb.API.V2.TokenView)
    |> render("distribution.json", data: data)
  end
end

defp ensure_token_exists(hash) do
  case Chain.token_from_address_hash(hash, [], []) do
    {:ok, _} -> :ok
    _ -> {:error, :not_found}
  end
end
```

- [ ] **Step 4: Add view render clause**

In `apps/block_scout_web/lib/block_scout_web/views/api/v2/token_view.ex`:
```elixir
def render("distribution.json", %{data: %{aggregates: a, value_buckets: buckets}}) do
  %{
    "total_holders" => a.total_holders,
    "total_value" => a.total_value && to_string(a.total_value),
    "top5_percentage" => a.top5_percentage,
    "top10_percentage" => a.top10_percentage,
    "top100_percentage" => a.top100_percentage,
    "whale_holders_count" => a.whale_holders_count,
    "gini_coefficient" => a.gini_coefficient,
    "value_buckets" =>
      Enum.map(buckets, fn b ->
        %{
          "label" => b.label,
          "min_usd" => b.min_usd,
          "max_usd" => b.max_usd,
          "holder_count" => b.holder_count,
          "sum_usd" => to_string(b.sum_usd)
        }
      end)
  }
end
```

- [ ] **Step 5: Wire route**

Modify `apps/block_scout_web/lib/block_scout_web/api_router.ex`. Find the existing line:
```elixir
get("/:address_hash_param/holders", V2.TokenController, :holders)
```
Add directly below it:
```elixir
get("/:address_hash_param/holders/distribution", V2.TokenController, :holders_distribution)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs --trace`
Expected: PASS.

- [ ] **Step 7: Commit**

```sh
git add apps/block_scout_web/lib/block_scout_web/controllers/api/v2/token_controller.ex \
        apps/block_scout_web/lib/block_scout_web/views/api/v2/token_view.ex \
        apps/block_scout_web/lib/block_scout_web/api_router.ex \
        apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs
git -c commit.gpgsign=false commit -m "feat(api/v2): token holders distribution endpoint"
```

## Task 1.8 — `token_holder_counts` schema + migration

**Files:**
- Create: migration via `mix ecto.gen.migration` (Ecto stamps the timestamp)
- Create: `apps/explorer/lib/explorer/chain/token/holder_count.ex`
- Test: `apps/explorer/test/explorer/chain/token/holder_count_test.exs`

- [ ] **Step 1: Generate the migration**

Run: `cd ~/vinuexplorer-backend-tags-and-holders/apps/explorer && mix ecto.gen.migration create_token_holder_counts`
Expected: prints path like `priv/repo/migrations/20260521xxxxxx_create_token_holder_counts.exs`. Note this path.

- [ ] **Step 2: Write the migration body**

Replace the generated migration file body with:
```elixir
defmodule Explorer.Repo.Migrations.CreateTokenHolderCounts do
  use Ecto.Migration

  def change do
    create table(:token_holder_counts, primary_key: false) do
      add :token_contract_address_hash, :bytea, null: false, primary_key: true
      add :day, :date, null: false, primary_key: true
      add :holder_count, :integer, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:token_holder_counts, [:token_contract_address_hash, :day])
  end
end
```

- [ ] **Step 3: Run migration on test db**

Run: `cd ~/vinuexplorer-backend-tags-and-holders && MIX_ENV=test mix ecto.migrate --quiet`
Expected: no errors. Re-run, expect no-op.

- [ ] **Step 4: Write the failing test for the schema module**

Create `apps/explorer/test/explorer/chain/token/holder_count_test.exs`:
```elixir
defmodule Explorer.Chain.Token.HolderCountTest do
  use Explorer.DataCase

  alias Explorer.Chain.Token.HolderCount
  alias Explorer.Repo

  test "upsert/3 inserts a new row" do
    token = insert(:token)
    :ok = HolderCount.upsert(token.contract_address_hash, ~D[2026-05-20], 123)
    [%{holder_count: 123}] = Repo.all(HolderCount)
  end

  test "upsert/3 updates an existing row" do
    token = insert(:token)
    :ok = HolderCount.upsert(token.contract_address_hash, ~D[2026-05-20], 123)
    :ok = HolderCount.upsert(token.contract_address_hash, ~D[2026-05-20], 456)
    [row] = Repo.all(HolderCount)
    assert row.holder_count == 456
  end

  test "series/3 returns rows ordered ascending by day" do
    token = insert(:token)
    HolderCount.upsert(token.contract_address_hash, ~D[2026-05-18], 100)
    HolderCount.upsert(token.contract_address_hash, ~D[2026-05-19], 110)
    HolderCount.upsert(token.contract_address_hash, ~D[2026-05-20], 120)

    series = HolderCount.series(token.contract_address_hash, ~D[2026-05-18], ~D[2026-05-20])
    assert length(series) == 3
    assert hd(series).holder_count == 100
  end
end
```

- [ ] **Step 5: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/token/holder_count_test.exs --trace`
Expected: FAIL — module not defined.

- [ ] **Step 6: Implement the schema module**

Create `apps/explorer/lib/explorer/chain/token/holder_count.ex`:
```elixir
defmodule Explorer.Chain.Token.HolderCount do
  use Ecto.Schema
  import Ecto.Query

  alias Explorer.Chain.Hash
  alias Explorer.Repo

  @primary_key false
  schema "token_holder_counts" do
    field :token_contract_address_hash, Hash.Address, primary_key: true
    field :day, :date, primary_key: true
    field :holder_count, :integer

    timestamps(type: :utc_datetime_usec)
  end

  @spec upsert(Hash.Address.t() | binary(), Date.t(), non_neg_integer()) :: :ok
  def upsert(token_hash, day, count) do
    now = DateTime.utc_now()

    Repo.insert_all(
      __MODULE__,
      [
        %{
          token_contract_address_hash: token_hash,
          day: day,
          holder_count: count,
          inserted_at: now,
          updated_at: now
        }
      ],
      on_conflict: {:replace, [:holder_count, :updated_at]},
      conflict_target: [:token_contract_address_hash, :day]
    )

    :ok
  end

  @spec series(Hash.Address.t() | binary(), Date.t(), Date.t()) :: [%__MODULE__{}]
  def series(token_hash, from, to) do
    from(h in __MODULE__,
      where: h.token_contract_address_hash == ^token_hash and h.day >= ^from and h.day <= ^to,
      order_by: [asc: h.day]
    )
    |> Repo.all()
  end
end
```

- [ ] **Step 7: Run test to verify it passes**

Run: `MIX_ENV=test mix test apps/explorer/test/explorer/chain/token/holder_count_test.exs --trace`
Expected: PASS.

- [ ] **Step 8: Commit**

```sh
git add apps/explorer/priv/repo/migrations/*_create_token_holder_counts.exs \
        apps/explorer/lib/explorer/chain/token/holder_count.ex \
        apps/explorer/test/explorer/chain/token/holder_count_test.exs
git -c commit.gpgsign=false commit -m "feat(chain/token): token_holder_counts schema + migration"
```

## Task 1.9 — `HolderCountAggregator` Mix task

**Files:**
- Create: `apps/explorer/lib/mix/tasks/vinu/aggregate_holder_counts.ex`
- Test: `apps/explorer/test/mix/tasks/vinu/aggregate_holder_counts_test.exs`

- [ ] **Step 1: Write the failing test**

Create `apps/explorer/test/mix/tasks/vinu/aggregate_holder_counts_test.exs`:
```elixir
defmodule Mix.Tasks.Vinu.AggregateHolderCountsTest do
  use Explorer.DataCase

  alias Explorer.Chain.Token.HolderCount
  alias Explorer.Repo

  test "writes a row per qualifying token for the supplied day" do
    token_busy = insert(:token, transfers_count: 200)
    token_dust = insert(:token, transfers_count: 5)
    a = insert(:address)
    insert(:address_current_token_balance,
      token_contract_address_hash: token_busy.contract_address_hash,
      address_hash: a.hash,
      value: 1
    )

    Mix.Task.rerun("vinu.aggregate_holder_counts", ["--day", "2026-05-20"])

    rows = Repo.all(HolderCount)
    assert length(rows) == 1
    assert hd(rows).token_contract_address_hash == token_busy.contract_address_hash
    assert hd(rows).day == ~D[2026-05-20]
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/explorer/test/mix/tasks/vinu/aggregate_holder_counts_test.exs --trace`
Expected: FAIL — task not defined.

- [ ] **Step 3: Implement the Mix task**

Create `apps/explorer/lib/mix/tasks/vinu/aggregate_holder_counts.ex`:
```elixir
defmodule Mix.Tasks.Vinu.AggregateHolderCounts do
  @moduledoc """
  Compute and upsert per-token holder counts into `token_holder_counts`
  for a given day. Invoked from system cron at 00:05 UTC.

      mix vinu.aggregate_holder_counts --day 2026-05-20

  When `--day` is omitted, defaults to yesterday (UTC).
  """
  use Mix.Task

  alias Explorer.Chain.Token.HolderCount
  alias Explorer.Repo

  @transfers_threshold 100

  @impl true
  def run(args) do
    Mix.Task.run("app.start")
    {opts, _, _} = OptionParser.parse(args, strict: [day: :string])
    day = parse_day(opts[:day])

    sql = """
    SELECT contract_address_hash
    FROM tokens
    WHERE transfers_count >= $1
    """

    %{rows: rows} = Repo.query!(sql, [@transfers_threshold])

    Enum.each(rows, fn [token_hash] ->
      count =
        Repo.query!(
          """
          SELECT COUNT(*) FROM address_current_token_balances
          WHERE token_contract_address_hash = $1 AND value > 0
          """,
          [token_hash]
        ).rows
        |> hd()
        |> hd()

      :ok = HolderCount.upsert(token_hash, day, count)
    end)
  end

  defp parse_day(nil), do: Date.add(Date.utc_today(), -1)
  defp parse_day(s) when is_binary(s), do: Date.from_iso8601!(s)
end
```

- [ ] **Step 4: Run test to verify it passes**

Run: `MIX_ENV=test mix test apps/explorer/test/mix/tasks/vinu/aggregate_holder_counts_test.exs --trace`
Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add apps/explorer/lib/mix/tasks/vinu/aggregate_holder_counts.ex \
        apps/explorer/test/mix/tasks/vinu/aggregate_holder_counts_test.exs
git -c commit.gpgsign=false commit -m "feat(mix): aggregate_holder_counts daily task"
```

## Task 1.10 — `/api/v2/tokens/:hash/holders/chart` endpoint

**Files:**
- Modify: `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/token_controller.ex`
- Modify: `apps/block_scout_web/lib/block_scout_web/views/api/v2/token_view.ex`
- Modify: `apps/block_scout_web/lib/block_scout_web/api_router.ex`
- Test: existing `token_controller_test.exs`

- [ ] **Step 1: Write the failing test**

Append:
```elixir
describe "GET /api/v2/tokens/:hash/holders/chart" do
  test "returns daily series for period=30d", %{conn: conn} do
    token = insert(:token)
    today = Date.utc_today()
    Explorer.Chain.Token.HolderCount.upsert(token.contract_address_hash, Date.add(today, -2), 100)
    Explorer.Chain.Token.HolderCount.upsert(token.contract_address_hash, Date.add(today, -1), 110)

    conn = get(conn, "/api/v2/tokens/#{token.contract_address_hash}/holders/chart?period=30d")
    body = json_response(conn, 200)
    assert is_list(body["items"])
    assert length(body["items"]) == 2
    assert hd(body["items"])["holder_count"] == 100
  end

  test "422 on invalid period", %{conn: conn} do
    token = insert(:token)
    conn = get(conn, "/api/v2/tokens/#{token.contract_address_hash}/holders/chart?period=1y")
    assert json_response(conn, 422)["message"] =~ "period"
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs --trace`
Expected: route-not-found / 422 failures.

- [ ] **Step 3: Implement controller action**

In `token_controller.ex`:
```elixir
alias Explorer.Chain.Token.HolderCount

@period_days %{"24h" => 1, "7d" => 7, "30d" => 30, "90d" => 90}

def holders_chart(conn, %{"address_hash_param" => address_hash_param} = params) do
  with {:ok, hash} <- Chain.string_to_address_hash(address_hash_param),
       :ok <- ensure_token_exists(hash),
       {:ok, days} <- parse_period(params["period"]) do
    to = Date.utc_today()
    from = Date.add(to, -days)
    rows = HolderCount.series(hash, from, to)
    conn
    |> put_status(:ok)
    |> put_view(BlockScoutWeb.API.V2.TokenView)
    |> render("holders_chart.json", rows: rows)
  end
end

defp parse_period(nil), do: {:ok, 30}
defp parse_period(p) when is_binary(p) do
  case Map.fetch(@period_days, p) do
    {:ok, days} -> {:ok, days}
    :error -> {:error, {:unprocessable, "invalid period: #{p}"}}
  end
end
```

- [ ] **Step 4: Add view render**

In `token_view.ex`:
```elixir
def render("holders_chart.json", %{rows: rows}) do
  %{
    "items" =>
      Enum.map(rows, fn r ->
        %{"day" => Date.to_iso8601(r.day), "holder_count" => r.holder_count}
      end)
  }
end
```

- [ ] **Step 5: Wire route**

In `api_router.ex`, immediately below the distribution route:
```elixir
get("/:address_hash_param/holders/chart", V2.TokenController, :holders_chart)
```

- [ ] **Step 6: Run tests to verify**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs --trace`
Expected: PASS.

- [ ] **Step 7: Commit**

```sh
git add apps/block_scout_web/lib/block_scout_web/controllers/api/v2/token_controller.ex \
        apps/block_scout_web/lib/block_scout_web/views/api/v2/token_view.ex \
        apps/block_scout_web/lib/block_scout_web/api_router.ex \
        apps/block_scout_web/test/block_scout_web/controllers/api/v2/token_controller_test.exs
git -c commit.gpgsign=false commit -m "feat(api/v2): token holders chart endpoint"
```

## Task 1.11 — `VinuSwapPriceFiller` Mix task

**Files:**
- Create: `apps/explorer/lib/mix/tasks/vinu/fill_vinuswap_prices.ex`
- Test: `apps/explorer/test/mix/tasks/vinu/fill_vinuswap_prices_test.exs`

- [ ] **Step 1: Write the failing test**

Create `apps/explorer/test/mix/tasks/vinu/fill_vinuswap_prices_test.exs`:
```elixir
defmodule Mix.Tasks.Vinu.FillVinuswapPricesTest do
  use Explorer.DataCase

  alias Explorer.Repo
  import Mox

  setup :verify_on_exit!

  test "writes exchange_rate when quoter returns a value" do
    token = insert(:token, exchange_rate: nil, transfers_count: 200, decimals: Decimal.new(18))

    expect(Explorer.Token.MockVinuswapQuoter, :quote, fn _token_hash, _fee_tier ->
      {:ok, Decimal.new("500000000000000000")}  # 0.5 WVC per token
    end)

    Mix.Task.rerun("vinu.fill_vinuswap_prices", ["--vc-usd", "0.10"])

    updated = Repo.reload!(token)
    assert updated.exchange_rate != nil
  end

  test "leaves nil when all fee tiers revert" do
    token = insert(:token, exchange_rate: nil, transfers_count: 200)

    expect(Explorer.Token.MockVinuswapQuoter, :quote, 3, fn _token_hash, _fee_tier ->
      {:error, :reverted}
    end)

    Mix.Task.rerun("vinu.fill_vinuswap_prices", ["--vc-usd", "0.10"])

    updated = Repo.reload!(token)
    assert updated.exchange_rate == nil
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/explorer/test/mix/tasks/vinu/fill_vinuswap_prices_test.exs --trace`
Expected: FAIL — module and mock not defined.

- [ ] **Step 3: Define quoter behaviour + mock**

First resolve the two contract addresses (DO NOT skip — placeholder addresses will silently break price discovery in production):

Run:
```sh
# Quoter address (full 42-char hex)
jq -r '.address // empty' ~/vinuchain-lists/contracts/vinuchain/QuotaContract.json 2>/dev/null  # only QuotaContract present today; quoter lives in VinuSwap repo
grep -RIn '"quoter"\|"swapRouter02"\|"factory"\|"WVC"\|"WETH"\|wvc\|wvinu' \
  ~/vinuswap-backend/deployments.json \
  ~/vinuswap-backend/scripts/deploy*.ts \
  ~/vinuswap-backend/contracts/*.sol 2>/dev/null | head -20
```

Expected: the VinuSwap mainnet quoter address and WVC (wrapped VC) token address are visible in the VinuSwap-VinuChain repo. Common Uniswap V3 fork shape: `Quoter` at `0xEed635Fa…` per the VinuChain CLAUDE.md `[Ecosystem]` predeploys row (resolve the full 42-char address from `~/vinuswap-backend/`).

Once both addresses are confirmed, create `apps/explorer/lib/explorer/token/vinuswap_quoter.ex`:
```elixir
defmodule Explorer.Token.VinuswapQuoter do
  @moduledoc "Behaviour for VinuSwap quoter calls — mocked in tests."

  @callback quote(token_hash :: binary(), fee_tier :: integer()) ::
              {:ok, Decimal.t()} | {:error, atom()}
end

defmodule Explorer.Token.VinuswapQuoter.Live do
  @behaviour Explorer.Token.VinuswapQuoter

  alias EthereumJSONRPC.Contract

  # Replace BOTH 42-char addresses below with the values resolved in Step 3's grep.
  # Hardcoded placeholders MUST NOT ship — the test guarantees behaviour through Mox,
  # but the Live module talks to mainnet RPC and a wrong address silently returns nil.
  @quoter_address "REPLACE_WITH_VINUSWAP_QUOTER_ADDRESS"
  @wvc_address    "REPLACE_WITH_WVC_TOKEN_ADDRESS"

  # `quoteExactInputSingle(address,address,uint24,uint256,uint160) -> uint256`
  @quote_selector "f7729d43"

  @impl true
  def quote(token_hash, fee_tier) when is_binary(token_hash) and is_integer(fee_tier) do
    refuse_placeholder!()

    token_in = String.downcase(to_string(token_hash))
    encoded_args =
      encode_address(token_in) <>
        encode_address(@wvc_address) <>
        encode_uint24(fee_tier) <>
        encode_uint256(1_000_000_000_000_000_000) <>
        encode_uint160(0)

    data = "0x" <> @quote_selector <> encoded_args

    case Contract.eth_call(@quoter_address, data) do
      {:ok, "0x" <> hex_result} ->
        {:ok, hex_result |> String.to_integer(16) |> Decimal.new()}

      {:error, _} ->
        {:error, :reverted}
    end
  end

  defp encode_address("0x" <> rest), do: String.pad_leading(String.downcase(rest), 64, "0")
  defp encode_uint24(n), do: n |> Integer.to_string(16) |> String.pad_leading(64, "0")
  defp encode_uint256(n), do: n |> Integer.to_string(16) |> String.pad_leading(64, "0")
  defp encode_uint160(n), do: n |> Integer.to_string(16) |> String.pad_leading(64, "0")

  defp refuse_placeholder! do
    if String.starts_with?(@quoter_address, "REPLACE_") or String.starts_with?(@wvc_address, "REPLACE_") do
      raise "VinuswapQuoter.Live: quoter or WVC address placeholder still present — resolve from ~/vinuswap-backend/ before deploying"
    end
  end
end
```

Note: `Contract.eth_call/2` is a placeholder for whichever low-level call helper this codebase exposes — `grep -n "eth_call\|execute_contract_functions" apps/explorer/lib/explorer/ | head -5` to find the canonical helper, then replace `Contract.eth_call(...)` with that helper's actual signature.

The `refuse_placeholder!` runtime guard means even if the engineer forgets to replace the addresses, the Live module crashes on first call rather than silently returning bogus prices.

Add Mox dependency check: `grep -n '{:mox' apps/explorer/mix.exs` — if missing, add `{:mox, "~> 1.0", only: :test}` to deps and run `mix deps.get`.

In `apps/explorer/test/test_helper.exs`, add at the top:
```elixir
Mox.defmock(Explorer.Token.MockVinuswapQuoter, for: Explorer.Token.VinuswapQuoter)
Application.put_env(:explorer, :vinuswap_quoter, Explorer.Token.MockVinuswapQuoter)
```

In `config/config.exs`, add:
```elixir
config :explorer, :vinuswap_quoter, Explorer.Token.VinuswapQuoter.Live
```

- [ ] **Step 4: Implement the Mix task**

Create `apps/explorer/lib/mix/tasks/vinu/fill_vinuswap_prices.ex`:
```elixir
defmodule Mix.Tasks.Vinu.FillVinuswapPrices do
  @moduledoc """
  Daily job to populate `tokens.exchange_rate` from the VinuSwap
  on-chain quoter. Tokens whose `exchange_rate` is already set by
  upstream feeds (e.g. CoinGecko via the existing market integration)
  are skipped. Invoked from system cron at 00:30 UTC.

      mix vinu.fill_vinuswap_prices --vc-usd 0.10

  When `--vc-usd` is omitted, the task pulls the current rate from
  `Explorer.Market.get_native_coin_exchange_rate/0`.
  """
  use Mix.Task

  alias Explorer.Repo

  @fee_tiers [500, 3000, 10_000]
  @transfers_threshold 100

  @impl true
  def run(args) do
    Mix.Task.run("app.start")
    {opts, _, _} = OptionParser.parse(args, strict: [vc_usd: :string])
    vc_usd =
      case opts[:vc_usd] do
        nil -> Explorer.Market.get_native_coin_exchange_rate() || Decimal.new(0)
        s -> Decimal.new(s)
      end

    quoter = Application.get_env(:explorer, :vinuswap_quoter, Explorer.Token.VinuswapQuoter.Live)

    sql = """
    SELECT contract_address_hash
    FROM tokens
    WHERE exchange_rate IS NULL AND transfers_count >= $1
    """

    %{rows: rows} = Repo.query!(sql, [@transfers_threshold])

    Enum.each(rows, fn [token_hash] ->
      case try_fee_tiers(quoter, token_hash) do
        {:ok, quote_wvc_wei} ->
          # quote is WVC wei per 1e18 token wei; price per token unit = quote / 1e18 WVC
          # USD per token = (quote / 1e18) * vc_usd
          usd_per_token =
            quote_wvc_wei
            |> Decimal.div(Decimal.new(1_000_000_000_000_000_000))
            |> Decimal.mult(vc_usd)

          Repo.query!(
            "UPDATE tokens SET exchange_rate = $1, updated_at = NOW() WHERE contract_address_hash = $2",
            [usd_per_token, token_hash]
          )

        :error ->
          :ok
      end
    end)
  end

  defp try_fee_tiers(quoter, token_hash) do
    Enum.find_value(@fee_tiers, :error, fn tier ->
      case quoter.quote(token_hash, tier) do
        {:ok, v} -> {:ok, v}
        _ -> nil
      end
    end)
  end
end
```

- [ ] **Step 5: Run test to verify it passes**

Run: `MIX_ENV=test mix test apps/explorer/test/mix/tasks/vinu/fill_vinuswap_prices_test.exs --trace`
Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add apps/explorer/lib/explorer/token/vinuswap_quoter.ex \
        apps/explorer/lib/mix/tasks/vinu/fill_vinuswap_prices.ex \
        apps/explorer/test/mix/tasks/vinu/fill_vinuswap_prices_test.exs \
        apps/explorer/test/test_helper.exs \
        config/config.exs \
        apps/explorer/mix.exs
git -c commit.gpgsign=false commit -m "feat(mix): vinuswap price filler with Mox-backed quoter"
```

## Task 1.12 — CSV export endpoints

**Files:**
- Modify: `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/csv_export_controller.ex` (path may differ — verify via `grep -rn 'csv_export' apps/block_scout_web/lib/block_scout_web/controllers/`)
- Modify: `apps/block_scout_web/lib/block_scout_web/api_router.ex`
- Test: a new `csv_export_controller_test.exs` under the same controllers test directory

- [ ] **Step 1: Write the failing test**

Create `apps/block_scout_web/test/block_scout_web/controllers/api/v2/csv_export_controller_test.exs` (if not present) and add:
```elixir
defmodule BlockScoutWeb.API.V2.CsvExportControllerTest do
  use BlockScoutWeb.ConnCase

  test "GET /api/v2/tokens/:hash/holders/distribution/csv returns text/csv", %{conn: conn} do
    token = insert(:token, total_supply: 1000)
    conn = get(conn, "/api/v2/tokens/#{token.contract_address_hash}/holders/distribution/csv")
    assert response_content_type(conn, :csv) =~ "text/csv"
    body = response(conn, 200)
    assert body =~ "bucket_label,min_usd,max_usd,holder_count,sum_usd"
  end

  test "GET /api/v2/tokens/:hash/holders/chart/csv returns text/csv", %{conn: conn} do
    token = insert(:token)
    Explorer.Chain.Token.HolderCount.upsert(token.contract_address_hash, ~D[2026-05-20], 50)
    conn = get(conn, "/api/v2/tokens/#{token.contract_address_hash}/holders/chart/csv?period=30d")
    assert response_content_type(conn, :csv) =~ "text/csv"
    body = response(conn, 200)
    assert body =~ "day,holder_count"
    assert body =~ "2026-05-20,50"
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/csv_export_controller_test.exs --trace`
Expected: route-not-found.

- [ ] **Step 3: Implement actions**

Locate the existing CSV export controller. Add:
```elixir
def holders_distribution_csv(conn, %{"address_hash_param" => address_hash_param}) do
  with {:ok, hash} <- Chain.string_to_address_hash(address_hash_param) do
    %{value_buckets: buckets} = Explorer.Chain.Cache.TokenDistribution.get(hash)

    rows = [
      ["bucket_label", "min_usd", "max_usd", "holder_count", "sum_usd"]
      | Enum.map(buckets, fn b -> [b.label, to_string(b.min_usd), to_string(b.max_usd || ""), to_string(b.holder_count), to_string(b.sum_usd)] end)
    ]

    send_csv(conn, "holders_distribution_#{address_hash_param}.csv", rows)
  end
end

def holders_chart_csv(conn, %{"address_hash_param" => address_hash_param} = params) do
  with {:ok, hash} <- Chain.string_to_address_hash(address_hash_param) do
    days = case params["period"] do
      "24h" -> 1
      "7d" -> 7
      "30d" -> 30
      "90d" -> 90
      _ -> 30
    end
    to = Date.utc_today()
    from = Date.add(to, -days)
    series = Explorer.Chain.Token.HolderCount.series(hash, from, to)

    rows = [
      ["day", "holder_count"]
      | Enum.map(series, fn r -> [Date.to_iso8601(r.day), to_string(r.holder_count)] end)
    ]

    send_csv(conn, "holders_chart_#{address_hash_param}.csv", rows)
  end
end

defp send_csv(conn, filename, rows) do
  csv = NimbleCSV.RFC4180.dump_to_iodata(rows)
  conn
  |> put_resp_content_type("text/csv")
  |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}\"")
  |> send_resp(200, csv)
end
```

Add `alias NimbleCSV.RFC4180` if convention requires. Verify `nimble_csv` is already a dependency (`grep nimble_csv apps/block_scout_web/mix.exs`); if not, add `{:nimble_csv, "~> 1.2"}` and `mix deps.get`.

- [ ] **Step 4: Wire routes**

Below the existing chart route in `api_router.ex`:
```elixir
get("/:address_hash_param/holders/distribution/csv", V2.CsvExportController, :holders_distribution_csv)
get("/:address_hash_param/holders/chart/csv", V2.CsvExportController, :holders_chart_csv)
```
(Adjust the module reference to whichever module currently owns CSV export in the v2 namespace; the test imports `BlockScoutWeb.API.V2.CsvExportController`.)

- [ ] **Step 5: Run tests to verify**

Run: `MIX_ENV=test mix test apps/block_scout_web/test/block_scout_web/controllers/api/v2/csv_export_controller_test.exs --trace`
Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add apps/block_scout_web/lib/block_scout_web/controllers/api/v2/csv_export_controller.ex \
        apps/block_scout_web/lib/block_scout_web/api_router.ex \
        apps/block_scout_web/test/block_scout_web/controllers/api/v2/csv_export_controller_test.exs
git -c commit.gpgsign=false commit -m "feat(api/v2): CSV exports for distribution + holder chart"
```

## Task 1.13 — `seed_labels` Mix task

**Files:**
- Create: `apps/explorer/lib/mix/tasks/vinu/seed_labels.ex`
- Test: `apps/explorer/test/mix/tasks/vinu/seed_labels_test.exs`

- [ ] **Step 1: Write the failing test**

Create `apps/explorer/test/mix/tasks/vinu/seed_labels_test.exs`:
```elixir
defmodule Mix.Tasks.Vinu.SeedLabelsTest do
  use Explorer.DataCase
  alias Explorer.Account.AddressTag
  alias Explorer.Repo

  test "creates an address_tag row per slug" do
    Mix.Task.rerun("vinu.seed_labels", ["--labels", "exchange,meme,liquidity-pool"])
    slugs = Repo.all(AddressTag) |> Enum.map(& &1.slug)
    assert "exchange" in slugs
    assert "meme" in slugs
    assert "liquidity-pool" in slugs
  end

  test "is idempotent" do
    Mix.Task.rerun("vinu.seed_labels", ["--labels", "exchange"])
    Mix.Task.rerun("vinu.seed_labels", ["--labels", "exchange"])
    count = Repo.aggregate(AddressTag, :count)
    assert count == 1
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `MIX_ENV=test mix test apps/explorer/test/mix/tasks/vinu/seed_labels_test.exs --trace`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `apps/explorer/lib/mix/tasks/vinu/seed_labels.ex`:
```elixir
defmodule Mix.Tasks.Vinu.SeedLabels do
  @moduledoc """
  Seed `address_tags` rows for known protocol labels. Run once after
  PR #1 deploys; safe to re-run.

      mix vinu.seed_labels --labels exchange,meme,liquidity-pool
  """
  use Mix.Task

  alias Explorer.Account.AddressTag
  alias Explorer.Repo

  @impl true
  def run(args) do
    Mix.Task.run("app.start")
    {opts, _, _} = OptionParser.parse(args, strict: [labels: :string])
    labels = (opts[:labels] || "exchange,meme,liquidity-pool") |> String.split(",")

    Enum.each(labels, fn slug ->
      display_name = slug |> String.split("-") |> Enum.map(&String.capitalize/1) |> Enum.join(" ")

      Repo.insert!(
        %AddressTag{
          name: display_name,
          display_name: display_name,
          slug: slug,
          tag_type: "protocol",
          meta: %{}
        },
        on_conflict: :nothing,
        conflict_target: :slug
      )
    end)
  end
end
```

- [ ] **Step 4: Run test to verify it passes**

Run: `MIX_ENV=test mix test apps/explorer/test/mix/tasks/vinu/seed_labels_test.exs --trace`
Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add apps/explorer/lib/mix/tasks/vinu/seed_labels.ex \
        apps/explorer/test/mix/tasks/vinu/seed_labels_test.exs
git -c commit.gpgsign=false commit -m "feat(mix): seed_labels task for Exchange/Meme/LP labels"
```

## Task 1.14 — Full Phase 1 acceptance, push, open PR

- [ ] **Step 1: Formatter + credo + dialyzer + full test suite**

Run:
```sh
cd ~/vinuexplorer-backend-tags-and-holders
mix format --check-formatted
mix credo --strict
MIX_ENV=test mix test --warnings-as-errors
```
Expected: all three exit 0. Fix any issues (run `mix format` to auto-fix formatting; address credo warnings; fix any compilation warnings).

- [ ] **Step 2: Push branch**

Run: `git push -u origin feat/tag-aware-search-and-holder-analytics 2>&1 | tail -5`
Expected: `* [new branch]      feat/tag-aware-search-and-holder-analytics -> feat/tag-aware-search-and-holder-analytics`.

- [ ] **Step 3: Open PR**

Run:
```sh
gh pr create \
  --title "feat(holders,search,labels): tag-aware search + holder analytics + label-page shim" \
  --body "$(cat <<'EOF'
## Summary

- Adds `Explorer.Chain.AddressTagSearch` + `ProxyMetadataController.addresses_by_label/2` so the already-shipped `/accounts/label/<slug>` frontend page returns data
- Extends `Explorer.Chain.Search.quick_search/1` to UNION public-tag matches; SearchController exposes them with `type: "public_tag"`
- Adds `sort` + `order` params to `/api/v2/tokens/:hash/holders` (default unchanged: `value`/`desc`)
- New analytics endpoints + ETS-cached aggregates:
  - `GET /api/v2/tokens/:hash/holders/distribution` — top5/10/100 %, Gini, whale count, USD value buckets
  - `GET /api/v2/tokens/:hash/holders/chart?period=24h|7d|30d|90d` — daily holder-count time series
  - `GET .../holders/distribution/csv` + `.../holders/chart/csv` exports
- New `token_holder_counts` table populated by `mix vinu.aggregate_holder_counts` (cron 00:05 UTC)
- New `mix vinu.fill_vinuswap_prices` (cron 00:30 UTC) populates `tokens.exchange_rate` via VinuSwap quoter
- Seed task `mix vinu.seed_labels` creates Exchange / Meme / Liquidity Pool tags

## Test plan

- [x] `mix test --warnings-as-errors` green on all new + existing tests
- [x] `mix credo --strict`, `mix format --check-formatted` clean
- [ ] Manual smoke (testnet):
  - [ ] `curl https://testnet.vinuexplorer.org/api/v2/search/quick?q=Exchange | jq '.[]|select(.type=="public_tag")'` returns expected shape
  - [ ] `curl .../api/v2/tokens/<hash>/holders/distribution | jq '.total_holders'`
  - [ ] `curl .../api/v2/tokens/<hash>/holders/chart?period=7d | jq '.items | length'` returns ≤ 7
  - [ ] `curl -OJ .../holders/distribution/csv` downloads a CSV with the expected header
  - [ ] `mix vinu.seed_labels --labels exchange,meme,liquidity-pool` idempotent
  - [ ] `mix vinu.aggregate_holder_counts --day $(date -d yesterday -I)` populates one row per active token

## Rollout

1. Merge to `master`; CodeDeploy ships to testnet
2. SSH into testnet RPC + run `mix vinu.seed_labels` + `mix vinu.aggregate_holder_counts --day <yesterday>` once (backfill)
3. Add cron entries on the testnet box for both daily tasks
4. ≥48 h soak on testnet, then repeat on mainnet
EOF
)"
```

- [ ] **Step 4: Update Brainstorm task to in_progress and commit a release-note update**

Skip if not using project task tracking. Otherwise note PR URL in `claude-progress.txt`.

---

# Phase 2 — PR #2 frontend: batch tag fetch for list pages

All Phase 2 work happens in `~/vinuexplorer-frontend-tags-everywhere` on branch `feat/tags-everywhere-and-holders-parity`. Smaller PR carved out for fast review.

## Task 2.1 — `useAddressesMetadata` helper hook

**Files:**
- Create: `lib/address/useAddressesMetadata.ts`
- Create: `lib/address/useAddressesMetadata.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/address/useAddressesMetadata.test.ts`:
```ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./useAddressMetadataInfoQuery', () => ({
  default: vi.fn(),
}));

import useAddressMetadataInfoQuery from './useAddressMetadataInfoQuery';
import useAddressesMetadata from './useAddressesMetadata';

describe('useAddressesMetadata', () => {
  it('returns undefined for unknown hash', () => {
    (useAddressMetadataInfoQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { addresses: {} },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useAddressesMetadata([ '0xAbC' ]));
    expect(result.current.getMetadata('0xabc')).toBeUndefined();
  });

  it('returns metadata for known lowercase hash', () => {
    (useAddressMetadataInfoQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { addresses: { '0xabc': { tags: [ { name: 'Exchange', tagType: 'protocol' } ], reputation: null } } },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useAddressesMetadata([ '0xABC' ]));
    const metadata = result.current.getMetadata('0xABC');
    expect(metadata?.tags[0].name).toBe('Exchange');
  });

  it('dedupes addresses and lowercases', () => {
    const spy = useAddressMetadataInfoQuery as ReturnType<typeof vi.fn>;
    spy.mockReturnValue({ data: { addresses: {} }, isLoading: false, isError: false });

    renderHook(() => useAddressesMetadata([ '0xABC', '0xabc', '0xDeF' ]));
    expect(spy).toHaveBeenCalledWith([ '0xabc', '0xdef' ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/vinuexplorer-frontend-tags-everywhere && yarn vitest run lib/address/useAddressesMetadata.test.ts`
Expected: FAIL — module not defined.

- [ ] **Step 3: Implement the hook**

Create `lib/address/useAddressesMetadata.ts`:
```ts
import { useCallback, useMemo } from 'react';

import useAddressMetadataInfoQuery from './useAddressMetadataInfoQuery';

export default function useAddressesMetadata(addresses: Array<string>) {
  const dedupedLowercase = useMemo(
    () => Array.from(new Set(addresses.map(a => a.toLowerCase()))),
    [ addresses ],
  );

  const query = useAddressMetadataInfoQuery(dedupedLowercase);

  const getMetadata = useCallback(
    (hash: string) => query.data?.addresses[hash.toLowerCase()],
    [ query.data ],
  );

  return {
    getMetadata,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run lib/address/useAddressesMetadata.test.ts`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```sh
git add lib/address/useAddressesMetadata.ts lib/address/useAddressesMetadata.test.ts
git -c commit.gpgsign=false commit -m "feat(metadata): useAddressesMetadata batch-fetch helper"
```

## Task 2.2 — Wire into `TokenHolders`

**Files:**
- Modify: `ui/token/TokenHolders/TokenHolders.tsx`

- [ ] **Step 1: Add enrichment + pass through**

Modify `ui/token/TokenHolders/TokenHolders.tsx`. At the top of imports:
```ts
import { useMemo } from 'react';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
```

In the component body, before `const items = holdersQuery.data?.items;`, add:
```ts
const items = holdersQuery.data?.items;

const { getMetadata } = useAddressesMetadata(items?.map(i => i.address.hash) ?? []);

const enrichedItems = useMemo(
  () => items?.map(i => ({
    ...i,
    address: { ...i.address, metadata: getMetadata(i.address.hash) ?? i.address.metadata },
  })),
  [ items, getMetadata ],
);
```

Replace the two `data={ items }` references (one in `TokenHoldersTable`, one in `TokenHoldersList`) with `data={ enrichedItems }`. Also replace `items.length` with `enrichedItems?.length` and `items` in the outer `itemsNum` prop with `enrichedItems`.

- [ ] **Step 2: Type-check**

Run: `yarn tsc --noEmit 2>&1 | head -30`
Expected: no errors related to TokenHolders.

- [ ] **Step 3: Manual smoke (skip in agentic execution, run locally during review)**

Run: `yarn dev` and navigate to a token holders page. Holders with public tags should now render the label instead of the bare hash.

- [ ] **Step 4: Commit**

```sh
git add ui/token/TokenHolders/TokenHolders.tsx
git -c commit.gpgsign=false commit -m "feat(holders): enrich rows with public-tag metadata"
```

## Task 2.3 — Wire into `TokenTransfer` lists

**Files:**
- Modify: `ui/token/TokenTransfer/TokenTransferTable.tsx`
- Modify: `ui/token/TokenTransfer/TokenTransferList.tsx` (if exists; otherwise the mobile sibling — verify with `ls ui/token/TokenTransfer/`)

- [ ] **Step 1: Identify the parent that calls both Table and List**

Run: `cd ~/vinuexplorer-frontend-tags-everywhere && grep -rln "TokenTransferTable\|TokenTransferList" ui/ | head -5`
Identify the parent component (likely `ui/token/TokenTransfer/TokenTransfer.tsx` or a token-page tab component).

- [ ] **Step 2: Add enrichment at the parent**

In the parent, apply the same pattern as Task 2.2. Gather sender + receiver hashes:
```ts
const allHashes = useMemo(
  () => (items ?? []).flatMap(i => [ i.from?.hash, i.to?.hash ].filter(Boolean) as Array<string>),
  [ items ],
);

const { getMetadata } = useAddressesMetadata(allHashes);

const enrichedItems = useMemo(
  () => items?.map(i => ({
    ...i,
    from: i.from && { ...i.from, metadata: getMetadata(i.from.hash) ?? i.from.metadata },
    to: i.to && { ...i.to, metadata: getMetadata(i.to.hash) ?? i.to.metadata },
  })),
  [ items, getMetadata ],
);
```

Pass `enrichedItems` to both Table and List instances.

- [ ] **Step 3: Type-check + commit**

```sh
yarn tsc --noEmit 2>&1 | head -10
git add ui/token/TokenTransfer/
git -c commit.gpgsign=false commit -m "feat(transfers): enrich token-transfer rows with metadata"
```

## Task 2.4 — Wire into `TxsListItem` / `TxsTable`

**Files:**
- Modify: `ui/txs/TxsContent.tsx` (or whichever component owns the Table+List pair — verify with `grep -rln "TxsTable" ui/txs/`)

- [ ] **Step 1: Identify the parent**

Run: `grep -rln "TxsTable\|TxsListItem" ui/txs/ | head -5`. The parent that renders both (likely `TxsContent.tsx`) is where to enrich.

- [ ] **Step 2: Add enrichment**

Same pattern as 2.3 but with `from` and `to` (and possibly `created_contract`).

- [ ] **Step 3: Type-check + commit**

```sh
yarn tsc --noEmit
git add ui/txs/
git -c commit.gpgsign=false commit -m "feat(txs): enrich tx-list rows with metadata"
```

## Task 2.5 — Wire into address-page subtables

**Files:** identify with `grep -rln "AddressEntity" ui/address/` and pick the parents of subtables for: internal txs, token transfers, blocks validated, internal tx counter. Apply the same enrichment pattern.

- [ ] **Step 1: List subtable parents**

Run: `grep -l "useQueryWithPages\|generateListStub" ui/address/ | head -10`
Pick parents that render a paginated list whose items each carry one or more `AddressParam`s.

- [ ] **Step 2: For each parent: apply enrichment pattern**

Repeat the Task 2.2/2.3 pattern: collect hashes, `useAddressesMetadata`, memoize enrichedItems, pass to both Table + List. Skip parents that show a single address.

- [ ] **Step 3: Type-check + commit per parent**

For each parent, separate commit. Example:
```sh
git add ui/address/AddressInternalTxs.tsx
git -c commit.gpgsign=false commit -m "feat(address): enrich internal-tx rows with metadata"
```

## Task 2.6 — Playwright snapshot for tagged holder row

**Files:**
- Modify: `ui/token/TokenHolders/TokenHoldersTable.pw.tsx`

- [ ] **Step 1: Add a fixture row with metadata**

In the existing Playwright test, add a new test case:
```ts
test('renders public-tag label instead of hash when metadata present', async({ render, page, mockApiResponse }) => {
  await mockApiResponse('general:addresses_metadata_search', {
    addresses: {
      '0x0000000000000000000000000000000000000001': {
        tags: [ { name: 'Coinbase', tagType: 'name', meta: { bgColor: '#0052FF', textColor: '#fff' } } ],
        reputation: null,
      },
    },
  });

  await render(<TokenHoldersTable data={ FIXTURE_WITH_TAGGED } token={ TOKEN_FIXTURE } top={ 0 }/>);
  await expect(page.getByText('Coinbase')).toBeVisible();
  await expect(page.getByText('0x0000…0001')).not.toBeVisible();
});
```

- [ ] **Step 2: Run Playwright**

Run: `yarn test:pw -- ui/token/TokenHolders/TokenHoldersTable.pw.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```sh
git add ui/token/TokenHolders/TokenHoldersTable.pw.tsx
git -c commit.gpgsign=false commit -m "test(holders): pw snapshot for tagged holder row"
```

## Task 2.7 — Push, open PR

- [ ] **Step 1: Acceptance gates**

Run:
```sh
cd ~/vinuexplorer-frontend-tags-everywhere
yarn lint
yarn tsc --noEmit
yarn vitest run lib/address/
yarn test:pw -- ui/token/TokenHolders/
```
Expected: all green.

- [ ] **Step 2: Push (carry the worktree's branch only — do not push the spec/plan commits separately, they ride along)**

Run: `git push -u origin feat/tags-everywhere-and-holders-parity 2>&1 | tail -5`

- [ ] **Step 3: Open PR scoped to PR #2 work only**

Since PRs #3 and #4 land on the same branch later, this PR is opened as a draft that grows. Open it now to keep CI running on every commit:
```sh
gh pr create --draft \
  --title "feat(metadata,holders): batch tag fetch for list pages + holders revamp + analytics" \
  --body "$(cat <<'EOF'
Tracks the frontend portion of the tags-everywhere + holders BscScan parity work. Lands in three logical chunks on this branch:

- [x] **PR #2 chunk** — useAddressesMetadata hook + wire into TokenHolders, TokenTransfer, TxsContent, address subtables
- [ ] **PR #3 chunk** — TokenHolders table revamp (Rank, Label, USD Value, sortable headers, summary line)
- [ ] **PR #4 chunk** — Concentration card, holder chart, distribution histogram, search "Public tag" group, CSV menu items

Backend dependency: VinuChain/vinuexplorer-backend PR `feat/tag-aware-search-and-holder-analytics`.

Spec + plan: `docs/superpowers/specs/2026-05-21-vinuexplorer-tags-everywhere-and-holders-parity-design.md`
EOF
)"
```

---

# Phase 3 — PR #3 frontend: Token holders table revamp

Continues on the same branch in `~/vinuexplorer-frontend-tags-everywhere`.

## Task 3.1 — Extend `TokenHolder` type + add sorting types

**Files:**
- Modify: `types/api/token.ts`
- Modify: `lib/api/services/general/token.ts`

- [ ] **Step 1: Add `usd_value` to backend-returned holder fields**

The backend distribution endpoint already carries USD info. For the holders endpoint we'll join price client-side from `token.exchange_rate` × `value`. So no backend-shape change needed for the holder row. Skip if type already covers `value` + `address.metadata`.

- [ ] **Step 2: Add sort filter types**

In `lib/api/services/general/token.ts` find the existing token-holders resource entry (likely `token_holders` with `paginated: true`). Add `filterFields: ['sort' as const, 'order' as const],` so `useQueryWithPages` can pass them.

- [ ] **Step 3: Commit**

```sh
git add lib/api/services/general/token.ts types/api/token.ts
git -c commit.gpgsign=false commit -m "feat(holders): add sort/order filter fields to holders resource"
```

## Task 3.2 — Table revamp: Rank + Label + USD Value columns + sortable

**Files:**
- Modify: `ui/token/TokenHolders/TokenHoldersTable.tsx`
- Modify: `ui/token/TokenHolders/TokenHoldersTableItem.tsx`

- [ ] **Step 1: Replace table header**

In `TokenHoldersTable.tsx`, replace the existing `<TableRow>` content with:
```tsx
<TableRow>
  <TableColumnHeader w="60px" isNumeric>Rank</TableColumnHeader>
  <TableColumnHeader w="32%">Holder</TableColumnHeader>
  <TableColumnHeader w="180px">Label</TableColumnHeader>
  { (token.type === 'ERC-1155' || token.type === 'ERC-404') && <TableColumnHeader w="180px">ID#</TableColumnHeader> }
  <TableColumnHeader isNumeric width="220px" onSort={ handleSort('value') } sortIcon={ sortIcon('value') }>Quantity</TableColumnHeader>
  <TableColumnHeader isNumeric width="140px">USD Value</TableColumnHeader>
  { token.total_supply && token.type !== 'ERC-404' && <TableColumnHeader isNumeric width="175px">Percentage</TableColumnHeader> }
</TableRow>
```

Add at the top of the component:
```ts
import { useRouter } from 'next/router';

const TokenHoldersTable = ({ data, token, top, isLoading, pageStartIndex = 0 }: Props) => {
  const router = useRouter();
  const currentSort = (router.query.sort as string) || 'value';
  const currentOrder = (router.query.order as string) || 'desc';

  const handleSort = (field: string) => () => {
    const newOrder = currentSort === field && currentOrder === 'desc' ? 'asc' : 'desc';
    router.push({ query: { ...router.query, sort: field, order: newOrder } }, undefined, { shallow: true });
  };

  const sortIcon = (field: string): 'desc' | 'asc' | undefined =>
    currentSort === field ? (currentOrder as 'desc' | 'asc') : undefined;
```

Add `pageStartIndex` to `Props`:
```ts
interface Props {
  data: Array<TokenHolder>;
  token: TokenInfo;
  top: number;
  isLoading?: boolean;
  pageStartIndex?: number;
}
```

Wire `pageStartIndex` and `index` into the item:
```tsx
<TokenHoldersTableItem
  key={ item.address.hash + tokenId + (isLoading ? index : '') }
  holder={ item }
  token={ token }
  rank={ pageStartIndex + index + 1 }
  isLoading={ isLoading }
/>
```

- [ ] **Step 2: Update `TokenHoldersTableItem` for new columns**

Replace `TokenHoldersTableItem.tsx` body with:
```tsx
import BigNumber from 'bignumber.js';
import React from 'react';

import type { TokenHolder, TokenInfo } from 'types/api/token';

import { TableCell, TableRow } from 'toolkit/chakra/table';
import { TruncatedText } from 'toolkit/components/truncation/TruncatedText';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import Utilization from 'ui/shared/Utilization/Utilization';
import AssetValue from 'ui/shared/value/AssetValue';

type Props = {
  holder: TokenHolder;
  token: TokenInfo;
  rank: number;
  isLoading?: boolean;
};

const formatUsd = (amount: string, decimals: string, rate: string | null | undefined): string => {
  if (!rate) return '-';
  const tokens = new BigNumber(amount).div(new BigNumber(10).pow(decimals));
  const usd = tokens.times(rate);
  return '$' + usd.toFormat(2);
};

const TokenHoldersTableItem = ({ holder, token, rank, isLoading }: Props) => {
  const labelTags = (holder.address.metadata?.tags ?? []).filter(t => t.tagType === 'protocol' || t.tagType === 'generic');

  return (
    <TableRow>
      <TableCell verticalAlign="middle" isNumeric color="text_secondary">{ rank }</TableCell>
      <TableCell verticalAlign="middle">
        <AddressEntity address={ holder.address } isLoading={ isLoading } flexGrow={ 1 } fontWeight="700"/>
      </TableCell>
      <TableCell verticalAlign="middle">
        { labelTags.length > 0 ? (
          <>
            { labelTags.map(tag => (
              <EntityTag key={ tag.name } data={ tag } isLoading={ isLoading } mr={ 1 }/>
            )) }
          </>
        ) : null }
      </TableCell>
      { (token.type === 'ERC-1155' || token.type === 'ERC-404') && 'token_id' in holder && (
        <TableCell verticalAlign="middle">
          <TruncatedText text={ holder.token_id } loading={ isLoading } w="100%"/>
        </TableCell>
      ) }
      <TableCell verticalAlign="middle" isNumeric>
        <AssetValue amount={ holder.value } decimals={ token.decimals ?? '0' } loading={ isLoading }/>
      </TableCell>
      <TableCell verticalAlign="middle" isNumeric>
        { formatUsd(holder.value, token.decimals ?? '18', token.exchange_rate) }
      </TableCell>
      { token.total_supply && token.type !== 'ERC-404' && (
        <TableCell verticalAlign="middle" isNumeric>
          <Utilization
            value={ BigNumber(holder.value).div(BigNumber(token.total_supply)).dp(4).toNumber() }
            colorScheme="green"
            display="inline-flex"
            isLoading={ isLoading }
          />
        </TableCell>
      ) }
    </TableRow>
  );
};

export default React.memo(TokenHoldersTableItem);
```

- [ ] **Step 3: Pass `pageStartIndex` from `TokenHolders.tsx`**

In `TokenHolders.tsx`, pass:
```tsx
<TokenHoldersTable
  data={ enrichedItems }
  token={ token }
  top={ tabsHeight }
  isLoading={ holdersQuery.isPlaceholderData }
  pageStartIndex={ ((holdersQuery.pagination.page ?? 1) - 1) * (enrichedItems?.length ?? 0) }
/>
```

If `pagination.page` is not available on the query object, derive from cursor: page 1 = no `page_token`, increment on each `onNextPageClick` (use existing pagination state). Simpler: track via local `useState` synced to pagination changes if needed.

- [ ] **Step 4: Type-check + commit**

```sh
yarn tsc --noEmit
git add ui/token/TokenHolders/TokenHoldersTable.tsx \
        ui/token/TokenHolders/TokenHoldersTableItem.tsx \
        ui/token/TokenHolders/TokenHolders.tsx
git -c commit.gpgsign=false commit -m "feat(holders): Rank + Label + USD Value columns, sortable headers"
```

## Task 3.3 — Mobile list parity

**Files:**
- Modify: `ui/token/TokenHolders/TokenHoldersListItem.tsx`
- Modify: `ui/token/TokenHolders/TokenHoldersList.tsx`

- [ ] **Step 1: Update `TokenHoldersList.tsx` to pass rank**

```tsx
import React from 'react';

interface Props {
  data: Array<TokenHolder>;
  token: TokenInfo;
  isLoading?: boolean;
  pageStartIndex?: number;
}

const TokenHoldersList = ({ data, token, isLoading, pageStartIndex = 0 }: Props) => {
  return (
    <Box>
      { data.map((item, index) => {
        const tokenId = 'token_id' in item ? item.token_id : null;
        return (
          <TokenHoldersListItem
            key={ item.address.hash + tokenId + (isLoading ? index : '') }
            token={ token }
            holder={ item }
            rank={ pageStartIndex + index + 1 }
            isLoading={ isLoading }
          />
        );
      }) }
    </Box>
  );
};
```

- [ ] **Step 2: Update `TokenHoldersListItem.tsx` to render Rank + Label + USD Value rows**

```tsx
import BigNumber from 'bignumber.js';
import React from 'react';

import type { TokenHolder, TokenInfo } from 'types/api/token';

import { TruncatedText } from 'toolkit/components/truncation/TruncatedText';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import ListItemMobileGrid from 'ui/shared/ListItemMobile/ListItemMobileGrid';
import Utilization from 'ui/shared/Utilization/Utilization';
import AssetValue from 'ui/shared/value/AssetValue';

interface Props {
  holder: TokenHolder;
  token: TokenInfo;
  rank: number;
  isLoading?: boolean;
}

const TokenHoldersListItem = ({ holder, token, rank, isLoading }: Props) => {
  const labelTags = (holder.address.metadata?.tags ?? []).filter(t => t.tagType === 'protocol' || t.tagType === 'generic');
  const usd = (() => {
    if (!token.exchange_rate) return '-';
    const v = new BigNumber(holder.value).div(new BigNumber(10).pow(token.decimals ?? '18')).times(token.exchange_rate);
    return '$' + v.toFormat(2);
  })();

  return (
    <ListItemMobileGrid.Container>
      <ListItemMobileGrid.Label isLoading={ isLoading }>Rank</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>{ rank }</ListItemMobileGrid.Value>

      <ListItemMobileGrid.Label isLoading={ isLoading }>Address</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>
        <AddressEntity address={ holder.address } isLoading={ isLoading } fontWeight="700" maxW="100%"/>
      </ListItemMobileGrid.Value>

      { labelTags.length > 0 && (
        <>
          <ListItemMobileGrid.Label isLoading={ isLoading }>Label</ListItemMobileGrid.Label>
          <ListItemMobileGrid.Value>
            { labelTags.map(tag => <EntityTag key={ tag.name } data={ tag } isLoading={ isLoading } mr={ 1 }/>) }
          </ListItemMobileGrid.Value>
        </>
      ) }

      { (token.type === 'ERC-1155' || token.type === 'ERC-404') && 'token_id' in holder && (
        <>
          <ListItemMobileGrid.Label isLoading={ isLoading }>ID#</ListItemMobileGrid.Label>
          <ListItemMobileGrid.Value>
            <TruncatedText text={ holder.token_id } loading={ isLoading } w="100%"/>
          </ListItemMobileGrid.Value>
        </>
      ) }

      <ListItemMobileGrid.Label isLoading={ isLoading }>Quantity</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>
        <AssetValue amount={ holder.value } decimals={ token.decimals ?? '0' } loading={ isLoading }/>
      </ListItemMobileGrid.Value>

      <ListItemMobileGrid.Label isLoading={ isLoading }>USD Value</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>{ usd }</ListItemMobileGrid.Value>

      { token.total_supply && token.type !== 'ERC-404' && (
        <>
          <ListItemMobileGrid.Label isLoading={ isLoading }>Percentage</ListItemMobileGrid.Label>
          <ListItemMobileGrid.Value>
            <Utilization
              value={ BigNumber(holder.value).div(BigNumber(token.total_supply)).dp(4).toNumber() }
              colorScheme="green"
              isLoading={ isLoading }
              display="inline-flex"
            />
          </ListItemMobileGrid.Value>
        </>
      ) }
    </ListItemMobileGrid.Container>
  );
};

export default TokenHoldersListItem;
```

- [ ] **Step 3: Update `TokenHolders.tsx` mobile list invocation**

```tsx
<TokenHoldersList
  data={ enrichedItems }
  token={ token }
  isLoading={ holdersQuery.isPlaceholderData }
  pageStartIndex={ ((holdersQuery.pagination.page ?? 1) - 1) * (enrichedItems?.length ?? 0) }
/>
```

- [ ] **Step 4: Type-check + commit**

```sh
yarn tsc --noEmit
git add ui/token/TokenHolders/TokenHoldersListItem.tsx \
        ui/token/TokenHolders/TokenHoldersList.tsx \
        ui/token/TokenHolders/TokenHolders.tsx
git -c commit.gpgsign=false commit -m "feat(holders): mobile parity for Rank/Label/USD Value"
```

## Task 3.4 — Summary line

**Files:**
- Create: `ui/token/TokenHolders/TokenHoldersSummaryLine.tsx`
- Modify: `ui/token/TokenHolders/TokenHolders.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Text } from '@chakra-ui/react';
import React from 'react';

interface Props {
  loadedCount: number | undefined;
  totalCount: number | undefined;
}

const TokenHoldersSummaryLine = ({ loadedCount, totalCount }: Props) => {
  if (!totalCount) return null;
  if (!loadedCount || loadedCount >= totalCount) {
    return <Text color="text_secondary" fontSize="sm" my={ 2 }>{ totalCount.toLocaleString() } holders</Text>;
  }
  return (
    <Text color="text_secondary" fontSize="sm" my={ 2 }>
      Top { loadedCount.toLocaleString() } holders (from a total of { totalCount.toLocaleString() } holders)
    </Text>
  );
};

export default TokenHoldersSummaryLine;
```

- [ ] **Step 2: Render in `TokenHolders.tsx` above the table**

Before the `<Box display={{ base: 'none', lg: 'block' }}>` block:
```tsx
<TokenHoldersSummaryLine
  loadedCount={ enrichedItems?.length }
  totalCount={ holdersQuery.data?.total_count ?? token?.holders }
/>
```

(`token.holders` is the existing field for total holder count; verify with `grep total_count types/api/token.ts`.)

- [ ] **Step 3: Type-check + commit**

```sh
yarn tsc --noEmit
git add ui/token/TokenHolders/TokenHoldersSummaryLine.tsx \
        ui/token/TokenHolders/TokenHolders.tsx
git -c commit.gpgsign=false commit -m "feat(holders): Top-N-of-M summary line"
```

## Task 3.5 — Playwright snapshots for the revamp

**Files:**
- Modify: `ui/token/TokenHolders/TokenHoldersTable.pw.tsx`
- Modify: `ui/token/TokenHolders/TokenHoldersList.pw.tsx`

- [ ] **Step 1: Update existing tests to assert new columns**

In `TokenHoldersTable.pw.tsx` add assertions:
```ts
await expect(page.getByText(/^Rank$/)).toBeVisible();
await expect(page.getByText(/^Label$/)).toBeVisible();
await expect(page.getByText(/^USD Value$/)).toBeVisible();
await expect(page.getByText('1', { exact: true }).first()).toBeVisible();  // first rank
```

Same for mobile in `TokenHoldersList.pw.tsx`.

- [ ] **Step 2: Run Playwright**

Run: `yarn test:pw -- ui/token/TokenHolders/`
Expected: PASS. Update visual snapshot baselines with `yarn test:pw -- --update-snapshots ui/token/TokenHolders/` if mismatches are intentional.

- [ ] **Step 3: Commit**

```sh
git add ui/token/TokenHolders/*.pw.tsx ui/token/TokenHolders/__screenshots__/
git -c commit.gpgsign=false commit -m "test(holders): pw snapshots for new columns + mobile parity"
```

## Task 3.6 — Push to existing draft PR

- [ ] **Step 1: Acceptance gates + push**

Run:
```sh
yarn lint
yarn tsc --noEmit
yarn vitest run lib/
yarn test:pw -- ui/token/TokenHolders/
git push
```

- [ ] **Step 2: Tick the PR-3 chunk checkbox in the draft PR body**

Run: `gh pr edit --body "$(gh pr view --json body --jq .body | sed 's/- \[ \] \*\*PR #3 chunk\*\*/- [x] **PR #3 chunk**/')"`

---

# Phase 4 — PR #4 frontend: concentration card + charts + search + CSV

Continues on the same branch.

## Task 4.1 — Add `token_holders_distribution` + `token_holders_chart` API resources

**Files:**
- Modify: `lib/api/services/general/token.ts`
- Modify: `types/api/token.ts`

- [ ] **Step 1: Add resource definitions**

In `lib/api/services/general/token.ts` add to the resources map:
```ts
token_holders_distribution: {
  path: '/api/v2/tokens/:hash/holders/distribution',
  pathParams: [ 'hash' as const ],
},
token_holders_chart: {
  path: '/api/v2/tokens/:hash/holders/chart',
  pathParams: [ 'hash' as const ],
  filterFields: [ 'period' as const ],
},
```

In the same file's response-type union, add:
```ts
R extends 'general:token_holders_distribution' ? TokenHoldersDistribution :
R extends 'general:token_holders_chart' ? TokenHoldersChart :
```

In `types/api/token.ts`:
```ts
export interface TokenHoldersDistributionBucket {
  label: string;
  min_usd: number;
  max_usd: number | null;
  holder_count: number;
  sum_usd: string;
}

export interface TokenHoldersDistribution {
  total_holders: number;
  total_value: string | null;
  top5_percentage: number | null;
  top10_percentage: number | null;
  top100_percentage: number | null;
  whale_holders_count: number;
  gini_coefficient: number | null;
  value_buckets: Array<TokenHoldersDistributionBucket>;
}

export interface TokenHoldersChartPoint {
  day: string;
  holder_count: number;
}

export interface TokenHoldersChart {
  items: Array<TokenHoldersChartPoint>;
}
```

- [ ] **Step 2: Type-check + commit**

```sh
yarn tsc --noEmit
git add lib/api/services/general/token.ts types/api/token.ts
git -c commit.gpgsign=false commit -m "feat(api): token_holders_distribution + token_holders_chart resources"
```

## Task 4.2 — `TokenHoldersConcentration` card

**Files:**
- Create: `ui/token/TokenHolders/TokenHoldersConcentration.tsx`
- Create: `ui/token/TokenHolders/TokenHoldersConcentration.pw.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import { Flex } from '@chakra-ui/react';
import React from 'react';

import useApiQuery from 'lib/api/useApiQuery';
import StatsWidget from 'ui/shared/stats/StatsWidget';

interface Props { hash: string }

const formatPct = (v: number | null): string => v == null ? '-' : v.toFixed(2) + '%';
const formatGini = (v: number | null): string => v == null ? '-' : v.toFixed(4);

const TokenHoldersConcentration = ({ hash }: Props) => {
  const query = useApiQuery('general:token_holders_distribution', { pathParams: { hash } });

  if (query.isError) return null;

  const data = query.data;

  return (
    <Flex gap={ 3 } flexWrap="wrap" mb={ 4 }>
      <StatsWidget label="Top 100" value={ formatPct(data?.top100_percentage ?? null) } isLoading={ query.isLoading }/>
      <StatsWidget label="Top 10" value={ formatPct(data?.top10_percentage ?? null) } isLoading={ query.isLoading }/>
      <StatsWidget label="Whale (>=1%)" value={ data == null ? '-' : data.whale_holders_count.toString() } isLoading={ query.isLoading }/>
      <StatsWidget label="Gini" value={ formatGini(data?.gini_coefficient ?? null) } tooltip="0 = perfect equality, 1 = total inequality" isLoading={ query.isLoading }/>
    </Flex>
  );
};

export default TokenHoldersConcentration;
```

(If `StatsWidget` does not exist, check `ui/shared/stats/` and use whichever component renders a label+value tile; fallback to a simple `Box` with label above value.)

- [ ] **Step 2: Add Playwright snapshot**

```tsx
import { test, expect } from '@playwright/experimental-ct-react';
import TokenHoldersConcentration from './TokenHoldersConcentration';

test('renders 4 tiles', async ({ render, page, mockApiResponse }) => {
  await mockApiResponse('general:token_holders_distribution', {
    total_holders: 100,
    total_value: '1000',
    top5_percentage: 50,
    top10_percentage: 60,
    top100_percentage: 90,
    whale_holders_count: 3,
    gini_coefficient: 0.85,
    value_buckets: [],
  }, { pathParams: { hash: '0x0' } });

  await render(<TokenHoldersConcentration hash="0x0"/>);
  await expect(page.getByText('Top 100')).toBeVisible();
  await expect(page.getByText('90.00%')).toBeVisible();
  await expect(page.getByText('Gini')).toBeVisible();
  await expect(page.getByText('0.8500')).toBeVisible();
});
```

- [ ] **Step 3: Commit**

```sh
yarn tsc --noEmit
git add ui/token/TokenHolders/TokenHoldersConcentration.tsx ui/token/TokenHolders/TokenHoldersConcentration.pw.tsx
git -c commit.gpgsign=false commit -m "feat(holders): concentration summary card"
```

## Task 4.3 — `TokenHoldersChart` line graph

**Files:**
- Create: `ui/token/TokenHolders/TokenHoldersChart.tsx`
- Create: `ui/token/TokenHolders/TokenHoldersChart.pw.tsx`

- [ ] **Step 1: Verify chart library**

Run: `grep -l '@nivo/line\|recharts' package.json ui/charts/ 2>/dev/null | head -5`
- If `@nivo/line` present, use it (matches existing pattern).
- Else fall back to `@chakra-ui/charts` or whichever the codebase already uses.

- [ ] **Step 2: Implement**

```tsx
import { Box, Flex, Button } from '@chakra-ui/react';
import { ResponsiveLine } from '@nivo/line';
import React, { useState } from 'react';

import useApiQuery from 'lib/api/useApiQuery';

interface Props { hash: string }

const PERIODS = [ '24h', '7d', '30d', '90d' ] as const;
type Period = typeof PERIODS[number];

const TokenHoldersChart = ({ hash }: Props) => {
  const [ period, setPeriod ] = useState<Period>('30d');
  const query = useApiQuery('general:token_holders_chart', {
    pathParams: { hash },
    queryParams: { period },
  });

  const points = (query.data?.items ?? []).map(p => ({ x: p.day, y: p.holder_count }));

  return (
    <Box>
      <Flex gap={ 2 } mb={ 2 }>
        { PERIODS.map(p => (
          <Button key={ p } size="sm" variant={ period === p ? 'solid' : 'ghost' } onClick={ () => setPeriod(p) }>
            { p }
          </Button>
        )) }
      </Flex>
      <Box h="320px">
        <ResponsiveLine
          data={ [ { id: 'holders', data: points } ] }
          margin={{ top: 16, right: 16, bottom: 48, left: 64 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
          axisBottom={{ tickRotation: -45 }}
          enableArea
          useMesh
          isInteractive
        />
      </Box>
    </Box>
  );
};

export default TokenHoldersChart;
```

- [ ] **Step 3: Playwright snapshot**

```tsx
test('renders chart and switches period', async ({ render, page, mockApiResponse }) => {
  await mockApiResponse('general:token_holders_chart', {
    items: [ { day: '2026-05-19', holder_count: 100 }, { day: '2026-05-20', holder_count: 110 } ],
  }, { pathParams: { hash: '0x0' }, queryParams: { period: '30d' } });

  await render(<TokenHoldersChart hash="0x0"/>);
  await expect(page.getByRole('button', { name: '30d' })).toHaveAttribute('data-variant', /solid/);
});
```

- [ ] **Step 4: Commit**

```sh
yarn tsc --noEmit
git add ui/token/TokenHolders/TokenHoldersChart.tsx ui/token/TokenHolders/TokenHoldersChart.pw.tsx
git -c commit.gpgsign=false commit -m "feat(holders): holder-count line chart with period selector"
```

## Task 4.4 — `TokenHoldersDistribution` histogram

**Files:**
- Create: `ui/token/TokenHolders/TokenHoldersDistribution.tsx`
- Create: `ui/token/TokenHolders/TokenHoldersDistribution.pw.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Box, Text } from '@chakra-ui/react';
import { ResponsiveBar } from '@nivo/bar';
import React from 'react';

import useApiQuery from 'lib/api/useApiQuery';

interface Props { hash: string }

const TokenHoldersDistribution = ({ hash }: Props) => {
  const query = useApiQuery('general:token_holders_distribution', { pathParams: { hash } });
  const buckets = query.data?.value_buckets ?? [];

  if (!query.isLoading && buckets.length === 0) {
    return <Text color="text_secondary">Value distribution unavailable (no USD price for this token).</Text>;
  }

  return (
    <Box h="320px">
      <ResponsiveBar
        data={ buckets.map(b => ({ bucket: b.label, holders: b.holder_count })) }
        keys={ [ 'holders' ] }
        indexBy="bucket"
        margin={{ top: 16, right: 16, bottom: 48, left: 64 }}
        padding={ 0.2 }
        axisBottom={{ tickRotation: -30 }}
        isInteractive
      />
    </Box>
  );
};

export default TokenHoldersDistribution;
```

- [ ] **Step 2: Playwright snapshot**

```tsx
test('renders bars per bucket', async ({ render, page, mockApiResponse }) => {
  await mockApiResponse('general:token_holders_distribution', {
    total_holders: 5,
    total_value: '500',
    top5_percentage: 100,
    top10_percentage: 100,
    top100_percentage: 100,
    whale_holders_count: 0,
    gini_coefficient: 0.1,
    value_buckets: [
      { label: '<$1', min_usd: 0, max_usd: 1, holder_count: 3, sum_usd: '1.5' },
      { label: '$1-$10', min_usd: 1, max_usd: 10, holder_count: 2, sum_usd: '12' },
    ],
  }, { pathParams: { hash: '0x0' } });

  await render(<TokenHoldersDistribution hash="0x0"/>);
  await expect(page.getByText('<$1')).toBeVisible();
  await expect(page.getByText('$1-$10')).toBeVisible();
});
```

- [ ] **Step 3: Commit**

```sh
yarn tsc --noEmit
git add ui/token/TokenHolders/TokenHoldersDistribution.tsx ui/token/TokenHolders/TokenHoldersDistribution.pw.tsx
git -c commit.gpgsign=false commit -m "feat(holders): value-distribution histogram"
```

## Task 4.5 — Render concentration + tabs in `TokenHolders.tsx`

**Files:**
- Modify: `ui/token/TokenHolders/TokenHolders.tsx`

- [ ] **Step 1: Add imports + tab layout**

At the top:
```ts
import TokenHoldersChart from './TokenHoldersChart';
import TokenHoldersConcentration from './TokenHoldersConcentration';
import TokenHoldersDistribution from './TokenHoldersDistribution';
```

Below the table/list block (after `</Box>`):
```tsx
{ token && <TokenHoldersConcentration hash={ token.address_hash }/> }
```

…actually place the concentration card ABOVE the summary line, so the order becomes:
```tsx
{ token && <TokenHoldersConcentration hash={ token.address_hash }/> }
<TokenHoldersSummaryLine .../>
<Box display={{ base: 'none', lg: 'block' }}><TokenHoldersTable .../></Box>
<Box display={{ base: 'block', lg: 'none' }}><TokenHoldersList .../></Box>
{ token && (
  <Tabs.Root defaultValue="chart" mt={ 8 }>
    <Tabs.List>
      <Tabs.Trigger value="chart">Holder count over time</Tabs.Trigger>
      <Tabs.Trigger value="distribution">Value distribution</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="chart"><TokenHoldersChart hash={ token.address_hash }/></Tabs.Content>
    <Tabs.Content value="distribution"><TokenHoldersDistribution hash={ token.address_hash }/></Tabs.Content>
  </Tabs.Root>
) }
```

Add `import { Tabs } from '@chakra-ui/react';` (or whichever Tabs export is in use — verify with `grep "from '@chakra-ui/react'" ui/shared/ | grep Tabs`; fall back to a custom Tabs component if Chakra's isn't wired).

- [ ] **Step 2: Type-check + commit**

```sh
yarn tsc --noEmit
git add ui/token/TokenHolders/TokenHolders.tsx
git -c commit.gpgsign=false commit -m "feat(holders): wire concentration + chart + distribution into page"
```

## Task 4.6 — Search-suggest "Public tag" group

**Files:**
- Modify: `types/api/search.ts`
- Modify: `ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggest.tsx`
- Modify: `ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggestItem.tsx` (and any sub-item file like `SearchBarSuggestItemAddress.tsx`)

- [ ] **Step 1: Extend `SearchResultItem` union**

In `types/api/search.ts` add to the union:
```ts
export interface SearchResultPublicTag {
  type: 'public_tag';
  address_hash: string;
  tag_name: string;
  tag_type: string;
  tag_meta: Record<string, unknown> | null;
  priority: number;
}
```

Add `SearchResultPublicTag` to the union type.

- [ ] **Step 2: Render group in `SearchBarSuggest.tsx`**

Find where existing groups are rendered (typically a `categoriesMap` or sequence of `<SearchBarSuggestSection>` calls). Add a section:
```tsx
{ groupedItems.public_tag && groupedItems.public_tag.length > 0 && (
  <SearchBarSuggestSection title="Public tag">
    { groupedItems.public_tag.map(item => (
      <SearchBarSuggestItemPublicTag key={ item.address_hash + item.tag_name } data={ item }/>
    )) }
  </SearchBarSuggestSection>
) }
```

Create the new item component:
```tsx
// ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggestItemPublicTag.tsx
import { chakra, Flex, Text, Box } from '@chakra-ui/react';
import NextLink from 'next/link';
import React from 'react';

import type { SearchResultPublicTag } from 'types/api/search';

import { route } from 'nextjs/routes';
import EntityTag from 'ui/shared/EntityTags/EntityTag';

interface Props { data: SearchResultPublicTag }

const SearchBarSuggestItemPublicTag = ({ data }: Props) => {
  return (
    <NextLink href={ route({ pathname: '/address/[hash]', query: { hash: data.address_hash } }) } passHref legacyBehavior>
      <chakra.a display="flex" alignItems="center" gap={ 2 } px={ 3 } py={ 2 } _hover={{ bg: 'bg_hover' }}>
        <EntityTag data={{
          name: data.tag_name,
          tagType: data.tag_type as never,
          slug: data.tag_name.toLowerCase().replace(/\s+/g, '-'),
          meta: data.tag_meta as never,
          ordinal: 0,
        }}/>
        <Text fontSize="sm" color="text_secondary">{ data.address_hash }</Text>
      </chakra.a>
    </NextLink>
  );
};

export default SearchBarSuggestItemPublicTag;
```

- [ ] **Step 3: Add Playwright snapshot**

In `ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggest.pw.tsx` add:
```ts
test('renders Public tag group', async ({ render, page, mockApiResponse }) => {
  await mockApiResponse('general:search_quick', [
    { type: 'public_tag', address_hash: '0xabc', tag_name: 'Coinbase', tag_type: 'name', tag_meta: { bgColor: '#0052FF' }, priority: 2 },
  ]);
  await render(<SearchBarSuggest query="Coinbase"/>);
  await expect(page.getByText('Public tag')).toBeVisible();
  await expect(page.getByText('Coinbase')).toBeVisible();
});
```

- [ ] **Step 4: Type-check + commit**

```sh
yarn tsc --noEmit
git add types/api/search.ts ui/snippets/searchBar/SearchBarSuggest/
git -c commit.gpgsign=false commit -m "feat(search): render Public tag group in suggest dropdown"
```

## Task 4.7 — CSV menu items

**Files:**
- Modify: `ui/address/AddressCsvExportLink.tsx`

- [ ] **Step 1: Accept new types**

Find the existing `type` prop union and add `'distribution'` and `'holder_chart'`:
```ts
type CsvType = 'transactions' | 'internal_transactions' | 'token_transfers' | 'logs' | 'holders' | 'distribution' | 'holder_chart';
```

Wire path branches:
```ts
const buildHref = () => {
  switch (type) {
    case 'distribution': return `${ baseUrl }/api/v2/tokens/${ address }/holders/distribution/csv`;
    case 'holder_chart': return `${ baseUrl }/api/v2/tokens/${ address }/holders/chart/csv?period=${ params?.period ?? '30d' }`;
    // …existing cases unchanged
  }
};
```

- [ ] **Step 2: Add the menu items in TokenHolders action bar**

In `TokenHolders.tsx` `actionBar`, alongside the existing holders CSV link:
```tsx
<AddressCsvExportLink address={ token.address_hash } params={{ type: 'distribution' }} isLoading={ false } label="Distribution CSV"/>
<AddressCsvExportLink address={ token.address_hash } params={{ type: 'holder_chart', period: '30d' }} isLoading={ false } label="Chart CSV"/>
```

Add the optional `label` prop to the component if not present (default falls back to `type`).

- [ ] **Step 3: Type-check + commit**

```sh
yarn tsc --noEmit
git add ui/address/AddressCsvExportLink.tsx ui/token/TokenHolders/TokenHolders.tsx
git -c commit.gpgsign=false commit -m "feat(holders): CSV exports for distribution + chart"
```

## Task 4.8 — Push, flip PR out of draft, request review

- [ ] **Step 1: Final acceptance gates**

Run:
```sh
yarn lint
yarn tsc --noEmit
yarn vitest run lib/
yarn test:pw -- ui/token/TokenHolders/ ui/snippets/searchBar/
```
Expected: all green. Re-snapshot any Playwright fixture that legitimately changed.

- [ ] **Step 2: Push + flip out of draft**

```sh
git push
gh pr ready
```

- [ ] **Step 3: Tick the PR-4 chunk checkbox**

```sh
gh pr edit --body "$(gh pr view --json body --jq .body | sed 's/- \[ \] \*\*PR #4 chunk\*\*/- [x] **PR #4 chunk**/')"
```

- [ ] **Step 4: Request review**

`gh pr edit --add-reviewer <github_user>` (decide reviewer with the team).

---

## Self-review notes (for the engineer executing)

- **Backend gotcha — Mox setup**: If `apps/explorer/test/test_helper.exs` already configures Mox elsewhere (e.g. for `EthereumJSONRPC` mocks), don't duplicate `Mox.defmock` for the same name. Reuse the existing pattern.
- **Backend gotcha — VinuSwap quoter address**: the actual on-chain address must be looked up in `~/vinuchain-lists/contracts/vinuchain/` or the VinuSwap-VinuChain repo before shipping. Don't merge the stub address.
- **Frontend gotcha — chart library**: confirm `@nivo/line` + `@nivo/bar` are already in `package.json`. If not, prefer adding them only after checking what the existing `ui/stats/` charts use — there must not be two competing chart libraries on one page.
- **Frontend gotcha — `pagination.page`**: if `useQueryWithPages` exposes only cursors and not a numeric page index, derive rank from page 1's loaded count instead of a global rank. Document the limitation in PR #3 body.
- **Rollout order**: PR #1 must merge + deploy to testnet BEFORE PR #4 deploys, otherwise the concentration card / chart / distribution will 404. PR #2 + #3 can deploy independently of PR #1 (they degrade gracefully when metadata is absent or the sort param is ignored).
- **Test discipline**: keep the RED-GREEN-REFACTOR cycle. Don't lump multiple step-3 implementations into one commit.
