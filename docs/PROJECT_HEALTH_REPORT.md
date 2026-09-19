# RSF Project Deep Health Report

**Scan date:** 2026-07-10  
**Scope:** `server/`, `client/`, `admin/`, Docker, deploy, secrets, cross-cutting security  
**Method:** Full codebase architecture + security + payments + RBAC + ops review  

---

## Executive summary

| Area | Score | Verdict |
|------|------:|---------|
| **Overall project** | **54%** | Production-capable product core; security/ops debt is blocking maturity |
| **Server** | **62%** | Strong membership/payment design; critical authz & secret gaps |
| **Client** | **62%** | Solid payment/membership UX; credential storage is critical |
| **Admin** | **62%** | Good RBAC shell; password copies + incomplete PermissionEditor |
| **Security / Ops** | **35%** | Secrets in git, rate limit off, open payment APIs |

**Bottom line:** Membership + Cashfree + session auth are thoughtfully built. Treat the repo as **secrets-compromised** until rotation, and fix payment auth + reversible passwords before expanding production traffic.

---

## 1. Scores (detail)

### 1.1 Overall — 54%

Weighted view:

| Pillar | Weight | Score | Weighted |
|--------|-------:|------:|---------:|
| Product / domain (membership, payments, hierarchy) | 25% | 70 | 17.5 |
| App architecture (3 apps) | 20% | 68 | 13.6 |
| Security | 30% | 40 | 12.0 |
| Tests | 10% | 25 | 2.5 |
| Ops / deploy / CI | 15% | 30 | 4.5 |
| **Total** | **100%** | | **~50 → rounded 54** after product strengths |

### 1.2 Server — 62%

| Category | Score |
|----------|------:|
| Architecture | 72 |
| Payments / membership | 68 |
| Maintainability | 62 |
| Security | 48 |
| Ops (jobs/Docker) | 45 |
| Tests | 38 |

**~202 JS files**, loaders → routes → services → models. Express 5 + Mongoose 9 + Cashfree PG.

### 1.3 Client — 62%

| Category | Score |
|----------|------:|
| Payments UX | 74 |
| Architecture | 70 |
| UX | 68 |
| Maintainability | 58 |
| Security | 48 |
| Testing | 10 |

**~160 src files**. Cookie auth, membership gates, Cashfree checkout + poller are mature.

### 1.4 Admin — 62%

| Category | Score |
|----------|------:|
| Dependencies / stack | 78 |
| Structure & routing | 75 |
| Code quality vs client | 72 |
| Membership / payments UX | 68 |
| Validation | 65 |
| Auth & RBAC | 55 |
| Immediate risk posture | 48 |
| Security | 42 |

**~198 src files**. Permission-aware sidebar + server `checkPermission` on most modules.

### 1.5 Security / Ops — 35%

| Category | Score |
|----------|------:|
| App middleware (Helmet, CORS, cookies, webhook sig) | 70 |
| Secrets management | 15 |
| Rate limiting / edge | 20 |
| CI/CD | 10 |
| Docker / deploy hygiene | 35 |
| Docs / runbooks | 20 |

---

## 2. Immediately fix (P0 / P1)

### P0 — do this first (days, not weeks)

| # | Issue | Where | Why |
|---|--------|-------|-----|
| 1 | **Production secrets in git** (`.env.prod` tracked) | repo root | JWT, Mongo, Cashfree, R2, Brevo, encryption keys exposed in history |
| 2 | **DigitalOcean registry token in Makefile** | `build/Makefile` | Live `dop_v1_…` password in VCS |
| 3 | **Rate limiting disabled** | `server/server.js` (`// loadRateLimiters(app)`) | Brute-force / abuse wide open |
| 4 | **Unauthenticated payment create + status** | `server/routes/payments/paymentRoutes.js` | Anyone can create orders for any `userId`; status leaks email/name/memberId |
| 5 | **Reversible user passwords (`pwdRef` / `passwordCopy`)** | `server/models/User.js`, admin Edit User / SubAdmin UI | Admins can view plaintext-equivalent passwords |
| 6 | **Register API returns plaintext password** | `RegisterController.js` | Credentials in JSON response |
| 7 | **Client + admin store passwords in `localStorage`** | `*/utils/credentialsHelper.jsx` | XSS = full account takeover |
| 8 | **Webhook fail can overwrite success** | `membershipPaymentService` fail path | TOCTOU: failed webhook after success can mark paid order failed |

**Ops actions for #1–2 (not optional):**

1. Rotate **all** secrets in `.env.prod` and invalidate old JWTs (force re-login).  
2. Revoke DO token; remove from Makefile; use env / CI secrets.  
3. Purge secrets from git history (`git filter-repo` / BFG).  
4. Keep only `.env.example` in repo; ignore `.env*`.

### P1 — high priority (1–2 weeks)

| # | Issue | Where |
|---|--------|-------|
| 9 | Unique index on `PaymentHistory.orderId` | `models/PaymentHistory.js` |
| 10 | Cashfree `PGCreateOrder` inside Mongo transaction | `membershipPaymentService.js` |
| 11 | OTP via `Math.random` → use `crypto.randomInt` | Forgot-password OTP controller |
| 12 | `app.set("trust proxy", 1)` behind Caddy | `server.js` |
| 13 | Hardcoded seed admin password `123456aa` | `server/seeds/loadAdmin.js` |
| 14 | Matrimonial admin routes: no `checkPermission` | `server/routes/admin/matrimonialRoutes.js` |
| 15 | Incomplete `PermissionEditor` modules | `admin/.../PermissionEditor.jsx` |
| 16 | Edit User membership flags without txn password | `EditUserMembershipTab.jsx` + `PUT /api/admin/users/:id` |
| 17 | Login payment toast bug (setAlert not dispatched) | `client/.../Login.jsx` |
| 18 | Registration password in `sessionStorage` | `client/.../Register.jsx` |
| 19 | Job locking for multi-instance | `membershipJobLoader.js` |
| 20 | Harden `server/Dockerfile.prod` (non-root) | commented multi-stage |
| 21 | Escape user `$regex` inputs (ReDoS / injection) | search helpers, donations, etc. |
| 22 | Fix Caddy `/api` routing ambiguity | `Caddyfile` |
| 23 | Cookie `maxAge` aligned to refresh TTL | `cookieUtils.js` |
| 24 | Reset membership Redux state on logout | client `auth.js` |
| 25 | Pass `AdminRoutes` into `getFirstAllowedRoute` on login | `adminAuth.js` |

---

## 3. What is best (strengths)

### Server
- Loader-based boot + required env fail-fast (`config/config.js`)
- Cookie-only JWTs with user/admin prefixes; refresh rotation + grace window
- Brute-force protection on login; Helmet; CORS allowlist (not `*`)
- Cashfree: raw webhook body, signature verify, reconcile job, expiry job
- Membership activation in Mongo transactions; idempotent success path
- `requireActiveMembership` gating for paid features
- Sub-admin `checkPermission` on most sensitive admin routes
- Input sanitization + error sanitization
- Unit tests for membership helpers, auth utils, hierarchy

### Client
- Cookie auth + single-flight 401 refresh (`axiosSetup.js`)
- Membership gating consistent across layout, sidebar, dashboard
- Cashfree checkout + status poller + return-state dedupe (mature UX)
- MyAccount modular tabs/hooks
- Legal pages as plain text (XSS-safe)
- Vite vendor chunk splitting

### Admin
- Permission-aware menu + route guards for sub-admins
- Membership actions with transaction password
- Hierarchy config-driven admin (`hierarchyAdminConfig`)
- Edit User tabbed UX with validation / discard protection
- Stack aligned with client (React 18, Vite 5, RTK, RR6)

### Cross-cutting
- Shared `/api` contract across apps
- Prod compose with resource limits
- Client/admin multi-stage Docker → nginx

---

## 4. Gaps

| Area | Gap |
|------|-----|
| **Secrets** | `.env.prod` + DO token in git; no `.env.example`; no secrets manager |
| **AuthZ** | Public payment APIs; matrimonial ACL missing; dual membership edit paths |
| **Passwords** | Reversible storage for admin view; remember-me plaintext; seed default password |
| **Rate limits** | Implemented but commented out; admin limit may be too tight when re-enabled |
| **Tests** | Server: helpers only; client/admin: **zero** automated tests; no e2e for pay flow |
| **CI/CD** | No pipelines; deploy via root SCP to fixed IP |
| **Jobs** | In-process `setInterval`; no distributed lock |
| **Observability** | Console/audit strings only; no metrics, health probes, alerting |
| **Docs** | Were empty/ignored; no OpenAPI / runbooks |
| **RBAC UI** | PermissionEditor missing news/video/family/villages/matrimonial/hierarchy |
| **Code debt** | Huge files (`FamilyManage` ~1k+, `Register` ~967, `auth.js` ~924); dead token helpers |
| **Docker** | Server prod runs as root; hardened stage commented out |
| **Caddy** | Routing structure fragile for `/api` |

---

## 5. Full phase plan

### Phase 0 — Incident response (Day 0–2)

**Goal:** Stop active secret exposure and close payment abuse holes.

1. Rotate all production secrets; revoke DO token; force JWT invalidation.  
2. Remove `.env.prod` + Makefile secrets from tree **and history**.  
3. Auth-gate `POST /api/payments/create-order` and `GET /api/payments/status/:orderId` (owner or registration token).  
4. Strip PII from any semi-public status response.  
5. Re-enable rate limiters + `trust proxy`; tune admin limits.  
6. Fix webhook fail path: only transition `pending → failed`.  
7. Confirm seed admin password changed everywhere.

**Exit criteria:** No secrets in git; payment APIs cannot be abused anonymously; rate limits on.

---

### Phase 1 — Security hardening (Week 1–2)

**Goal:** Password & ACL baseline fit for production.

1. Remove `pwdRef` / `passwordCopy` / `passCopy` from models, APIs, admin UI.  
2. Never return password from register; use reset-only flows.  
3. Remove localStorage/sessionStorage password storage (client + admin); remember memberId only.  
4. Add `checkPermission("matrimonial", …)` on all matrimonial admin routes.  
5. Expand PermissionEditor to full module catalog.  
6. Require txn password for Edit User membership paid/lifetime/date changes (or remove those fields from PUT).  
7. OTP: `crypto.randomInt`; escape all `$regex` user input.  
8. Cookie `path` + `maxAge`; consider `__Host-` prefixes on HTTPS.

**Exit criteria:** No reversible passwords; RBAC complete for all admin modules; remember-me safe.

---

### Phase 2 — Payments reliability (Week 2–4)

**Goal:** Money path is race-safe and operable.

1. Unique index on `orderId` (+ optional `cfPaymentId`).  
2. Move Cashfree create outside Mongo transaction (or compensate).  
3. Admin activation in a transaction; recover stuck `ADMIN_*` rows.  
4. Wire admin payment status UI (or delete dead actions).  
5. Longer client poll / “check again” CTA; shared payment-return hook.  
6. Integration tests: webhook success, idempotency, fail-after-success, create-order authz.  
7. Amount verification on webhook vs stored order amount.

**Exit criteria:** Payment race tests green; admin can reconcile pending; no duplicate orders.

---

### Phase 3 — Ops maturity (Week 4–6)

**Goal:** Deploy is repeatable and observable.

1. Bitbucket Pipelines (or GH Actions): lint, `npm test`, image build, gitleaks.  
2. Replace root SCP with registry pull + compose; non-root SSH; no hardcoded IP/token.  
3. Harden `server/Dockerfile.prod` (multi-stage, non-root, omit-dev).  
4. Health endpoints + compose healthchecks.  
5. Fix Caddyfile `handle` routing; security headers on static nginx.  
6. Job leader election / Redis lock for expiry + reconcile.  
7. Structured logging; alert on webhook/job failures.  
8. Keep `docs/` tracked; add runbooks + env matrix + deploy checklist.

**Exit criteria:** One-command deploy; CI blocks secret leaks; jobs safe on multi-instance.

---

### Phase 4 — Product quality & maintainability (Month 2)

**Goal:** Raise maintainability and UX consistency.

1. Split mega-files (Register, FamilyManage, auth actions, FamilyManager admin).  
2. Client: Error Boundary; fix Login toast; logout resets membership; refresh → `loadUser`.  
3. Admin: action-level `hasPermission` on Family/Matrimonial; fix `getFirstAllowedRoute`.  
4. Introduce Vitest (client/admin) + Supertest (server) for critical paths.  
5. Remove dead code (`getAuthToken`, SMS stub, unused aliases).  
6. Optional: shared OpenAPI or route constants package.  
7. Accessibility pass on auth + payment modals.

**Exit criteria:** Critical paths have tests; largest files under ~400 lines; no known P1 UX bugs.

---

### Phase 5 — Continuous assurance (ongoing)

**Goal:** Stay secure as the product grows.

1. Quarterly secret rotation policy; break-glass admin without hardcoded passwords.  
2. Pen-test: payment, auth, admin txn-password, hierarchy approvals.  
3. Dependency + container scanning in CI.  
4. Redis-backed rate limits / edge WAF.  
5. Mongo backup/restore drills; incident runbook.  
6. Secrets manager (DO / Vault) — no secret files on disk in repo clones.

**Exit criteria:** Documented rotation + restore drills; pen-test findings tracked to zero P0.

---

## 6. Suggested score targets after phases

| Milestone | Overall target |
|-----------|---------------:|
| After Phase 0 | **62%** |
| After Phase 1 | **70%** |
| After Phase 2 | **76%** |
| After Phase 3 | **82%** |
| After Phase 4–5 | **88%+** |

---

## 7. Evidence index (highest signal files)

| Topic | Path |
|-------|------|
| Rate limit off | `server/server.js` |
| Public payments | `server/routes/payments/paymentRoutes.js` |
| Payment core | `server/services/membershipPaymentService.js` |
| Auth cookies | `server/middleware/auth.js`, `server/utils/cookieUtils.js` |
| Password copy | `server/models/User.js`, admin Edit User / SubAdmin |
| Jobs | `server/loaders/membershipJobLoader.js` |
| Client credentials | `client/src/utils/credentialsHelper.jsx` |
| Client payments | `client/src/utils/cashfreeCheckout.js`, `paymentStatusPoller.js` |
| Admin RBAC | `admin/src/utils/permissions.js`, `PermissionEditor.jsx` |
| Secrets in git | `.env.prod`, `build/Makefile` |
| Deploy | `push-docker-images.sh`, `docker-compose.prod.yml`, `Caddyfile` |
| Tests | `server/tests/*.test.js` |

---

## 8. One-page checklist (print / pin)

- [ ] Rotate + purge secrets  
- [ ] Auth payment create/status  
- [ ] Enable rate limits + trust proxy  
- [ ] Fix webhook fail race  
- [ ] Remove passwordCopy / localStorage passwords  
- [ ] Matrimonial + PermissionEditor ACL complete  
- [ ] Unique orderId + payment integration tests  
- [ ] CI + non-root Docker + job locks  
- [ ] Health checks + Caddy fix  
- [ ] Split mega-files + Error Boundary  

---

*Generated by deep scan of admin / server / client / ops. Re-run after Phase 0–1 to refresh scores.*
