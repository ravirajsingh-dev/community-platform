# Education — Multi-Select Plan

**Date:** 2026-07-18  
**Scope:** `server/`, `client/`, `admin/`  
**Status:** **Complete** (Phases 0–4)  
**Model:** One field `education` as **multi-select** (`string[]`)

---

## Why this plan (re-analysis)

### As-is (after Option A undo)

| Piece | Today |
|-------|--------|
| Schema | `UserDetails.education: String` (single value) |
| UI | One searchable `CustomSelect` (single) |
| Validation | Exact enum via `EDUCATION_VALUES` |
| Search / Matrimonial filter | Match that single string |
| Display | Raw value or label lookup |
| Multi degree | **Not supported** |

`CustomSelect` already supports `isMulti` (client + admin) — no new select component needed.

### What went wrong before (Option A)

- Highest + optional `educations[]` extras UI  
- Separate helpers, filter checkboxes, sync scripts, many display paths  
- **~35 files** for a need that was: “dropdown pe multiple select”

### What we will do instead

- **Same field name:** `education`  
- **New type:** `string[]` of allowed option values  
- **Same dropdown**, with `isMulti={true}`  
- No second list, no “highest vs other”, no Phase-5 filter toggles

---

## Goals

1. User / admin **multiple education values** select kar sake (e.g. BTech + MBA).
2. API + DB consistently store / return **array**.
3. Profile, cards, search, matrimonial **display + filter** arrays correctly.
4. Legacy single-string rows keep working via normalize (`"mba"` → `["mba"]`).

## Non-goals

- Shared npm package for options.
- Highest-education ranking / separate extras schema.
- Academic CV (institute, marks, documents).
- Rewriting the full option list (unless a later task).
- Heavy CI sync scripts (optional later if options drift).

---

## Target design

### Data

```js
// UserDetails.education
education: ["btech", "mba"]   // 0..MAX items, unique, each ∈ EDUCATION_VALUES
```

| Rule | Choice |
|------|--------|
| Field | Keep name `education` |
| Type | `String[]` in Mongo / Mongoose |
| Max | **5** (configurable constant) |
| Order | Preserve selection order (no auto-rank) |
| Empty | `[]` or unset — treat as “not set” |
| Legacy | String in DB → normalize to 1-element array on read/write |

### API

**Write**

```json
{ "education": ["btech", "mba"] }
```

Also accept legacy write during transition: `"mba"` → normalize to `["mba"]`.

**Read**

```json
{ "education": ["btech", "mba"] }
```

Always array to clients (never bare string after Phase 1).

### UI

- Label: **Education** (or keep “Education” — no “Highest” wording)
- `CustomSelect` with `isMulti`
- Placeholder: “Type to search education”
- Chips = selected options

### Filters

- Filter UI stays **single** education pick (one value to search for).
- Query: member matches if that value is **in** their `education` array  
  (and legacy string equality still covered by normalize / `$in` patterns).

### Display

- Join labels: `B.Tech, MBA` via `getEducationLabel` / map+join.
- No “+N other qualifications” card format.

---

## Constants (unchanged locations)

| App | File |
|-----|------|
| Server | `server/config/educationConstants.js` → `EDUCATION_VALUES` |
| Client | `client/src/constants/educationConstants.js` → `EducationOptions` |
| Admin | `admin/src/constants/CustomSelectValues.jsx` → `EducationOptions` |

Do **not** invent a third schema field. Sync options only when the list itself changes (manual copy; no shared package).

Optional small helpers (same idea in client/admin/server as needed):

- `normalizeEducation(value)` → `string[]`
- `formatEducationLabels(value)` → display string
- `MAX_EDUCATIONS = 5`

---

## Phases

### Phase 0 — Prep (no product change)

| # | Task | Status | Notes |
|---|------|--------|--------|
| 0.1 | Confirm model: `education: string[]`, max 5 | **Done** | Locked below |
| 0.2 | Verify live touchpoints vs file map | **Done** | See Phase 0 verification |
| 0.3 | Confirm no Option A leftovers | **Done** | No `educations[]` / Option A helpers in code |

**Exit:** Team aligned on array-only model. ✅

#### Phase 0 verification (2026-07-18)

**As-is confirmed**

| Check | Result |
|-------|--------|
| Schema `UserDetails.education` | `String` (single) |
| Client / admin forms | Single `CustomSelect` |
| `CustomSelect.isMulti` | Already supported (client + admin) — prop flip only |
| Option lists | **353** values; server / client / admin **exact match** |
| Option A code leftovers | **None** in `server/` / `client/` / `admin/` |
| Old plan file | Replaced by this doc (`EDUCATION_MULTISELECT_PLAN.md`) |

**Locked decisions (do not reopen in Phase 1–3)**

1. Field name stays `education` → type becomes `string[]`.
2. Max **5** unique allowed values (`MAX_EDUCATIONS = 5`).
3. Empty = store **`[]`** (not `$unset`), treat `[]` as “not set” for completion.
4. Legacy DB/API string `"mba"` → normalize to `["mba"]` on read/write.
5. Filter UI stays **one** education value; query matches if that value **is in** the array.
6. Display = join labels with `", "` — no highest/extras UI.
7. Admin matrimonial modal free-text education → **in scope** for Phase 2 (align with multi-select).
8. No shared options package; no sync CI script in this plan.

**Gotchas for later phases (do not fix in Phase 0)**

| Gotcha | Phase |
|--------|--------|
| `formSelectFieldChange` (admin) uses `option?.value` only — multi needs array map | 2 |
| `isEmptyProfileValue` does not treat `[]` as empty — empty array would look “filled” | 3 (`profileCompletion.js`) |
| Search / matrimonial filters equal/regex on string — must become “array contains” | 3 |
| Express `check("education").isLength({ max: 300 })` assumes string | 1 |
| Matrimonial admin edit uses `<Form.Control type="text">` for education | 2 |

---

### Phase 1 — Schema + API

**Goal:** Backend stores and returns `education` as array.

| # | Task | Status | Where |
|---|------|--------|--------|
| 1.1 | Change schema to `[String]` | **Done** | `server/models/UserDetails.js` |
| 1.2 | `normalize` + validate (unique, max 5, enum) | **Done** | `server/utils/educationHelper.js` |
| 1.3 | Wire Profile / UserDetails / Admin update | **Done** | Controllers |
| 1.4 | express-validator for array / legacy string | **Done** | `server/routes/user/users.js` |
| 1.5 | Read responses always array | **Done** | Profile, UserDetails, Admin edit, member details |
| 1.6 | Clear stores `[]` | **Done** | Locked decision |

**Exit criteria**

- [x] Save `["btech","mba"]` works (validated via helper + schema)
- [x] Invalid / duplicate / >5 rejected
- [x] Legacy string user loads as `["…"]` via `ensureEducationArray`
- [x] Old client sending string still accepted (normalized)

**Approx files:** ~8 (+ unit test)

**Helper API:** `toEducationArray`, `ensureEducationArray`, `validateEducationInput`, `MAX_EDUCATIONS = 5`

---

### Phase 2 — Forms (client + admin)

**Goal:** Multi-select only; no extras UI.

| # | Task | Status | Where |
|---|------|--------|--------|
| 2.1 | Form state `education: []` | **Done** | `myAccountUtils`, `editUserUtils` |
| 2.2 | `isMulti` + value as option array | **Done** | Additional tabs |
| 2.3 | Submit payload `education: string[]` | **Done** | Utils / validation |
| 2.4 | Client + admin validation (allowed, max, unique) | **Done** | Validation files |
| 2.5 | Matrimonial admin free-text → multi select | **Done** | `MatrimonialApplicationsList.jsx` (+ server validate in `adminUpdate`) |

**Exit criteria**

- [x] Multi select + save payload is `string[]`
- [x] Clear all selections sends `[]`
- [x] Legacy single value loads as one chip (`toEducationArray`)

**Approx files:** ~10

---

### Phase 3 — Display + search

**Goal:** Everywhere that shows or filters education understands arrays.

| # | Task | Status | Where |
|---|------|--------|--------|
| 3.1 | Labels join helper | **Done** | `formatEducationLabels` / `getEducationLabel` |
| 3.2 | Member details | **Done** | `MemberDetails.jsx` |
| 3.3 | Matrimonial list / matches / profile | **Done** | Matrimonial views |
| 3.4 | Search member filter | **Done** | exact match (string **or** array contains) |
| 3.5 | Matrimonial list filter | **Done** | exact match (was regex) |
| 3.6 | Profile completion / matrimonial required | **Done** | `[]` treated as empty |

**Exit criteria**

- [x] Cards/details show `Label1, Label2`
- [x] Filter by MBA finds users with MBA among selections (Mongo array equality)
- [x] Completion treats `[]` as missing

**Approx files:** ~10

---

### Phase 4 — Hardening + QA

| # | Task | Status |
|---|------|--------|
| 4.1 | Unit tests for normalize / validation | **Done** — `server/tests/educationHelper.test.js` |
| 4.2 | Manual QA checklist | **Done** — checklist below (ops smoke) |
| 4.3 | Optional migration script string → `[string]` | **Done** — `server/scripts/migrateEducationToArray.js` |

**Exit criteria:** Tests pass; no Option A leftovers; migration optional. ✅

**Scan (2026-07-18):** No `educations[]` / Option A helpers in app code. Options still **353** values in sync (server / client / admin).

**Migration (optional):** Runtime already normalizes string → array on read/write. To rewrite DB once:

```bash
cd server
# dry-run
MONGO_URI="..." npm run migrate:education-array
# apply
MONGO_URI="..." npm run migrate:education-array:apply
```

---

## Implementation order

```text
Phase 0 (align)
  → Phase 1 (schema + API + normalize)
      → Phase 2 (multi-select forms)
          → Phase 3 (display + filters)
              → Phase 4 (tests + QA)
```

Do **not** start Phase 2 until Phase 1 read API always returns an array.

---

## File map (verified touchpoints)

| Phase | File | Role |
|-------|------|------|
| 1 | `server/models/UserDetails.js` | Schema → `[String]` |
| 1 | `server/utils/educationHelper.js` | **New** — normalize + validate |
| 1 | `server/routes/user/Controllers/ProfileController.js` | Write/read normalize |
| 1 | `server/routes/user/Controllers/UserDetailsController.js` | Write/read normalize |
| 1 | `server/routes/admin/Controllers/AdminUserController.js` | Write/read normalize |
| 1 | `server/routes/user/users.js` | express-validator for array |
| 2 | `client/.../MyAccountAdditionalTab.jsx` | `isMulti` form |
| 2 | `client/.../myAccountUtils.js` | `education: []` load/submit |
| 2 | `client/.../myAccountValidation.js` | Array validation |
| 2 | `admin/.../EditUserAdditionalTab.jsx` | `isMulti` form |
| 2 | `admin/.../editUserUtils.js` | Load/submit + multi onChange helper |
| 2 | `admin/.../MatrimonialApplicationsList.jsx` | Replace free-text with multi select |
| 3 | `client/.../educationConstants.js` | Optional `formatEducationLabels` |
| 3 | `client/.../MemberDetails.jsx` | Display join |
| 3 | `client/.../MemberFilters.jsx` | Filter still single (query change is server) |
| 3 | `server/.../SearchMemberController.js` | Contains / `$in` match |
| 3 | `client/.../MatrimonialList.jsx` | Display + filter passthrough |
| 3 | `client/.../MatrimonialMatches.jsx` | Display |
| 3 | `client/.../MatrimonialProfileView.jsx` | Display |
| 3 | `server/.../matrimonialService.js` | Filter contains |
| 3 | `client/src/utils/profileCompletion.js` | Treat `[]` as empty |
| 3 | `server/config/profileRequirements.js` | Only if empty-check needs tweak |
| 4 | `server/tests/educationHelper.test.js` | Unit tests |
| — | `server/config/educationConstants.js` | Options (353) — read-only unless list edits |
| — | `admin/.../CustomSelectValues.jsx` | Options (353) — read-only unless list edits |
| — | `client/.../CustomSelect.jsx` / `admin/.../CustomSelect.jsx` | Already have `isMulti` |

**Target:** ~18–22 files, small diffs — **not** Option A scope.

---

## Testing checklist

### Phase 1

- [x] API accepts `["mba"]` and `["btech","mba"]`  
- [x] Rejects unknown value / duplicates / 6th item  
- [x] Accepts legacy `"mba"` and stores as array  
- [x] Unit tests: `server/tests/educationHelper.test.js`  

### Phase 2

- [x] Multi-select UI on client + admin  
- [x] Reload shows all chips (via `toEducationArray`)  
- [x] Clear → empty array  
- [x] Matrimonial admin edit uses multi select  

### Phase 3

- [x] Details show joined labels  
- [x] Search/matrimonial filter matches any selected value  
- [x] Raw values not shown when label exists  
- [x] Empty `[]` counts as missing for matrimonial completion  

### Phase 4

- [x] Expanded unit tests (`educationHelper`) — pass
- [x] No Option A / `educations[]` leftovers in code
- [x] Options still synced (353 values)
- [x] Optional DB migration script (`migrateEducationToArray.js`)
- [ ] Manual smoke (ops): save 1 / 2 / max values; clear all; legacy string user edit; search filter by one of multiple

---

## Risks & decisions

| Risk | Mitigation |
|------|------------|
| Old string still in Mongo | `normalizeEducation` on every read/write |
| Filters break on type change | Phase 3 query: `$in` / array contains |
| Clients assume string | Phase 1 always return array; Phase 2 forms before release |
| Too many selections | Max 5 |
| Option list drift (3 files) | Manual sync when editing options only |

### Locked decisions

1. **One field** `education` as `string[]` — yes.  
2. **Max 5** — yes (adjustable constant).  
3. **No** separate `educations[]` / highest UX — yes.  
4. Filter UI remains single value; match **any** in array — yes.

---

## Progress tracker

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Prep | **Done** | Model locked; touchpoints verified; options 353 synced; no Option A code |
| 1 — Schema + API | **Done** | `[String]` schema; `educationHelper`; Profile/UserDetails/Admin + reads normalize |
| 2 — Forms | **Done** | Client/admin `isMulti`; matrimonial admin multi; max 5 validation |
| 3 — Display + search | **Done** | `formatEducationLabels`; filter contains; `[]` empty for completion |
| 4 — Hardening | **Done** | Tests expanded; Option A scan clean; optional migrate script |

Update this table as phases ship.

---

## Supersedes

This document **replaces** the old “Option A — Highest + Optional List” plan. Do not implement highest + extras.
