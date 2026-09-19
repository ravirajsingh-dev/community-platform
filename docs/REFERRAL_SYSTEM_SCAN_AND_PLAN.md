# Referral System — Scan Report & Phase-wise Plan

**Updated:** 2026-07-17  
**Scope:** `server/`, `client/`, `admin/`  
**Rule:** User pe sirf `referralId` (referrer ka Member ID). No `referredBy`, no `referredByMemberId`, no sponsor naming.

---

## Executive verdict

| Area | Status |
|------|--------|
| User.`referralId` | Schema + register save + admin set/clear |
| Register optional referral | Done (server + client preview) |
| Referral lookup API | `GET /api/auth/users/referral/:referral_id` mounted |
| Wallet + history | Models + admin + client My Account tab |
| Commission settings | Membership Management → Membership Settings |
| Credit on payment success | Done — first Activation only, idempotent |

---

## 1. User schema (only this)

```js
referralId: {
  type: String,       // referrer memberId e.g. "9876543210-01"
  required: false,
  index: true,
  minlength: 13,
  maxlength: 13,
}
```

**Removed (do not reintroduce):** `referredBy`, `referredByMemberId`, sponsor fields/state.

Lookup: `User.findOne({ memberId: referralId })` → credit usi user ke wallet me.

---

## 2. Existing pieces to reuse

| Piece | Location | Action |
|-------|----------|--------|
| `validateReferralId` | `server/utils/inputValidation.js` | Reuse |
| `validateReferralIdField` | `server/middleware/inputValidation.js` | Wire on register when present |
| `getReferralUserDetails` | `AuthController.js` | Mount `GET .../referral/:referral_id` |
| Admin `referralId` update branch | `AdminUserController.js` | Now matches schema — works as-is once UI sends it |
| `activateMembershipFromPayment` | `membershipPaymentService.js` | Credit hook yahan |
| `memberIdFormatter` | client + admin | Referral input formatting |

**Dead code cleaned:** client `sponsorUser` / `sponsorUserLoaded` removed.

---

## 3. Simple design

### Models

1. **User** — only `referralId`; wallet data is stored separately.
2. **Wallet** — one wallet per user:

| Field | Notes |
|-------|--------|
| `userId` | Unique wallet owner |
| `balance` | Number, default 0 |

3. **WalletTransaction** — wallet ledger:

| Field | Notes |
|-------|--------|
| `walletId` | Wallet reference |
| `type` | `credit` \| `debit` |
| `amount` | > 0 |
| `balanceAfter` | Snapshot |
| `source` | `referral_commission` \| `admin_adjust` |
| `paymentHistoryId` | Unique sparse — double-credit block |
| `fromUserId` | Referred user (optional) |
| `remarks` | String |

4. **CommonSettings.referral**

```js
referral: {
  enabled: Boolean,          // default false
  commissionType: "percent" | "flat",
  commissionValue: Number,   // % or ₹
}
```

### Rules

1. Register: `referralId` optional.
2. Agar diya: format OK + user with that `memberId` exists + active + not self → save string as-is.
3. Payment success (Activation, first activate only): if `user.referralId` + settings enabled + commission > 0 → credit referrer once per `paymentHistoryId`.
4. Renewals / donations → no credit (v1).
5. Admin: settings, edit user `referralId`, wallet list/adjust.

### APIs (minimal)

| Method | Path |
|--------|------|
| GET | `/api/auth/users/referral/:referral_id` |
| POST | `/api/auth/users/register` (+ optional `referralId`) |
| GET | `/api/user/wallet` |
| Admin settings | include `referral` block |
| Admin wallets | list / history / adjust |
| PUT | `/api/admin/users/:id` (`referralId` direct) |

### Credit hook

```
activateMembershipFromPayment (!alreadyActive):
  if Activation
  && user.referralId
  && settings.referral.enabled
  && commission > 0
  && no WalletTransaction for this payment
→ find referrer by memberId = user.referralId
→ find/create referrer's Wallet
→ Wallet.balance += X
→ WalletTransaction credit
```

---

## 4. Phases

### Phase 0 — Wire lookup ✅ Done
- [x] Mount referral lookup route.
- [x] Confirm admin can set/clear `referralId`.

### Phase 1 — Models + settings ✅ Done
- [x] `Wallet` model (balance separate from User).
- [x] `WalletTransaction` model.
- [x] `CommonSettings.referral`.

### Phase 2 — Register ✅ Done
- [x] Server: optional `referralId` validate + save.
- [x] Client: optional input + lookup preview.

### Phase 3 — Credit on payment success ✅ Done
- [x] Small helper from `activateMembershipFromPayment`.
- [x] Idempotent via `paymentHistoryId`.

### Phase 4 — Admin ✅ Done
- [x] Settings UI (enabled / percent|flat / value).
- [x] Edit User `referralId`.
- [x] Wallet list + adjust.

### Phase 5 — Client wallet (thin) ✅ Done
- [x] Balance + history; show own Member ID to share.

---

## 5. Non-goals

- No ObjectId referrer field  
- No sponsor naming  
- No multi-level / MLM  
- No bank withdrawal  
- No separate referral-code entity (Member ID = code)

---

## 6. Test checklist

- [ ] Register without `referralId` → OK  
- [ ] Invalid / missing / self referral → reject  
- [ ] Payment success → referrer credited once  
- [ ] Webhook retry → no double credit  
- [ ] Renewal / donation → no credit  
- [ ] Admin disable → no credit  
- [ ] Admin adjust → history + balance  

**Ship:** Phase 0 → 1 → 2 → 3 → 4 → 5
