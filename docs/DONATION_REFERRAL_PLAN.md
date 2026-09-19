# Donation + Referral — Analysis & Phase Plan

**Date:** 2026-07-17  
**Scope:** `server/`, `client/`, `admin/`  
**Rule:** Existing referral commission settings reuse karo. Naya sirf jab zaroori ho.

---

## Executive verdict

| Piece | Status |
|-------|--------|
| Membership referral (register + first Activation credit) | Already live |
| Commission settings (`CommonSettings.referral`) | Reuse as-is — no donation-specific % |
| Donation flow (UTR → admin approve) | Live, **no referral** |
| Donation → wallet commission | **Not built** — this plan |

**Credit moment:** Admin **approves** donation (`pending → approved`).  
Donations Cashfree/webhook use nahi karti — success = approve only.

---

## 1. Current state (deep scan)

### Referral (already working)

| Piece | Location | Reuse? |
|-------|----------|--------|
| `User.referralId` | `server/models/User.js` | Yes — convention: referrer `memberId` |
| Settings | `CommonSettings.referral` (`enabled`, `commissionType`, `commissionValue`) | **Yes — same % / flat** |
| Credit helper | `server/services/referralCommissionService.js` | Partially — today **Activation + first only** |
| Wallet + `WalletTransaction` | models + admin/client UI | Yes |
| Idempotency | unique sparse `paymentHistoryId` | Membership ke liye only |
| Lookup API | `GET /api/auth/users/referral/:referral_id` | Yes |
| Validate | `validateReferralId` / middleware | Yes |
| Register UI pattern | `client/.../Register.jsx` referral input + preview | Copy pattern into donation modal |
| Admin settings UI | Membership Settings → Referral Commission | Reuse; only copy text update |

### Donation (no referral today)

| Piece | Location |
|-------|----------|
| Model | `DonationRequest` — no `referralId` / `userId` |
| Submit | `POST /api/common/donation/request` |
| Success | `approveDonationRequest` — status + thank-you email only |
| Client form | `DonationModal.jsx` — no referral field |
| Admin list | `DonationRequestsList.jsx` — no referral column |
| `PaymentHistory` | Donation flow me **unused hi rahegi**; koi donation payment history create nahi hogi |

Existing membership credit **cannot** be called as-is:

```js
// referralCommissionService.js — rejects non-Activation
if (paymentHistory.paymentType !== "Activation") return ...
// also enforces first Activation only — wrong for donations
```

---

## 2. Design (minimal new)

### Attribution (submit time — immutable snapshot)

1. Donation form pe **optional** `referralId` (same format as register: `9999999999-01`).
2. Agar diya: format OK + active referrer exists + not self (phone match) → save on `DonationRequest`.
3. Logged-in user: optional `userId` store; `referralId` omitted ho to fallback `user.referralId` (server-side). Explicit empty value prefilled referral ko clear karta hai.
4. Approve ke time **sirf** `DonationRequest.referralId` use hoga (live User edit se attribution change nahi).

### Commission (approve time)

Reuse **same** `CommonSettings.referral`:

- `enabled === false` → no credit  
- `commissionType` percent \| flat  
- `commissionValue` as configured  

**Every approved donation** with a valid snapshot `referralId` can credit (not first-only).

### Idempotency (direct DonationRequest path)

On approve (inside Mongo session):

1. `pending → approved` (atomic).
2. Call donation commission helper → wallet credit + `WalletTransaction` with `donationRequestId`.
3. `WalletTransaction.donationRequestId` pe unique sparse index → approve retry / double-click safe.

**No Donation `PaymentHistory` will be created.** Donation ka source of truth `DonationRequest` hi rahega.

### What we intentionally do **not** add

- Separate donation commission % / settings block  
- New referral-code entity  
- Cashfree for donations  
- Donation `PaymentHistory`  
- Multi-level / MLM  
- Silent phone/email → user matching for attribution  

---

## 3. Reuse vs new

| Item | Action |
|------|--------|
| `CommonSettings.referral` | Reuse |
| `roundMoney`, wallet upsert, ledger pattern | Extract shared credit core **or** thin donation wrapper next to existing helper |
| `validateReferralId` + lookup API | Reuse |
| Register referral UI + `memberIdFormatter` | Reuse pattern in `DonationModal` |
| Admin Referral settings | Reuse; update helper text to mention donations |
| `DonationRequest.referralId` (+ optional `userId`) | **New fields only** |
| `WalletTransaction.donationRequestId` | **New optional reference + unique sparse index** for direct idempotency |
| `creditDonationReferralCommissionIfEligible` | **New thin function** (or generalize existing) — no Activation/first-only checks |
| Client donation payload `referralId` | Small change |
| Admin request list: show `referralId` | Small change |

Preferred server shape:

```
referralCommissionService.js
  ├── calculateCommission(amount, referralSettings)   // shared
  ├── creditReferrerWallet({ referrerMemberId, amount, paymentHistoryId?, donationRequestId?, fromUserId?, remarks, session })
  ├── creditReferralCommissionIfEligible(...)        // Activation — unchanged behavior
  └── creditDonationReferralCommissionIfEligible(...) // Donation — new, thin
```

Agar generalize heavy lage: pehle sirf donation wrapper likho jo settings + wallet block copy kare; Activation path mat todo.

---

## 4. Data flow

```
Client DonationModal
  → optional referralId (+ lookup preview)
  → POST /api/common/donation/request
       validate + snapshot referralId [, userId]
       save DonationRequest (pending)

Admin Approve
  → PUT .../requests/:id/approve  (+ txn password)
       session:
         pending → approved
         creditDonationReferralCommissionIfEligible
           (settings.referral + DonationRequest.referralId)
         Wallet + WalletTransaction
           (referral_commission + donationRequestId)
       then thank-you email (outside / after commit)
```

---

## 5. Phases

### Phase 0 — Spec lock ✅ (this doc)

- [x] Reuse `CommonSettings.referral` (no new %)
- [x] Credit on admin approve
- [x] Snapshot `referralId` at submit
- [x] No Donation `PaymentHistory`; donation flow `DonationRequest` par hi rahega
- [x] Idempotency via unique `WalletTransaction.donationRequestId`

### Phase 1 — Model + submit attribution ✅

**Server**

- [x] `DonationRequest`: add optional `referralId` (String, 13, indexed); optional `userId` (ObjectId, ref users)
- [x] `submitDonationRequest`: accept `referralId`; validate like register; resolve logged-in fallback; save snapshot

**Client**

- [x] `DonationModal` + `donationActions`: optional Referral Member ID + debounced lookup (mirror Register)
- [x] Prefill: logged-in user’s `referralId` if present (editable clear/override)

**Done when:** ✅ pending donation DB me `referralId` dikhe; invalid referral reject.

### Phase 2 — Credit on approve (core) ✅

**Server**

- [x] Add `creditDonationReferralCommissionIfEligible` (or shared core + thin wrapper)
  - Requires session
  - Uses `CommonSettings.referral` only
  - Amount = donation amount × % or flat
  - Skip if no `referralId` / disabled / zero / referrer missing / self
  - **No** first-activation check
- [x] `approveDonationRequest`: wrap in Mongo transaction
  - Approve only if still `pending`
  - Call donation commission helper
  - Create wallet transaction with direct `donationRequestId`
  - Commit; then email
- [x] Duplicate approve → 400 / no double credit

**Done when:** ✅ approve → referrer wallet += commission once; retry safe.

### Phase 3 — Admin visibility (thin) ✅

- [x] `DonationRequestsList` / detail: show `referralId` (and maybe credited amount later via wallet remarks)
- [x] Membership Referral settings helper text: “first Activation **and** approved donations”
- [x] Wallet history already shows `referral_commission` — no new source enum required for v1  
  *(Optional later: `donation_referral_commission` if reports need split)*

**Done when:** ✅ admin request row pe referrer member ID dikhe.

### Phase 4 — Hardening + test checklist ✅

- [x] Approve concurrent race: only one wins pending→approved
- [x] Settings disabled → approve OK, no credit
- [x] Guest with referral → credit
- [x] Guest without referral → approve OK, no credit
- [x] Logged-in fallback `user.referralId` when form empty
- [x] Self-referral blocked at submit
- [x] Invalid / inactive referrer blocked at submit
- [x] Flat vs percent both work from existing settings
- [x] Existing Activation referral still works unchanged

**Done when:** ✅ checklist covered by `server/tests/donationReferralHelpers.test.js` + submit/approve helpers.

---

## 6. File touch list (expected)

| Area | Files |
|------|--------|
| Server model | `server/models/DonationRequest.js` |
| Server credit | `server/services/referralCommissionService.js` |
| Server approve/submit | `server/routes/admin/Controllers/DonationController.js` |
| Client | `client/.../DonationModal.jsx`, `client/src/actions/donationActions.js` |
| Admin | `admin/.../Donation/DonationRequestsList.jsx` (+ maybe approve modal) |
| Settings copy | `admin/.../ApplicationSettingsSections.jsx` / MembershipSettings |

Avoid new routes, new settings schema, new wallet models unless Phase 4 later needs reporting split.

---

## 7. Non-goals (v1)

- Donation-specific commission %  
- Auto-match donor phone → User for referral  
- Cashfree donation gateway  
- Commission on reject / pending  
- Changing membership “first Activation only” rule  

---

## 8. Ship order

```
Phase 0 (doc) → Phase 1 (capture) → Phase 2 (credit) → Phase 3 (admin UI) → Phase 4 (tests)
```

**Suggested first implementation PR:** Phase 1 + 2 together (attribution without credit is incomplete). Phase 3 can ride same PR if small.
