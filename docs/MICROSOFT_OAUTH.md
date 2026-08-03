# Microsoft (Azure AD) Sign-In — Implementation Reference

Authoritative description of how Microsoft sign-in works in the HMR Portal, written from the
code as it stands on `philmingo/main`.

> **Branch note.** This feature is **not present on `origin/main`**. The code lives on
> `philmingo/main`, `netlify-ai-fix`, and `national_assessments` (feature branch:
> `philmingo/feature/microsoft-oauth-auth`). If you check out `origin/main`, none of the files
> below exist and `/auth` still renders the legacy email + password form.

---

## 1. Summary

Microsoft is the **only** interactive sign-in method on the branches that carry this feature.
`/auth` renders a single "Sign in with MOE Account" card; the email/password form
(`components/auth-form.tsx`) was unwired from the page in `daf2086` and is now orphaned.

The implementation is a **hand-rolled OAuth 2.0 authorization-code flow spoken directly to
Azure AD**. It deliberately does *not* use:

- **Supabase Auth / `signInWithOAuth({ provider: 'azure' })`** — the original plan
  (`.github/prompts/plan-add-microsoftOAuthSignIn-hmr.prompt.md`) called for this, but the
  shipped code bypasses it. `supabaseAuth` in [lib/supabase-client.ts](../lib/supabase-client.ts)
  is a leftover from that plan and is **dead code** — nothing imports it.
- **MSAL / `@azure/msal-*`** — no Microsoft auth libraries are in `package.json`.
- **Microsoft Graph** — user identity comes from the ID token's claims, not a `/me` call.

Supabase is used purely as the database (`hmr_users`, `hmr_user_roles`, `sms_schools`,
`sms_regions`). Sessions are the app's own `user_session` cookie — the same one the legacy
password flow issued, so everything downstream (middleware, `getUser()`, permissions) was
unchanged.

---

## 2. File map

| Path | Role |
|---|---|
| `components/auth/microsoft-sign-in-card.tsx` | The only sign-in UI. Button → `getAzureOAuthUrl()` → browser redirect. |
| `app/auth/page.tsx` | Auth page shell; renders `<MicrosoftSignInCard redirectTo={…} />`. |
| `app/actions/auth.ts` | Server actions: `getAzureOAuthUrl`, `handleMicrosoftSignIn`, `handleMicrosoftSignUp`, `createMicrosoftAccount`. |
| `app/auth/callback/route.ts` | OAuth redirect target. State check, token exchange, ID-token decode, routing. |
| `app/auth/microsoft-signup/page.tsx` | Role/region selection for `@moe.gov.gy` users. |
| `app/api/microsoft-signup-data/route.ts` | One-shot read of the `microsoft_signup_data` cookie for the page above. |
| `lib/school-type.ts` | `getHeadTeacherEmailInfo()` — parses `hm.<code>@moe.edu.gy`. |
| `middleware.ts` | Whitelists `/auth/callback`; role-based route guarding. |
| `database/add_auth_method_column.sql` | Adds `hmr_users.auth_method`. |
| `database/add_last_signin_method_column.sql` | Adds `hmr_users.last_signin_method` + index. |

---

## 3. End-to-end flow

```
Browser                     Next.js server                    Azure AD
   │                              │                               │
   │ click "Sign in"              │                               │
   ├─── server action ───────────▶│ getAzureOAuthUrl(cb,'signin')  │
   │                              │  • state = UUID                │
   │                              │  • Set-Cookie oauth_state (10m)│
   │                              │  • Set-Cookie oauth_mode  (10m)│
   │◀── { url } ──────────────────┤                               │
   │                                                              │
   ├──── window.location = /{tenant}/oauth2/v2.0/authorize ───────▶│
   │                                                    (account picker)
   │◀─── 302 → /auth/callback?code=…&state=… ─────────────────────┤
   │                              │                               │
   ├── GET /auth/callback ───────▶│ compare state vs cookie        │
   │                              │ delete oauth_state/oauth_mode  │
   │                              ├── POST /oauth2/v2.0/token ────▶│
   │                              │◀── { id_token, … } ────────────┤
   │                              │ decode ID token → email, name  │
   │                              │ handleMicrosoftSignIn(email)   │
   │                              │  • lookup hmr_users            │
   │                              │  • Set-Cookie user_session (7d)│
   │◀── 302 → /dashboard/<role> ──┤                               │
```

### 3.1 Initiation — `getAzureOAuthUrl(redirectTo, mode)`

[app/actions/auth.ts:560](../app/actions/auth.ts#L560)

- Reads `AZURE_AD_CLIENT_ID`; returns `{ url: null, error: "Microsoft sign-in is not configured" }` if unset.
- Generates a random `state` (UUID v4 via `Math.random`, not `crypto`).
- Sets two httpOnly cookies, 10-minute TTL: `oauth_state` (CSRF) and `oauth_mode` (`signin` | `signup`).
- Builds `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize` with:

  | Param | Value |
  |---|---|
  | `client_id` | `AZURE_AD_CLIENT_ID` |
  | `response_type` | `code` |
  | `redirect_uri` | `${NEXT_PUBLIC_SITE_URL}/auth/callback` (falls back to the caller-supplied origin) |
  | `response_mode` | `query` |
  | `scope` | `openid email profile` |
  | `state` | the generated UUID |
  | `prompt` | `select_account` |

`prompt=select_account` is deliberate (added in `7e4feb3`): it always shows the account picker so
a user who landed on "pending approval" with the wrong account can retry with the right one.

`NEXT_PUBLIC_SITE_URL` is forced for `redirect_uri` so Netlify's internal deploy URL never leaks
into the Azure redirect — a mismatch there produces `AADSTS50011`.

### 3.2 Callback — `GET /auth/callback`

[app/auth/callback/route.ts](../app/auth/callback/route.ts)

1. **Azure-side errors** (`?error=`) are mapped to plain-language messages before redirecting to
   `/auth?error=…`:
   - `access_denied` / `AADSTS65004` / "declined" → "Sign-in was cancelled…"
   - `AADSTS50105` → "Your account is not authorized to use this application…"
   - `AADSTS700016` → "Application configuration error…"
2. **CSRF check** — `state` query param must equal the `oauth_state` cookie, else
   "Sign-in session expired." Both `oauth_state` and `oauth_mode` are then deleted.
3. **Token exchange** — server-to-server `POST` to
   `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` with
   `grant_type=authorization_code`, the client secret, and the same `redirect_uri`.
4. **Identity extraction** — `decodeJwtPayload()` base64url-decodes the ID token payload
   (**signature is not verified** — see §8). Email is taken from
   `claims.email ?? claims.preferred_username ?? claims.upn`; display name from `claims.name`.
5. **Dispatch** on the `oauth_mode` cookie → sign-in or sign-up branch.

### 3.3 Sign-in branch — `handleMicrosoftSignIn(email, name)`

[app/actions/auth.ts:606](../app/actions/auth.ts#L606)

- Rejects any address not ending in `@moe.gov.gy` or `@moe.edu.gy`.
- Looks up `hmr_users` by email with `.is("deleted_at", null)`, joining `hmr_user_roles`.
- **No account?** Returns `code: "USER_NOT_FOUND"`. Since `2e19bc3` the callback does *not*
  surface this as an error — it transparently calls `handleMicrosoftSignUp()` and routes the
  user into account creation. This is why there is no separate "Create account" button.
- **Unverified?** Blocked with "Your account is pending admin verification" — *except* for
  `Head Teacher` and `Admin`, which are exempt.
- Enriches the session with `sms_regions.name` and `sms_schools.name`.
- Writes `last_access_at` and `last_signin_method = 'azure_ad'` back to `hmr_users`.
- Sets the `user_session` cookie (§5) and returns a role-based `redirectUrl`.
- Kicks off `refreshRegionalTopPerformersCache()` without awaiting it.

### 3.4 Sign-up branch — `handleMicrosoftSignUp(email, name)`

[app/actions/auth.ts:730](../app/actions/auth.ts#L730)

Domain determines the path:

**`@moe.edu.gy` (Head Teachers) — fully automatic, no forms.**

1. `getHeadTeacherEmailInfo()` matches `/^hm\.([^@\s]+)@moe\.edu\.gy$/i` and upper-cases the
   captured school code. So `hm.pr12345@moe.edu.gy` → code `PR12345`.
2. `sms_schools` is queried with `.ilike("code", schoolCode).limit(1)` — case-insensitive, and
   `limit(1)` tolerates duplicate rows. No match → `code: "SCHOOL_NOT_FOUND"` with the code echoed
   back in the message.
3. A `hmr_users` row is inserted with `password: null`, the Head Teacher role UUID, the resolved
   `school_id`, and **`is_verified: true`** — Head Teachers are auto-approved.
4. Session cookie is set immediately; user lands on `/dashboard/head-teacher`.

**`@moe.gov.gy` (officers) — needs role selection.**

Returns `{ requiresRoleSelection: true, email, name }`. **No database row is created yet.** The
callback stores `{ email, name }` in a `microsoft_signup_data` httpOnly cookie (15 min) and
redirects to `/auth/microsoft-signup`.

Both paths first check for an existing non-deleted account and return `code: "USER_EXISTS"`.

### 3.5 Role selection — `/auth/microsoft-signup`

[app/auth/microsoft-signup/page.tsx](../app/auth/microsoft-signup/page.tsx)

- On mount, `GET /api/microsoft-signup-data` returns the cookie's JSON **and deletes the cookie**
  (one-time use). A 401 bounces the user back to `/auth?error=Sign-up+session+expired…`.
- Regions are fetched client-side from `sms_regions` via the anon Supabase client.
- The form collects: name (pre-filled from the ID token, editable), role
  (`Education Official` | `Regional Officer`), and region — required only for Regional Officers.
- Submit calls `createMicrosoftAccount()` ([app/actions/auth.ts:863](../app/actions/auth.ts#L863)), which
  re-validates the `@moe.gov.gy` domain and the region requirement server-side, resolves the role
  UUID, and inserts with `password: null`, **`is_verified: false`**, and
  `verification_requested_at`. It then inserts a `notifications` row of type
  `user_verification_request` carrying `auth_method: 'microsoft'` so admins see it at
  `/dashboard/admin/verifications`.
- Success shows a "pending approval" panel. Its "Back to Sign In" button calls `signOut()` before
  navigating (added in `7e4feb3`) so a stale cookie can't strand the user.

Note the asymmetry: `handleMicrosoftSignUp` returns `role` choices of Regional Officer /
Education Official only. Head Teachers never see this page, and `Admin` accounts cannot be
self-created at all.

---

## 4. Roles and verification

| Domain | Role | Created by | Auto-verified | Lands on |
|---|---|---|---|---|
| `hm.<code>@moe.edu.gy` | Head Teacher | Automatic on first sign-in | **Yes** | `/dashboard/head-teacher` |
| `@moe.gov.gy` | Regional Officer | Role-selection form | No — admin approval | `/dashboard/regional-officer` |
| `@moe.gov.gy` | Education Official | Role-selection form | No — admin approval | `/dashboard/education-official` |
| — | Admin | Seeded/manual only | n/a (verification bypassed) | `/dashboard/admin` |

Approval is granted from `/dashboard/admin/verifications`; `app/actions/admin.ts` sends an
approval email telling the user they "can now sign in using your Ministry of Education Microsoft
account."

---

## 5. Session model

Both Microsoft and the legacy password flow issue the identical cookie, which is why no
downstream code needed changing:

```ts
cookieStore.set("user_session", JSON.stringify({
  id, name, email, role,          // role is the role *name* string, e.g. "Head Teacher"
  region, region_name,
  school_id, school_name,
  is_verified, created_at,
}), {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 7,       // 7 days
})
```

- `getUser()` ([app/actions/auth.ts:439](../app/actions/auth.ts#L439)) simply `JSON.parse`s this cookie.
- `middleware.ts` parses it to gate `/dashboard/*` by `role`, and whitelists `/auth/callback`
  so the OAuth return trip isn't bounced to `/auth`.
- `lib/permissions.ts` takes only `user.id` from the cookie and re-reads the role and permission
  keys from the database (60 s TTL cache), so fine-grained permission checks are DB-backed.
- `signOut()` deletes the cookie. There is **no** Azure AD single-logout call — the Microsoft
  session in the browser survives, which is why `prompt=select_account` matters on the next login.

### Cookies used

| Cookie | TTL | Purpose |
|---|---|---|
| `oauth_state` | 10 min | CSRF token, compared in the callback |
| `oauth_mode` | 10 min | `signin` or `signup` |
| `microsoft_signup_data` | 15 min | `{ email, name }` handed to the role-selection page; deleted on first read |
| `user_session` | 7 days | The application session |

---

## 6. Database changes

```sql
-- database/add_auth_method_column.sql
ALTER TABLE hmr_users ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'password';
UPDATE hmr_users SET auth_method = 'password' WHERE auth_method IS NULL;

-- database/add_last_signin_method_column.sql
ALTER TABLE hmr_users ADD COLUMN IF NOT EXISTS last_signin_method TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_hmr_users_last_signin_method ON hmr_users(last_signin_method);
```

Both are run manually in the Supabase SQL editor — there is no migration runner.

- `last_signin_method` is the one actually written at runtime: `'azure_ad'` on Microsoft sign-in,
  `NULL` for legacy password sign-in. The admin user list filters on it (`getUsers(..., signinMethod)`
  in `app/actions/admin.ts`, exposed via `components/admin/user-filters.tsx`).
- `auth_method` is declared but never written by the OAuth code — effectively unused.
- `hmr_users.password` is `NULL` for every Microsoft-created account. Any code path that assumes a
  bcrypt hash must tolerate `NULL`.

---

## 7. Configuration

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `AZURE_AD_CLIENT_ID` | Yes | Missing → the sign-in button reports "Microsoft sign-in is not configured". |
| `AZURE_AD_CLIENT_SECRET` | Yes | Server-only. Used solely in the token exchange. |
| `AZURE_AD_TENANT_ID` | Recommended | Falls back to a **hardcoded** tenant `81e1ae65-e4cb-4478-97da-f1e72ccc58ce` in both `getAzureOAuthUrl` and the callback. |
| `NEXT_PUBLIC_SITE_URL` | Yes in deployed envs | Forces `redirect_uri` to the real domain instead of a Netlify/Vercel internal URL. |

None of these are in the checked-in `.env.local` on `main` — that file currently holds only
Supabase, SendGrid, and DeepSeek keys, so the Azure values must be added per environment.

### Azure AD app registration

1. Azure Portal → Entra ID → App registrations → New registration.
2. Single tenant.
3. Platform **Web**, redirect URIs:
   - `https://<production-domain>/auth/callback`
   - `http://localhost:3000/auth/callback`
4. Copy Application (client) ID and Directory (tenant) ID.
5. Certificates & secrets → new client secret → `AZURE_AD_CLIENT_SECRET`.
6. Scopes requested are `openid email profile` only. `User.Read` / Graph is not needed, since
   identity is read from ID-token claims.

The tenant must issue an `email`, `preferred_username`, or `upn` claim; if all three are absent
the callback fails with "No email received from Microsoft".

---

## 8. Security notes

Accurate as of `philmingo/main` — listed so they're a deliberate choice rather than a surprise.

- **The ID token signature is not verified.** `decodeJwtPayload()` only base64url-decodes the
  payload. This is the accepted OIDC exception: the token arrives on a direct server-to-server
  TLS call to the tenant's token endpoint, so it isn't attacker-supplied. It would become unsafe
  if the flow were ever changed to accept an ID token from the browser (implicit/hybrid).
- **`nonce` is not sent or checked.** Only `state` is. Adequate for pure authorization-code flow.
- **`state` uses `Math.random()`**, not `crypto.randomUUID()` / `crypto.getRandomValues()` — the
  same `generateUUID()` helper also mints user primary keys.
- **The session cookie is unsigned plaintext JSON.** `httpOnly` blocks JavaScript, but the value
  is trusted verbatim for `id` and `role` by `getUser()` and `middleware.ts`. Route-level role
  gating therefore rests on cookie integrity, not a signature. `lib/permissions.ts` is the safer
  path since it re-reads the role from the database using only `id`. `jose` and `jsonwebtoken`
  are already dependencies if this is ever moved to a signed token.
- **Domain allow-listing is the authorization boundary** for account creation
  (`@moe.gov.gy` / `@moe.edu.gy`), enforced server-side in both `handleMicrosoftSignIn` and
  `handleMicrosoftSignUp`. Restricting the Azure app to a single tenant is the second layer.
- **Head Teacher accounts self-provision with no human approval.** Anyone who controls an
  `hm.<code>@moe.edu.gy` mailbox matching a row in `sms_schools` gets an immediately verified
  account bound to that school.
- **No Azure AD sign-out.** `signOut()` clears only the local cookie.

---

## 9. Troubleshooting

| Symptom | Cause |
|---|---|
| `AADSTS50011: Reply URL does not match` | `NEXT_PUBLIC_SITE_URL` doesn't match a redirect URI registered in Azure (protocol and trailing path must match exactly). |
| "Microsoft sign-in is not configured" | `AZURE_AD_CLIENT_ID` unset in that environment. |
| "Sign-in session expired. Please try again." | `oauth_state` cookie missing or mismatched — >10 min on the Microsoft page, cookies blocked, or a cross-domain hop caused by an unset `NEXT_PUBLIC_SITE_URL`. |
| "Sign-up session expired" on `/auth/microsoft-signup` | `microsoft_signup_data` already consumed (the API deletes it on first read — a page refresh triggers this) or >15 min elapsed. |
| `We couldn't find a school with code "X"` | No `sms_schools.code` matches the segment between `hm.` and `@moe.edu.gy`. Check `SELECT * FROM sms_schools WHERE code ILIKE 'X';`. |
| Officer stuck on "pending admin verification" | Expected until approved at `/dashboard/admin/verifications`. |
| Head Teacher email that isn't `hm.<something>@` | Falls through to the role-selection page, which then rejects it — `createMicrosoftAccount` only accepts `@moe.gov.gy`. |

---

## 10. Known loose ends

- `lib/supabase-client.ts` exports `supabaseAuth` (a `persistSession: true` client created for the
  abandoned Supabase-Auth approach). Nothing imports it — safe to delete.
- `components/auth-form.tsx` (~1000 lines of email/password, OTP, and forgot-password UI) is no
  longer reachable from `/auth`, but the supporting server actions (`signIn`, `signUp`,
  `changeDefaultPassword`) and the `/api/forgot-password`, `/api/reset-password`,
  `/api/send-verification-code`, `/api/verify-code` routes all still exist and still work.
- `hmr_users.auth_method` is created by migration but never written.
- The previous revision of this document described a Microsoft Graph `/me` call, a manually
  entered school code, a `password_hash` column, and "Sign up with Microsoft" as a separate
  button. None of those match the shipped code; this revision replaces it.
