# User Status + Membership — Audit and Phased Fix Plan

**Date:** 2026-07-17  
**Scope:** `server/`, `client/`, `admin/`  
**Status:** Audit complete; implementation pending

---

## 1. Canonical user statuses

The `User.status` field currently defines:

| Status | Meaning | Expected access |
|---|---|---|
| `1` | Active | Login and full portal access when membership data is valid |
| `2` | Inactive / Expired | Login and membership renewal access only |
| `3` | Blocked | No login or authenticated API access |
| `4` | New / Payment pending | Login and first membership payment access only |

Source: `server/models/User.js`

`Admin.status` and `SubAdmin.status` are separate enums and only use:

- `1` = Active
- `2` = Inactive

They must not be mixed with the four-state `User.status` lifecycle.

---

## 2. Intended user lifecycle

```text
Registration / admin-created user
             |
             v
      4 (New / unpaid)
             |
      successful payment
             |
             v
        1 (Active)
             |
       membership expiry
             |
             v
   2 (Inactive / expired)
             |
      successful renewal
             |
             v
        1 (Active)

Any state --admin block--> 3 (Blocked)
3 (Blocked) --admin unblock--> previous valid state
```

Expected unblock restoration:

- Previously active and still valid membership → `1`
- Previously new and unpaid → `4`
- Previously expired/inactive → `2`

The current model does not store the pre-block status, so this restoration is not always reliable.

---

## 3. Current behavior that is correct

### Authentication

- Status `1`, `2`, and `4` users can log in.
- Status `3` users are denied with `Account access denied`.
- `UserAuth` permits status `2` so expired users can load their account and renew.
- Membership-protected APIs remain gated through `requireActiveMembership`.

Relevant files:

- `server/routes/user/auth/Controllers/AuthController.js`
- `server/middleware/auth.js`
- `server/middleware/userProtected.js`
- `server/middleware/requireActiveMembership.js`

### Membership access

`getMembershipAccessState()` currently resolves:

1. Status `3` → `ACCOUNT_BLOCKED`
2. Status `4` and unpaid → `PAYMENT_REQUIRED`
3. Valid paid membership → `ACTIVE`
4. Status `2` or expired membership → `MEMBERSHIP_EXPIRED`
5. Other invalid combinations → `MEMBERSHIP_INACTIVE`

Relevant file:

- `server/utils/membershipHelper.js`

### Expiry

The expiry job changes eligible users from:

```text
status: 1, isPaid: true
        ↓
status: 2, isPaid: false
```

Relevant file:

- `server/jobs/membershipExpiryJob.js`

---

## 4. Audit findings

## Critical

### 4.1 Payment success can reactivate a blocked user

The shared payment activation service sets:

```text
status = 1
isPaid = true
```

without first rejecting `status === 3`.

This allows an already-created pending payment, webhook, reconciliation, or admin payment override to change a blocked user back to Active.

Affected files:

- `server/services/membershipPaymentService.js`
- `server/routes/admin/Controllers/AdminPaymentController.js`
- `server/routes/admin/Controllers/AdminUserMembershipController.js`

Required behavior:

- A blocked user must never be activated by payment.
- Blocking should cancel or invalidate pending membership payments where appropriate.
- Webhook processing must record the payment safely without granting membership access to a blocked account.

### 4.2 Generic admin edit bypasses membership invariants

The generic Edit User API can directly set status `1`, `2`, `3`, or `4` without synchronizing:

- `isPaid`
- `isLifetimePaid`
- `renewalDate`
- `subscriptionStartDate`
- `UserSubscription` rows
- active sessions
- membership audit logs

This can create invalid combinations such as:

- `status = 1`, `isPaid = false`
- `status = 2`, `isPaid = true`, future renewal date
- `status = 3` with active sessions
- `status = 4` for an already-paid user

Affected files:

- `admin/src/view/admin/components/users/editUser/EditUserCoreTab.jsx`
- `admin/src/constants/CustomSelectValues.jsx`
- `server/routes/admin/Controllers/AdminUserController.js`

Required behavior:

- Remove membership status changes from generic profile editing.
- Use dedicated Activate, Renew, Expire, Block, and Unblock actions.
- Every state transition must validate and update all related membership fields transactionally.

### 4.3 Public payment endpoints lack ownership authorization

The following endpoints are public:

- `POST /api/payments/create-order`
- `GET /api/payments/status/:orderId`

`create-order` accepts a `userId` directly, and the status response can include user and membership information.

Affected files:

- `server/routes/payments/paymentRoutes.js`
- `server/routes/payments/Controllers/PaymentController.js`
- `server/services/membershipPaymentService.js`

Required behavior:

- Registration payment must use a short-lived, signed payment intent or registration token.
- Authenticated payments must derive the user ID from the session.
- Payment-status access must verify ownership or use an unguessable, scoped return token.
- Public status responses must not expose unnecessary user information.

### 4.4 Login response may expose recoverable password data

The User model defines password-related fields/virtuals, while successful login sanitization is not as strict as registration sanitization.

Affected files:

- `server/models/User.js`
- `server/routes/user/auth/Controllers/AuthController.js`
- `server/routes/user/auth/Controllers/RegisterController.js`

Required behavior:

- Never return `password`, `pwdRef`, or `passwordCopy`.
- Prefer an explicit allowlist DTO instead of deleting sensitive fields after converting the model.

---

## High priority

### 4.5 Unblocking loses the New state

Current unblock logic restores only:

- `1` when membership appears active
- otherwise `2`

A blocked status-`4` unpaid user therefore becomes status `2`, causing renewal/expired behavior instead of first-payment behavior.

Affected file:

- `server/routes/admin/Controllers/AdminUserMembershipController.js`

Required behavior:

- Store `statusBeforeBlock`, or derive restoration from reliable membership history.
- Unpaid users who never activated membership must return to `4`.

### 4.6 Expire API can demote a New user

The admin UI hides Expire for some unpaid New users, but the backend endpoint can still change status `4` to `2`.

Affected files:

- `admin/src/view/admin/components/users/UsersList.jsx`
- `server/routes/admin/Controllers/AdminUserMembershipController.js`

Required behavior:

- Backend must reject Expire unless the user has an active or previously-paid finite membership.
- UI visibility must not be the security or state-integrity boundary.

### 4.7 Initial-payment plan binding can be bypassed through renewal

Initial `createMembershipOrder` enforces the registration plan for a New user, but the authenticated renewal path uses `isRenewal: true`, bypassing that check.

Affected files:

- `server/services/membershipPaymentService.js`
- `server/routes/user/Controllers/MembershipController.js`

Required behavior:

- Status `4` users must always use the initial-payment flow.
- Renewal must be rejected for users who have never activated a membership.

### 4.8 Status 2 has two meanings

Status `2` currently represents both:

- Natural membership expiry
- Manual admin deactivation

Both cases are presented as `MEMBERSHIP_EXPIRED`.

Required decision:

Choose one:

1. Keep status `2` only for expired membership and use status `3` for all administrative access blocks; or
2. Add a separate account-access field such as `accountState` while membership state is derived independently.

Recommended model:

```text
accountState: active | blocked
membershipState: new | active | expired
```

This removes the overloaded status enum and prevents contradictory combinations.

---

## Medium priority

### 4.9 Expired users can remain searchable until the cron job runs

Several features check only `status === 1`, not the actual renewal date. A membership that expires between job runs can remain searchable or eligible as a referrer temporarily.

Affected areas:

- Member search
- Referral validation
- Matrimonial validation
- Donation referral eligibility

Relevant files:

- `server/routes/user/Controllers/SearchMemberController.js`
- `server/routes/user/auth/Controllers/AuthController.js`
- `server/routes/user/auth/Controllers/RegisterController.js`
- `server/utils/donationReferralHelpers.js`
- `server/services/matrimonialValidationService.js`

Required behavior:

- Reuse one canonical `isMembershipActive()` check everywhere.
- Do not use `status === 1` alone as proof of active membership.

### 4.10 Early renewal is supported by backend but blocked by frontend

The backend can extend an active finite membership from its current renewal date. The frontend advertises renewal near expiry but hides the payment plans while membership remains active.

Affected files:

- `server/services/membershipPaymentService.js`
- `client/src/views/Layout/MyAccount/tabs/MyAccountMembershipTab.jsx`
- `client/src/views/Layout/Membership/MembershipRenewalSection.jsx`

Required behavior:

- Define an early-renewal window, such as 30 days.
- Show renewal plans during that window.
- Preserve the existing renewal date as the extension base.

### 4.11 Dedicated renewal route redirects the wrong users

The renewal route redirects users when `requiresMembershipAction(user)` is true. Those are the users most likely to need renewal.

Affected file:

- `client/src/views/Layout/Membership/RenewMembership.jsx`

Required behavior:

- New users should go to first payment.
- Expired users should remain on renewal.
- Active users outside the early-renewal window should return to dashboard.
- Active users inside the window should be allowed to renew.

### 4.12 Registration UI permits a plan change that backend rejects

After account creation, the UI lets the user return to plan selection. The backend rejects a payment if the new plan differs from the stored registration plan.

Affected files:

- `client/src/views/Auth/Register.jsx`
- `server/services/membershipPaymentService.js`

Required behavior:

Choose one:

- Lock plan selection after account creation; or
- Add a validated endpoint that updates the unpaid New user's selected plan before creating an order.

### 4.13 Multiple active subscription rows

Each successful renewal creates another active `UserSubscription`, but previous active rows are not consistently closed.

Affected files:

- `server/services/membershipPaymentService.js`
- `server/jobs/membershipExpiryJob.js`

Required behavior:

- Decide whether subscriptions are immutable periods or one current aggregate subscription.
- If they are periods, mark the previous active period superseded/extended as appropriate.
- Ensure only the current membership period is treated as active.

---

## Low priority / cleanup

### 4.14 Inconsistent labels and badge colors

Status `3` appears as both:

- Blocked
- Temporary Blocked

No automatic unblock mechanism exists, so “Temporary” is misleading.

Status `4` badge colors also differ across admin and client screens.

Affected files:

- `admin/src/constants/CustomSelectValues.jsx`
- `client/src/constants/index.jsx`
- `admin/src/view/admin/components/users/UsersList.jsx`
- Referral and wallet UI components

Required behavior:

- Use one shared naming convention:
  - Active
  - Expired
  - Blocked
  - Payment Pending
- Use consistent badge colors across admin and client.

### 4.15 Status 1 is displayed as Active without validating membership data

Some admin/client displays use the raw status label, while backend access also requires valid payment and renewal data.

Required behavior:

- Display account status and membership status separately.
- Do not label a user “Active membership” based only on `status === 1`.

---

## 5. Phased implementation plan

## Phase 0 — Define invariants and add regression tests

**Goal:** Lock down expected behavior before changing production flows.

Tasks:

1. Define allowed status transitions in one module.
2. Add a behavior matrix for statuses `1–4`.
3. Add tests for:
   - Blocked user + successful pending payment
   - Blocked user + webhook
   - New user block/unblock
   - New user attempting renewal
   - Admin generic status edits
   - Expired user login and renewal
   - Early renewal
   - Subscription rollover
   - Payment endpoint ownership
4. Add invariant assertions for invalid status/payment combinations.

Suggested new module:

- `server/utils/userMembershipState.js`

Acceptance criteria:

- Every status has explicit allowed and denied actions.
- Critical race and transition tests fail against the old implementation.

---

## Phase 1 — Secure blocked-account and payment transitions

**Goal:** Ensure no payment path can bypass an admin block.

Tasks:

1. Reject membership activation when `user.status === 3`.
2. Apply the check inside the shared activation service, not only controllers.
3. Handle successful gateway payment for a blocked user without granting access.
4. Cancel/invalidate pending payments when blocking where gateway behavior permits.
5. Ensure manual payment activation and override endpoints use the same guard.
6. Add transaction-safe audit events for blocked activation attempts.

Affected files:

- `server/services/membershipPaymentService.js`
- `server/routes/admin/Controllers/AdminPaymentController.js`
- `server/routes/admin/Controllers/AdminUserMembershipController.js`

Acceptance criteria:

- No webhook, poll, reconciliation, or admin payment override can change `3 → 1`.
- Blocked users remain blocked after successful gateway callbacks.

---

## Phase 2 — Centralize admin state transitions

**Goal:** Prevent contradictory membership data.

Tasks:

1. Remove status selection from generic Edit User.
2. Route all changes through dedicated actions:
   - Activate
   - Renew
   - Expire
   - Block
   - Unblock
3. Require transaction password and appropriate permission checks.
4. Synchronize User, UserSubscription, PaymentHistory, and Session changes.
5. Invalidate sessions on block.
6. Record all transitions in membership audit logs.

Affected files:

- `admin/src/view/admin/components/users/editUser/EditUserCoreTab.jsx`
- `server/routes/admin/Controllers/AdminUserController.js`
- `server/routes/admin/Controllers/AdminUserMembershipController.js`

Acceptance criteria:

- Generic user update cannot mutate membership state.
- Invalid combinations cannot be created through admin APIs.

---

## Phase 3 — Correct New, Expired, Blocked, and renewal transitions

**Goal:** Make every status transition deterministic.

Tasks:

1. Add `statusBeforeBlock` or replace the overloaded status model.
2. Restore unpaid never-activated users to `4` after unblock.
3. Reject Expire for status `4`.
4. Reject renewal for status `4`; direct the user to initial payment.
5. Ensure initial payment enforces the selected registration plan.
6. Decide and implement the distinction between admin-deactivated and naturally expired.

Affected files:

- `server/models/User.js`
- `server/routes/admin/Controllers/AdminUserMembershipController.js`
- `server/routes/user/Controllers/MembershipController.js`
- `server/services/membershipPaymentService.js`
- `server/utils/membershipHelper.js`

Acceptance criteria:

- New → Blocked → Unblocked returns to New.
- New users cannot use renewal to bypass initial-payment rules.
- Expired and administratively blocked/deactivated states are unambiguous.

---

## Phase 4 — Secure payment ownership and response data

**Goal:** Prevent cross-account order creation and payment-status disclosure.

Tasks:

1. Replace public `userId` trust with a signed registration payment intent.
2. Derive authenticated renewal user ID from the session.
3. Protect payment status by user ownership or a scoped return token.
4. Remove private user fields from public payment-status responses.
5. Rate-limit payment order creation and status polling.
6. Sanitize login/load-user responses using explicit DTO allowlists.

Affected files:

- `server/routes/payments/paymentRoutes.js`
- `server/routes/payments/Controllers/PaymentController.js`
- `server/services/membershipPaymentService.js`
- `server/routes/user/auth/Controllers/AuthController.js`

Acceptance criteria:

- One user cannot create or inspect another user's payment.
- Public responses contain no unnecessary account details.
- Password-related fields never appear in auth responses.

---

## Phase 5 — Fix frontend payment and renewal UX

**Goal:** Align frontend navigation with backend rules.

Tasks:

1. Correct `RenewMembership` redirect conditions.
2. Show renewal plans to expired users.
3. Support a defined early-renewal window.
4. Route New users to first payment, not renewal.
5. Prevent unsupported registration plan changes after account creation.
6. Prevent duplicate error toasts when an API action already displays the error.
7. Restrict payment-return route bypass to the exact expected return route.

Affected files:

- `client/src/views/Layout/Membership/RenewMembership.jsx`
- `client/src/views/Layout/Membership/MembershipRenewalSection.jsx`
- `client/src/views/Layout/MyAccount/tabs/MyAccountMembershipTab.jsx`
- `client/src/views/Auth/Register.jsx`
- `client/src/views/Layout/PortalLayout.jsx`
- `client/src/utils/paymentReturnHelper.js`

Acceptance criteria:

- Expired users can reach and complete renewal directly.
- Active users can renew only in the configured early-renewal window.
- New users always follow the initial-payment flow.

---

## Phase 6 — Normalize membership checks and subscriptions

**Goal:** Make backend eligibility decisions consistent.

Tasks:

1. Replace raw `status === 1` membership checks with canonical helpers.
2. Use the helper in search, referral, matrimonial, and donation eligibility.
3. Define subscription history semantics.
4. Close or supersede old active subscriptions during renewal.
5. Add a reconciliation job for existing inconsistent users/subscriptions.
6. Report invalid combinations before applying migration repairs.

Affected areas:

- Search
- Referrals
- Matrimonial
- Donation referral
- Membership payment activation
- Membership expiry

Acceptance criteria:

- An expired date cannot be treated as active because the cron has not run.
- A user has at most one current active subscription representation.
- Existing inconsistent data is identified and safely repaired.

---

## Phase 7 — UI labels, observability, and documentation

**Goal:** Make status behavior understandable to users and operators.

Tasks:

1. Standardize status labels and badge colors.
2. Show account status separately from membership status.
3. Remove “Temporary Blocked” unless timed unblock is implemented.
4. Add structured audit logs for every membership transition.
5. Add operational metrics:
   - Blocked activation attempts
   - Payment activation failures
   - Invalid membership state combinations
   - Expiry and renewal counts
6. Update admin help text and support runbooks.

Acceptance criteria:

- Admin and client show the same status terminology.
- Support can identify why a user lacks access without inspecting raw database fields.

---

## 6. Recommended implementation order

```text
Phase 0: Tests and invariants
        ↓
Phase 1: Block/payment safety
        ↓
Phase 2: Admin transition safety
        ↓
Phase 3: Lifecycle correctness
        ↓
Phase 4: Payment authorization and data security
        ↓
Phase 5: Frontend renewal/payment UX
        ↓
Phase 6: Canonical checks and data reconciliation
        ↓
Phase 7: Labels, monitoring, and documentation
```

Do not start with UI labels or data migration. First prevent new invalid states, then reconcile existing records.

---

## 7. Final target invariants

The completed system should guarantee:

1. `status = 3` can only be changed by an authorized unblock action.
2. Payment success cannot bypass account blocking.
3. `status = 4` means the user has never completed initial membership payment.
4. Renewal is unavailable until initial membership activation succeeds.
5. `status = 1` is not considered sufficient without valid membership fields.
6. Expired users can authenticate only for permitted account and renewal operations.
7. Generic profile edits cannot change membership state.
8. Every membership transition is transactional and audited.
9. Payment orders and payment status are accessible only to their owner.
10. Auth responses never expose password or recoverable password material.
11. Search/referral eligibility uses actual membership validity, not raw status alone.
12. Subscription history cannot contain multiple unintended current active records.

---

## 8. Verification checklist

- [ ] Status `1`: active paid finite membership gets full access
- [ ] Status `1`: lifetime membership gets full access
- [ ] Status `1`: invalid unpaid combination is rejected/reconciled
- [ ] Status `2`: login works
- [ ] Status `2`: protected portal API returns membership-expired response
- [ ] Status `2`: renewal order and payment work
- [ ] Status `3`: login and UserAuth requests are denied
- [ ] Status `3`: pending payment/webhook cannot reactivate account
- [ ] Status `4`: login works
- [ ] Status `4`: protected portal API returns payment-required response
- [ ] Status `4`: initial payment works only for the valid selected plan
- [ ] Status `4`: renewal endpoint is rejected
- [ ] New → Blocked → Unblocked restores New
- [ ] Active → Blocked → Unblocked restores valid Active membership
- [ ] Expired → Blocked → Unblocked restores Expired
- [ ] Admin generic update cannot mutate status
- [ ] Expiry closes the correct subscription state
- [ ] Renewal does not leave stale active subscriptions
- [ ] Payment endpoints enforce ownership
- [ ] Auth/payment responses expose no sensitive user fields

