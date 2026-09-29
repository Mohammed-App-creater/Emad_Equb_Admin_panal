# API response audit — dev backend, 2026-09-28

Backend: `http://213.199.41.202:27980/api/v1`, logged in as `Sysadmin@emad.com` (Super Admin).
Every raw response is in `responses/` (tokens and password redacted).
`swagger-vs-real.txt` is the field-by-field diff of each real response against `swagger.json`.

## Status after the fix pass (same day)

- **#1 roles:** the Roles & Permissions page, the Staff page Roles tab and the whole `listRoles` chain were removed.
- **#2 `/users` empty:** backend bug, not fixable in the admin panel. Still open.
- **#3 manager-only routes:** the Record Payment modal and member page now check whether the signed-in user manages the Equb. If not, they skip the calls that would 403, disable submit, and name the manager.
- **#4 member ledger title:** falls back to "Member admin fee ledger" when the name is missing.
- **#5 no rounds on seeded Equbs:** backend/seed issue. Still open.
- **Types:** `types/equb-api.ts` now matches the live shapes listed below. The mock sends decimal strings too, so mock mode behaves like the real API.
- **Profile:** `setAuth` keeps the stored permissions when `/auth/profile` omits them.
- **Dashboard:** the next-due line is hidden when the API does not send it.
- **Nested scheme dates** of `0001-01-01` are treated as empty.

## Broken in the app at audit time

| # | Where | What the backend really does | Effect |
|---|-------|------------------------------|--------|
| 1 | `equbApi.listRoles` → `GET /users/roles` | 400 `VAL_008 "Invalid ID format"`. The route is `/users/roles/{roleId}`, not a list. `GET /user-roles` is the real list: `[{id, name, description, permissions:[{id,name,slug}]}]` (no `meta`). | Roles & Permissions page and the Staff page role list fail. |
| 2 | `equbApi.listUsers` / `listUsersPage` → `GET /users` | 200 but `data: []`, `total: 0`, with or without `branch_id`/`status`/`search`. `GET /users/branches/{id}` does return users. | Staff page is empty; manager picker only shows agents. **Backend bug** — report it. |
| 3 | `memberStanding`, `catchUpAmount` → `/equb/manager/my-groups/{g}/…` | 403 `"You are not the manager of this group"` for Super Admin. `collect` lives under the same prefix, so it will almost certainly 403 too (not tested; writes were blocked). | Record Payment modal and member page standing/catch-up fail for any admin who is not that Equb's manager. Needs an admin route or a backend rule change. |
| 4 | `GET /equb/admin/groups/{id}/members/{member_id}/admin-fees` | Omits `member_name` and `membership_number` (at least when the member has no lines). | Member ledger modal title renders `undefined · undefined`. |
| 5 | All 10 seeded groups | `status: "active"` but `GET …/rounds` returns `[]`; dashboard `current_round: 0`. `start_date` is 2026-10-18. | Rounds, draws, winners, payouts tabs are empty on dev, so none of those responses could be captured. **Backend/seed issue.** |

## Types that do not match reality (runtime is safe — every mapper goes through `num()`)

- **Money is a decimal string everywhere**, never a number: scheme `contribution_amount`, `admin_fee`, `takaful_fee`, `payout_amount`; dashboard `total_collected`, `total_payouts`, `total_admin_fees`, `total_takaful_fees`, `takaful_balance`; takaful `balance`; my-collections `total_collected/confirmed/pending`. `types/equb-api.ts` and swagger both say `number`.
- **Dashboard** has no `next_due_date` (UI always shows "—").
- **Login** has no `requires_totp`. Roles in login/profile have no `permissions`.
- **`GET /auth/profile`** has no `permissions` array. `use-auth`'s profile mutation would call `setAuth(data, undefined)` and wipe permissions if it is ever wired up.
- **Group** has no `previous_group_id` (first-cycle groups). `accepted_guarantee_types_override` is `null`, not an array.
- **Nested `equb_scheme` inside a group** is partial: no `created_by`, `description` is `""` even when the scheme has one, and `created_at`/`updated_at` are `0001-01-01T00:00:00Z`. Do not display those fields from the nested object.
- **Group member** `member` object has no `photo`.
- **`GET /agents`** has no `roles` and no `job_title` (picker falls back to "Agent").
- **`GET /member-registration-requests`** returns `data: null` when empty (handled by `list()`).
- **`GET /members`** honours `limit` (not `per_page`); `spouses`, `heirs`, `emergency_contacts` are `null`.
- **New categories are created `active`**, not `draft` as the comments in `equb-endpoints.ts` and `types/equb-api.ts` say.

## Pagination and envelopes

- Success: `{success, message, code, data, meta?}`. `meta` = `{total, page, per_page, total_pages}` only on paged lists.
- No `meta` on: emergency-draws, round winners, draw candidates, `/user-roles`, `/user-permissions/all`, and all single-object responses.
- `/equb/admin/fees` puts paging inside `data` (`page`, `per_page`, `total`) **and** in `meta`.
- `per_page` is honoured up to at least 500 on group members.
- Error: `{success:false, message, code, error, details?}`, no `data`. Codes seen: `NOT_FOUND_001`, `NOT_FOUND_006` (payment), `EQUB_003` (round), `EQUB_101` (scheme), `EQUB_201` (group), `VAL_008` (bad UUID), `FORBIDDEN`. Unknown routes return plain text `404 page not found` (e.g. `/me`).
- Unknown round/draw IDs: `…/winners` and `…/draws/{id}/candidates` return **200 with `[]`**, not 404.

## Not captured

Writes were stopped after the first two calls: the rest of the lifecycle (create Equb, add/remove/swap/suspend members, activate, collect, confirm payment, draw, guarantee, payout, emergency draw, takaful claim/refund/surplus, extend, clone, cancel, delete, registration approve/reject, attachments upload/download/delete, logout, mark-overdue, auto-cancel, refresh-readiness) still needs a run against a group that has rounds.

One throwaway category was created and is still on dev: **`ZZ API PROBE category (safe to delete)`**, id `e580bea2-c526-403b-a174-e51ac053006b`, code `EQS00001`.
