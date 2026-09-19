# Community Hierarchy — Sub-Khamp + Gotra Structure Update

**Date:** 2026-08-09  
**Scope:** `server/`, `admin/`, `client/` (Community Management)  
**Status:** Phase 0–5 complete  
**Product decision (confirmed):** Current **Gotra** data is actually **Sub-Khamp** data  
**Correction (2026-08-09):** Real **Gotra** depends on **Kul**, not Khamp/Sub-Khamp — same Kul shares Gotra across all its Khamp/Sub-Khamp branches.

---

## Correction — Gotra parents Kul (not Sub-Khamp)

Product rule (Rajput hierarchy):

> गोत्र कुल (Clan) पर निर्भर करता है, खांप (Sub-clan) पर नहीं।

UI / data shape after correction:

```text
Community → Vansh → Kul → Gotra          ← Gotra from Kul
                     ↘ Khamp → Sub-Khamp ← branch under Kul
```

- Master-data / admin Gotra CRUD: parent = `kulId`
- Changing Khamp/Sub-Khamp does **not** clear Gotra
- Deleting Khamp/Sub-Khamp does **not** delete Gotra; Kul cascade deletes Gotras

---

## Phase 0 — Frozen decisions + inventory (COMPLETE)

**Completed:** 2026-08-09  
**Inventory script:** `server/scripts/inventoryHierarchyPhase0.js`  
**Re-run:** `cd server && MONGO_URI="..." npm run inventory:hierarchy-phase0`

### 0.1 Frozen decisions (sign-off)

| Decision | Frozen choice | Notes |
|---|---|---|
| Entity key | **`subKhamp`** | Not `sub-khamp` / `sub_khamp` — matches `vansh`/`kul`/`khamp` camelCase |
| UI label | **Sub-Khamp** | Admin nav, forms, client selects |
| Collection strategy | **Rename `gotras` → `subkhamps`**, then create **new empty `gotras`** | Prefer **same `_id`s** for migrated docs |
| New Gotra parent | **`subKhampId`** | Plus ancestor ids community/vansh/kul/khamp |
| UserDetails remap | `gotra` → **`subKhamp`**; new `gotra` starts unset | Same ObjectId values |
| Gotra required (Phases 1–4) | **Optional** | Avoid mass profile-incomplete on cutover |
| Gotra required (Phase 5) | **Required** after real Gotra data exists | Flip via `profileRequirements` |
| Permission bootstrap | **Yes** — grant `subKhamp` to roles that have `gotra` | During admin permission migration |
| Inline user-create default | Keep **`subKhamp` + `gotra`** in creatable-level allow-list | Patch stored `CommonSettings.userCreatableLevels` |
| Empty Gotra display | Show Sub-Khamp value; Gotra as **“Not set”** / em dash | Until Phase 5 |
| Hindi copy | Defer to UI pass | Labels can stay English in v1 |

**Phase 0 exit criteria**

- [x] Naming + Gotra optional/required policy written and frozen  
- [x] Collection strategy frozen  
- [x] Snapshot counts for local + prod  
- [x] Backup / dump plan documented (below)

### 0.2 Inventory snapshot (2026-08-09)

#### `rsf-local`

| Collection | Total | Active | Pending | Rejected | Deleted |
|---|---:|---:|---:|---:|---:|
| communities | 2 | 2 | 0 | 0 | 0 |
| vanshes | 5 | 5 | 0 | 0 | 0 |
| kuls | 3 | 3 | 0 | 0 | 0 |
| khamps | 2 | 2 | 0 | 0 | 0 |
| gotras *(→ Sub-Khamp)* | 2 | 2 | 0 | 0 | 0 |

| UserDetails | Count |
|---|---:|
| Total | 7 |
| With `gotra` | 5 |
| Missing `gotra` | 2 |
| Orphan / deleted gotra ref | 0 |
| Gotras with missing khamp parent | 0 |
| `subkhamps` collection exists | **No** |

Current “Gotra” rows (will become Sub-Khamp):

| Name | Khamp | UserDetails refs |
|---|---|---:|
| UGRASAIN JI | SHEKHAWAT | 3 |
| B4 | B3 | 2 |

`common_settings.userCreatableLevels` sample: `["khamp","gotra","kul","vansh"]` — migration must insert `subKhamp` and keep `gotra` for the new leaf.

#### `rsf-prod`

| Collection | Total | Active | Pending | Rejected | Deleted |
|---|---:|---:|---:|---:|---:|
| communities | 1 | 1 | 0 | 0 | 0 |
| vanshes | 4 | 4 | 0 | 0 | 0 |
| kuls | 28 | 28 | 0 | 0 | 0 |
| khamps | 14 | 14 | 0 | 0 | 0 |
| gotras *(→ Sub-Khamp)* | 4 | 4 | 0 | 0 | 0 |

| UserDetails | Count |
|---|---:|
| Total | 4 |
| With `gotra` | 4 |
| Missing `gotra` | 0 |
| Orphan / deleted gotra ref | 0 |
| Gotras with missing khamp parent | 0 |
| `subkhamps` collection exists | **No** |

Current “Gotra” rows (will become Sub-Khamp):

| Name | Khamp | UserDetails refs |
|---|---|---:|
| UGRASAIN JI | SHEKHAWAT | 1 |
| SOBRAMPOTA | RAJAWAT | 1 |
| GIRDHAR JI | SHEKHAWAT | 1 |
| RATNAWAT JI | SHEKHAWAT | 1 |

`common_settings.userCreatableLevels` sample: `["kul","khamp","gotra"]`.

**Inventory notes**

- Volume is small (prod: 4 gotra docs, 4 user_details) → migration risk is low; still follow backup + dry-run.  
- Zero pending gotras / zero orphan refs on both DBs at snapshot time.  
- Re-run inventory immediately before Phase 2 apply.

### 0.3 Backup / dump plan (before Phase 2)

**When:** Immediately before Phase 2 migration on each environment.

**What to dump (minimum)**

```bash
# From a machine with mongodump + MONGO_URI for the target env
mongodump --uri="$MONGO_URI" \
  --collection=gotras \
  --out="./backups/hierarchy-pre-subkhamp-$(date +%Y%m%d-%H%M%S)"

mongodump --uri="$MONGO_URI" \
  --collection=user_details \
  --out="./backups/hierarchy-pre-subkhamp-$(date +%Y%m%d-%H%M%S)"

mongodump --uri="$MONGO_URI" \
  --collection=common_settings \
  --out="./backups/hierarchy-pre-subkhamp-$(date +%Y%m%d-%H%M%S)"
```

Optional full DB dump for prod:

```bash
mongodump --uri="$MONGO_URI" \
  --out="./backups/rsf-prod-full-pre-subkhamp-$(date +%Y%m%d-%H%M%S)"
```

**Verify dump**

- Confirm `gotras.bson` / `user_details.bson` sizes > 0  
- Keep dump outside the git repo (e.g. `../backups/` or secure storage)  
- Do **not** commit dumps or `.env*` secrets

**Rollback sketch (if Phase 2 fails mid-way)**

1. Stop app writes / redeploy previous server build if schema already shipped.  
2. `mongorestore` the three collections from the pre-migration dump.  
3. Drop `subkhamps` if partially created.  
4. Re-run Phase 0 inventory; confirm counts match snapshot.

**Order for Phase 2 apply**

1. Dump → 2. Inventory dry checks → 3. Migration `--dry-run` → 4. Migration `--apply` on **local/staging first** → 5. Prod dump + apply → 6. Inventory verify.

### 0.4 Phase 0 → Phase 1 handoff

Phase 1 may start with frozen names above. Do **not** run collection rename until Phase 2.

Open items deferred to later phases (not blocking Phase 1):

- Exact calendar for Phase 5 “Gotra required”  
- Final Hindi label copy  
- Whether empty Gotra blocks matrimonial create before Phase 5 (default: **no**)

---

## 1. Executive summary

| | Hierarchy |
|---|---|
| **Current (code + DB)** | Community → Vansh → Kul → Khamp → **Gotra** (leaf) |
| **Target (product)** | Community → Vansh → Kul → Khamp → **Sub-Khamp** → **Gotra** |

**Verdict**

1. **Pehle existing Gotra → Sub-Khamp rename/migrate** (data preserve).  
2. **Phir naya empty Gotra level create** under Sub-Khamp.  
3. Do **not** create a fresh empty Sub-Khamp while keeping today’s Gotra as-is — that would keep wrong labels on real data and force a second painful remapping.

**Why:** `gotras` collection + `UserDetails.gotra` already store Sub-Khamp-like values. A label-only UI rename is not enough; parent links, cascade, permissions, and profile fields must move with the data.

---

## 2. Current state (as-is)

### 2.1 Hierarchy shape

```text
Community
  └─ Vansh
       └─ Kul
            └─ Khamp
                 └─ Gotra   ← leaf today; product says this IS Sub-Khamp data
```

There is **no** `SubKhamp` / `subKhamp` / `sub-khamp` model, route, permission, or UI field anywhere in the repo today.

### 2.2 Models (server)

| Level | Model | Collection | Parent field(s) | Unique scope |
|---|---|---|---|---|
| Community | `server/models/Community.js` | `communities` | — | `name` |
| Vansh | `server/models/Vansh.js` | `vanshes` | `communityId` | `(communityId, name)` |
| Kul | `server/models/Kul.js` | `kuls` | `communityId`, `vanshId` | `(vanshId, name)` |
| Khamp | `server/models/Khamp.js` | `khamps` | `communityId`, `vanshId`, `kulId` | `(kulId, name)` |
| Gotra | `server/models/Gotra.js` | `gotras` | `communityId`, `vanshId`, `kulId`, **`khampId`** | `(khampId, name)` |

Shared entity fields: `name`, `description`, `status` (`active|pending|rejected`), `createdBy`, `isActive`, `isDeleted`, timestamps.

### 2.3 User profile refs

`UserDetails` stores required ObjectIds:

```text
community, vansh, kul, khamp, gotra
```

Source: `server/models/UserDetails.js`  
`gotra` currently refs `gotras` — these IDs will become **Sub-Khamp** after migration.

Also touched:

- `User.community` (registration / wallet; partial chain only)
- Matrimonial filters via `UserDetails` hierarchy
- Profile completion + matrimonial requirements (`server/config/profileRequirements.js`) — all five levels required today

### 2.4 Config-driven stack (why change is wide but patterned)

Central configs already drive most CRUD:

| Layer | File | Role |
|---|---|---|
| Admin entity config | `server/config/hierarchyEntityConfig.js` → `HIERARCHY_ENTITIES` | Controllers, parents, approve chain, cascade |
| User master-data | same file → `MASTER_DATA_ENTITIES` | Dropdown list/create |
| Admin UI config | `admin/src/config/hierarchyAdminConfig.js` → `HIERARCHY_ADMIN_ENTITIES` | Routes, Redux, forms |
| Creatable levels | `server/utils/hierarchyCreatableSettings.js` | `["community","vansh","kul","khamp","gotra"]` |
| Pending levels | `server/utils/hierarchyPendingService.js` | Permission-gated pending list |
| Admin status filters | `admin/src/utils/hierarchyStatusUtils.js` | Level dropdown (5 items) |

Gotra is marked **`isLeaf: true`** with **no cascade handlers**. After the change, **Sub-Khamp is no longer leaf**; **new Gotra becomes leaf**.

### 2.5 APIs

**Admin**

| Path | Entity |
|---|---|
| `/api/admin/communities` | Community |
| `/api/admin/vansh` | Vansh |
| `/api/admin/kul` | Kul |
| `/api/admin/khamp` | Khamp |
| `/api/admin/gotra` | Gotra (today = Sub-Khamp data) |
| `/api/admin/hierarchy/pending` | Cross-level pending |
| `/api/admin/settings/hierarchy` | User creatable levels |

**User master-data**

- `GET/POST /api/users/master-data/{communities|vanshes|kuls|khamps|gotras}`
- `GET /api/users/master-data/creatable-levels`

Factory pattern: routes + thin controllers via `createHierarchyController(HIERARCHY_ENTITIES.<key>)`.

### 2.6 Admin UI

Nav under **Community Management** (`admin/src/view/routing/PortalItems.jsx`):

- Hierarchy settings  
- Pending approvals  
- Community / Vansh / Kul / Khamp / Gotra lists + add/edit  

Generic pages under `admin/src/view/admin/components/hierarchy/` build list/form from config.  
User edit community tab: `EditUserCommunityTab.jsx` + cascade hooks.

Permissions modules today: `communities | vansh | kul | khamp | gotra`.

### 2.7 Client UI

| File | Role |
|---|---|
| `client/src/components/CommunityHierarchySelects.jsx` | 5-level selects + inline create |
| `client/src/hooks/useMasterDataCascade.js` | Khamp → fetch Gotras |
| My Account community tab | Profile save / validation |
| Search Member + Matrimonial | Filter + display “Gotra” |

Cascade today: selecting Khamp loads Gotras. After change: Khamp → Sub-Khamps → Gotras.

### 2.8 Approval / cascade behavior (must preserve)

1. User inline-create → `status: pending`, `isActive: false`  
2. Admin approve → auto-approve pending parents up the chain  
3. Hard-delete / inactive / active on ancestor cascades down to current Gotra  
4. Delete cleans `UserDetails` refs via `hierarchyUserDetailsCleanup`

After migration, Khamp cascade must reach **Sub-Khamp then Gotra**; Sub-Khamp cascade must reach Gotra; Gotra remains true leaf.

### 2.9 Seeds / migrations

- No hierarchy seed data  
- No existing Mongo migration scripts for community levels  
- Schema is Mongoose-only → **new one-time migration script is required**

---

## 3. Target state (to-be)

```text
Community
  └─ Vansh
       └─ Kul
            └─ Khamp
                 └─ Sub-Khamp   ← rename of today’s Gotra docs + UserDetails.gotra
                      └─ Gotra  ← NEW empty leaf level
```

### 3.1 Recommended naming

| Concept | `key` | Label | Collection | Parent field | UserDetails field | Permission | Admin API | Master-data API |
|---|---|---|---|---|---|---|---|---|
| Sub-Khamp | `subKhamp` | Sub-Khamp | `subkhamps` | `khampId` (+ ancestors) | `subKhamp` | `subKhamp` | `/api/admin/sub-khamp` | `/api/users/master-data/sub-khamps` |
| Gotra (new) | `gotra` | Gotra | `gotras` (new empty) | **`subKhampId`** (+ ancestors) | `gotra` | `gotra` | `/api/admin/gotra` | `/api/users/master-data/gotras` |

Keep camelCase keys consistent with `vansh`, `kul`, `khamp`.

### 3.2 Target UserDetails

```text
community (required)
vansh (required)
kul (required)
khamp (required)
subKhamp (required)   ← migrated from old gotra
gotra (phase-gated)   ← new; optional in Phase 3, required later
```

---

## 4. Decision: Sub-Khamp create vs Gotra create?

### Question

> Abhi Gotra me jo data hai woh Sub-Khamp ka hai. Kya pehle Sub-Khamp banana chahiye ya Gotra?

### Answer (recommended)

| Step | Action | Why |
|---|---|---|
| **1** | **Migrate/rename current Gotra → Sub-Khamp** | Data already correct for that level; only identity/label/parent role wrong |
| **2** | **Create brand-new Gotra under Sub-Khamp** | Real Gotra list starts empty; admins/users add later |
| **Avoid** | Create empty Sub-Khamp + keep old Gotra | Wrong product meaning stays in DB; every user still points at “gotra” that is not gotra |

### Semantic remapping (critical)

| Today | After migration |
|---|---|
| Document in `gotras` | Document in `subkhamps` (same `_id` preferred) |
| `UserDetails.gotra = <id>` | `UserDetails.subKhamp = <id>`; old `gotra` unset/null |
| UI label “Gotra” on leaf | UI label **“Sub-Khamp”** |
| New leaf | New `gotras` docs parented by `subKhampId` |

**Do not** only change the English/Hindi label of the current Gotra screen to “Sub-Khamp” without remapping `UserDetails` and parent chains — Search/Matrimonial/Profile would still treat Sub-Khamp IDs as Gotra.

---

## 5. Impact map (what must change)

### 5.1 Server

| Area | Work |
|---|---|
| Models | Add `SubKhamp.js`; rewrite `Gotra.js` parent to `subKhampId`; update `UserDetails` |
| Config | Insert `subKhamp` in `HIERARCHY_ENTITIES` + `MASTER_DATA_ENTITIES`; Gotra chain gains Sub-Khamp |
| Cascade | Khamp → SubKhamp → Gotra; SubKhamp → Gotra; Gotra leaf |
| Cleanup | Unset `subKhamp` + `gotra` appropriately |
| Routes/controllers | New Sub-Khamp admin + master-data routes; Gotra parent query changes |
| Creatable settings | Add `subKhamp`; migrate stored `CommonSettings.userCreatableLevels` |
| Pending / permissions | New level + module |
| Profile requirements | Add `subKhamp`; gate `gotra` required flag |
| Search / Profile / Matrimonial controllers | Populate + filter new field |
| Tests | All `hierarchy*.test.js`, creatable settings, master-data tests (currently assume 5 levels / Gotra leaf) |

### 5.2 Admin

| Area | Work |
|---|---|
| `hierarchyAdminConfig.js` | New entity + Gotra parents include Sub-Khamp |
| Reducers / actions | `adminSubKhampReducer` (+ factory actions) |
| Portal + routes | Nav item + `/admin/community-management/sub-khamp` |
| Permissions | Module `subKhamp`; path maps; PermissionEditor |
| Pending filters | Level option Sub-Khamp |
| User edit cascade | Khamp → SubKhamp → Gotra |
| Hierarchy settings UI | Creatable checkbox for Sub-Khamp |

### 5.3 Client

| Area | Work |
|---|---|
| `CommunityHierarchySelects` | 6 fields; Gotra parent = Sub-Khamp |
| Cascade hook / actions | `fetchSubKhamps(khampId)`, `fetchGotras(subKhampId)` |
| My Account constants/validation | Include `subKhamp`; Gotra required policy |
| Search / Matrimonial | Filter + display Sub-Khamp and Gotra |
| Profile completion | Sync with server requirements |

### 5.4 Data migration (must-have)

One-time script (suggested path: `server/scripts/migrateGotraToSubKhamp.js`):

1. Rename/copy collection `gotras` → `subkhamps` (prefer **same `_id`s**).  
2. Ensure indexes: unique `(khampId, name, isDeleted)`.  
3. For each `UserDetails` with `gotra`: set `subKhamp = gotra`, then unset `gotra`.  
4. Create empty new `gotras` collection for real Gotra docs.  
5. Update `CommonSettings.userCreatableLevels`: replace conceptual slot — insert `subKhamp`, keep `gotra` for new level.  
6. Dry-run mode + counts report + rollback notes.

---

## 6. Better end-to-end flow (after change)

### 6.1 Admin create flow

```text
Create Community
  → Create Vansh (community)
    → Create Kul (vansh)
      → Create Khamp (kul)
        → Create Sub-Khamp (khamp)     [migrated old Gotra UI]
          → Create Gotra (sub-khamp)   [new]
```

Approve on any child still auto-approves pending parents up the chain (now including Sub-Khamp when approving Gotra).

### 6.2 User profile / dropdown flow

```text
Select Community
  → Vansh
    → Kul
      → Khamp
        → Sub-Khamp
          → Gotra
```

Inline create (if enabled in Hierarchy Settings) creates **pending** entity at that level; user sees own pending in dropdown; admin approves in Pending Approvals.

### 6.3 Search / Matrimonial filters

Cascade filters reset downward:

- Change Khamp → clear Sub-Khamp + Gotra  
- Change Sub-Khamp → clear Gotra  

Display profiles with both Sub-Khamp and Gotra labels when present.

---

## 7. Phased implementation plan

### Phase 0 — Freeze decisions + inventory ✅ COMPLETE

See **[Phase 0 — Frozen decisions + inventory](#phase-0--frozen-decisions--inventory-complete)** at the top of this doc for sign-off, inventory tables, and backup plan.

---

### Phase 1 — Server schema + config (foundation) ✅ COMPLETE

**Completed:** 2026-08-09  
**Tests:** `cd server && npm test` → 134/134 pass

**Shipped**

1. `server/models/SubKhamp.js` — parent `khampId`, collection `subkhamps`  
2. `server/models/Gotra.js` — parent **`subKhampId`** + ancestors; unique `(subKhampId, name, isDeleted)`  
3. `UserDetails` — `subKhamp` added; `gotra` no longer schema-required  
4. Config wired: `HIERARCHY_ENTITIES`, `MASTER_DATA_ENTITIES`, creatable levels, pending levels, cascade, cleanup, `profileRequirements` (`subKhamp` required; `gotra` optional)  
5. Admin `/api/admin/sub-khamp` + master-data `/api/users/master-data/sub-khamps`; Gotra parent = `subKhampId`  
6. Hierarchy unit tests updated for six levels  

**Deploy note:** Do **not** point live traffic at Phase 1 alone — pair with **Phase 2 migration** so existing `gotras` docs move to `subkhamps` and `UserDetails` remaps. Until then, old gotra rows lack `subKhampId` and new Gotra CRUD expects Sub-Khamp parents.

**Exit criteria**

- [x] APIs can CRUD Sub-Khamp under Khamp and Gotra under Sub-Khamp  
- [x] Unit tests green for hierarchy config/approve/cascade/creatable  

---

### Phase 2 — Data migration ✅ COMPLETE

**Completed:** 2026-08-09  
**Script:** `server/scripts/migrateGotraToSubKhamp.js`  
**Commands:**
```bash
cd server
MONGO_URI="..." npm run migrate:gotra-to-subkhamp          # dry-run
MONGO_URI="..." npm run migrate:gotra-to-subkhamp:apply    # write (+ JSON backup)
```

**Backups (JSON, outside git):**
- `/home/rvhkm/app/backups/rsf-hierarchy/rsf-local-pre-subkhamp-20260809-102502`
- `/home/rvhkm/app/backups/rsf-hierarchy/rsf-prod-pre-subkhamp-20260809-102518`

#### Results — `rsf-local`

| Metric | Before | After |
|---|---:|---:|
| Legacy gotras | 2 | 0 |
| `subkhamps` | 0 | 2 |
| UserDetails with `gotra` | 5 | 0 |
| UserDetails with `subKhamp` | 0 | 5 |
| Orphan refs | 0 | 0 |

Sub-Khamps: `UGRASAIN JI`, `B4`  
Settings creatable: inserted `subKhamp` before `gotra`.

#### Results — `rsf-prod`

| Metric | Before | After |
|---|---:|---:|
| Legacy gotras | 4 | 0 |
| `subkhamps` | 0 | 4 |
| UserDetails with `gotra` | 4 | 0 |
| UserDetails with `subKhamp` | 0 | 4 |
| Orphan refs | 0 | 0 |

Sub-Khamps: `UGRASAIN JI`, `SOBRAMPOTA`, `GIRDHAR JI`, `RATNAWAT JI`  
`gotras` collection empty (ready for real Gotra leaf).  
Settings: `["kul","khamp","subKhamp","gotra"]`.

**Exit criteria**

- [x] Staging/local dry-run OK  
- [x] Prod apply + verification  
- [x] No user still pointing `gotra` at a Sub-Khamp document  

---

### Phase 3 — Admin UI cutover ✅ COMPLETE

**Completed:** 2026-08-09

**Shipped**

1. `adminSubKhampReducer` + `HIERARCHY_ADMIN_ENTITIES.subKhamp`  
2. Nav `/admin/community-management/subKhamp`, permissions module `subKhamp`, legacy `/admin/sub-khamp` redirect  
3. Gotra form/list parents include Sub-Khamp; filters cascade through `subKhampId`  
4. Pending Approvals level option + parent filter for Sub-Khamp  
5. Hierarchy Settings creatable toggle for `subKhamp`  
6. Edit User + User Filters: 6-level cascade; Sub-Khamp required, Gotra optional  
7. `AdminUserController` populate/update for `subKhamp` (+ optional gotra clear)

**Exit criteria**

- [x] Admin can manage all 6 levels (config + routes wired)  
- [x] Approve chain includes Sub-Khamp → Gotra (server Phase 1)  
- [x] Permissions can grant `subKhamp` independently  

---

### Phase 4 — Client UI cutover ✅ COMPLETE

**Completed:** 2026-08-09

**Shipped**

1. Master-data: `subKhamps` by `khampId`; gotras by `subKhampId`; `useMasterDataCascade` 6-level  
2. `CommunityHierarchySelects`: Sub-Khamp + optional Gotra  
3. My Account: Sub-Khamp required, Gotra optional; clear Gotra via `null` + `$unset`  
4. Search Member + Matrimonial: filters (`subKhampId` / `userDetails.subKhamp`) + display labels  
5. Profile completion labels/tabs; Profile / Search / Matrimonial server populate + filters  

**Exit criteria**

- [x] Existing users see old “Gotra” value under **Sub-Khamp** (migrated field)  
- [x] Users can optionally pick/create Gotra when list exists  
- [x] Empty Gotra list under Sub-Khamp is OK (optional until Phase 5)  

---

### Phase 5 — Hardening + make Gotra required ✅ COMPLETE

**Completed:** 2026-08-09

**Shipped**

1. `profileRequirements`: `gotra` required for profile + matrimonial  
2. `UserDetails.gotra` schema `required: true`  
3. Client My Account + `CommunityHierarchySelects`: Gotra required (no clear)  
4. Admin Edit User: Gotra required; reject clear on API  
5. Report script: `npm run report:users-missing-gotra`  
6. Training note below (Old Gotra = Sub-Khamp)

**Ops (manual, before/after deploy)**

1. Admin creates real **Gotra** rows under each **Sub-Khamp** (bulk or one-by-one).  
2. Run `MONGO_URI=... npm run report:users-missing-gotra` on prod — expect high `withSubKhampMissingGotra` until users/admins pick Gotra.  
3. Users complete profile (or admins set Gotra on Edit User).

#### Admin training note

| Old label (pre-migration) | Current meaning |
|---|---|
| **Gotra** (what you managed before) | **Sub-Khamp** |
| *(did not exist)* | **Gotra** — new leaf under Sub-Khamp |

- Hierarchy: Community → Vansh → Kul → Khamp → **Sub-Khamp** → **Gotra**  
- Do **not** rename Sub-Khamp values back to “Gotra”.  
- Create Gotras under the correct Sub-Khamp; users cannot finish profile without Gotra.  
- Pending Approvals: both Sub-Khamp and Gotra levels appear separately.

**Exit criteria**

- [x] Product hierarchy enforced in requirements + validation  
- [x] Missing-Gotra report available for monitoring  
- [ ] Ops: real Gotra master data populated; orphan refs stay 0 (ongoing)

---

## 8. Recommended rollout order (better flow)

```text
Phase 0  Decisions + backup
   ↓
Phase 1  Server models/config/APIs/tests  (feature-flag or deploy dark if needed)
   ↓
Phase 2  DB migration (gotra docs → subkhamps; UserDetails remap)
   ↓
Phase 3  Admin UI (ops can create real Gotras)
   ↓
Phase 4  Client UI (users see Sub-Khamp; Gotra optional)
   ↓
Phase 5  Populate Gotras → make Gotra required
```

**Do not** ship client label changes before Phase 2 — users would still save into the wrong semantic field.

**Do not** make Gotra required in the same release as migration — every completed profile would suddenly look incomplete.

---

## 9. Compatibility & risk matrix

| Risk | Impact | Mitigation |
|---|---|---|
| Profiles break completion after adding required Gotra too early | High | Keep Gotra optional until Phase 5 |
| Old API clients call gotras-by-`khampId` | High | Deploy server+admin+client together; change parent to `subKhampId` |
| Permission gaps for Sub-Khamp | Medium | Default: copy `gotra` edit rights to `subKhamp` for existing roles during migration |
| Cascade deletes miss new level | High | Extend cascade tests before prod |
| Duplicate names after split | Low | Unique still scoped to immediate parent |
| Settings without `subKhamp` in creatable list | Medium | Migration patches `CommonSettings` |
| Search shows blank Gotra | Expected | Until Gotras are created; show “—” |

---

## 10. File touch list (implementation checklist)

### Server (core)

- [x] `server/models/SubKhamp.js` **(new)**  
- [x] `server/models/Gotra.js` (parent → `subKhampId`)  
- [x] `server/models/UserDetails.js`  
- [x] `server/config/hierarchyEntityConfig.js`  
- [x] `server/config/profileRequirements.js`  
- [x] `server/services/hierarchyCascadeService.js`  
- [x] `server/utils/hierarchyCreatableSettings.js`  
- [x] `server/utils/hierarchyPendingService.js`  
- [x] `server/utils/hierarchyUserDetailsCleanup.js`  
- [x] `server/utils/masterDataHelper.js` (via config)  
- [x] Admin routes/controllers for Sub-Khamp **(new)**  
- [x] `server/routes/user/masterDataRoutes.js`  
- [x] Profile / Search / Matrimonial controllers (populate + filters) — Phase 3/4 consumers  
- [x] `server/scripts/migrateGotraToSubKhamp.js` **(new)** — Phase 2  

- [x] `server/tests/hierarchy*.test.js` (+ new cases)

### Admin

- [x] `admin/src/config/hierarchyAdminConfig.js`  
- [x] `admin/src/reducers/adminSubKhampReducer.js` **(new)**  
- [x] PortalItems + AdminRoutes + permissions  
- [x] Hierarchy pending filters / settings  
- [x] Edit-user community cascade  


### Client

- [x] `CommunityHierarchySelects.jsx`  
- [x] `useMasterDataCascade.js` + `masterDataActions.js` + reducer  
- [x] My Account constants / validation / utils  
- [x] Search Member + Matrimonial list/profile  
- [x] `profileCompletion.js`  

---

## 11. Open questions

### Frozen in Phase 0

| # | Question | Decision |
|---|---|---|
| 2 | Inline user create for Gotra | Keep in creatable allow-list (`subKhamp` + `gotra`) |
| 3 | Permission bootstrap | **Yes** — copy `gotra` rights → `subKhamp` |
| 4 | Empty Gotra display | Sub-Khamp shown; Gotra = “Not set” / — |

### Still open (post Phase 5)

1. **Hindi labels** in UI — Sub-Khamp / गोत्र copy review?  
2. **Coverage target** — % of users with Gotra before treating rollout as “done” ops-wise

---

## 12. Success metrics

- 100% of former `UserDetails.gotra` values present as `UserDetails.subKhamp`  
- 0 UserDetails still referencing Sub-Khamp IDs via `gotra`  
- Admin can create Gotra only after Sub-Khamp selected  
- Client cascade: Khamp → Sub-Khamp → Gotra  
- Hierarchy pending includes both new levels  
- Phase 5: Gotra required for profile + matrimonial; track `report:users-missing-gotra` until coverage is acceptable

---

## 13. Bottom line

| Decision | Choice |
|---|---|
| Current Gotra data meaning | **Sub-Khamp** |
| First create? | **Sub-Khamp via migration/rename of current Gotra** |
| Second create? | **New empty Gotra under Sub-Khamp** |
| UserDetails remap | `gotra` → `subKhamp`; new `gotra` later |
| Gotra required on day 1? | **No** — Phase 5 (now enforced) |
| Ship order | Server → Migration → Admin → Client → Require Gotra |

This keeps existing community data valid, fixes naming to match product language, and adds the real Gotra level with a deliberate optional window (Phases 1–4) before enforcement.
