# API reference

Everything an app can send to SIS-OCC and everything it gets back. For a walkthrough, see
[Web apps](web-apps.md) or [Mobile apps](mobile-apps.md).

In the examples, SIS-OCC runs at `https://sis.example` and the app's callback URL is
`https://library.example/auth/sis/callback`.

| Endpoint | Called by | Purpose |
|---|---|---|
| [`GET /oauth/authorize`](#get-oauthauthorize) | The person's browser | Sign in and check the app's rules |
| [`POST /oauth/token`](#post-oauthtoken) | The app's server | Swap a code or refresh token for tokens |
| [`GET /api/oauth/me`](#get-apioauthme) | The app's server | Who signed in |

## Scopes

| Scope | What the person is told | Adds to `/api/oauth/me` |
|---|---|---|
| `profile` | Your name, ID number and role | `user_id_no`, `name`, `given_name`, `middle_name`, `family_name`, `role`, `active` |
| `email` | Your email address | `email` |
| `enrollment` | Your course, year level, section and whether you are enrolled this semester | `enrollment` |

An app can only receive the scopes MIS ticked for it. Ask for scopes separated by spaces
(`scope=profile enrollment`):

- A scope that exists but isn't allowed for the app is **dropped silently**.
- A scope that doesn't exist (for example `grades`) ends the sign-in with `error=invalid_scope`.
- With no `scope` at all, the token has no scopes and `/api/oauth/me` returns only `sub`.

## Lifetimes and limits

| Item | Lifetime | Notes |
|---|---|---|
| Code | 10 minutes | Works once |
| Access token | 15 minutes | Sent as `Authorization: Bearer …` |
| Refresh token | 7 days | Works once; each refresh returns a new one and ends the previous access token |
| `/oauth/token` | 60 requests a minute | Per calling IP address |
| `/api/oauth/me` | 120 requests a minute | Per person |

---

## `GET /oauth/authorize`

Send the person's **browser** here. Never call it from a server.

```
https://sis.example/oauth/authorize
    ?client_id=9b0c6f0e-…
    &redirect_uri=https%3A%2F%2Flibrary.example%2Fauth%2Fsis%2Fcallback
    &response_type=code
    &scope=profile%20enrollment
    &state=Zq3…random…
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256
```

| Parameter | Required | Value |
|---|---|---|
| `client_id` | Yes | The app's client ID |
| `redirect_uri` | Yes, if the app has more than one callback URL | One of the app's registered callback URLs, exactly. Always sending it is recommended. |
| `response_type` | Yes | `code` |
| `scope` | No | Scopes separated by spaces |
| `state` | Yes, by our rules | A random value the app stores and checks on the callback |
| `code_challenge` | Yes for apps without a secret; recommended for all | `BASE64URL(SHA256(code_verifier))`, without `=` padding |
| `code_challenge_method` | With `code_challenge` | `S256` |
| `prompt` | No | `login`: sign in again even if already signed in. `consent`: always show the "allow access?" screen. `none`: show no screens at all and answer with an error instead. |

### What the person may see

1. **The SIS-OCC sign-in page**, unless they're already signed in to SIS-OCC in that browser.
2. **A password change**, if their new account still has its first password. Afterwards they
   continue automatically.
3. **"Continue to {app}?"**, only for apps MIS didn't mark as school-owned.
4. **"You can't use {app} with this account"**, if they don't meet the rules, with the reason
   and a **Back to {app}** button.

### Responses

**Success:** the browser goes to the callback URL.

```
https://library.example/auth/sis/callback?code=def50200a1…&state=Zq3…random…
```

**Errors sent back to the callback URL**, always with the app's `state`:

| `error` | When |
|---|---|
| `access_denied` | The person doesn't meet the app's rules (after pressing **Back to {app}**), pressed **Cancel** on the "allow access?" screen, or the app is switched off |
| `invalid_scope` | The app asked for a scope that doesn't exist |
| `login_required` | `prompt=none` and the person isn't signed in to SIS-OCC |
| `consent_required` | `prompt=none` and the app needs the "allow access?" screen |

**Errors that don't go back to the app.** If SIS-OCC can't trust the callback URL, it shows a
plain error instead of redirecting:

| HTTP status | `error` | When |
|---|---|---|
| 401 | `invalid_client` | Unknown `client_id`, or a `redirect_uri` that isn't registered for the app |
| 400 | `invalid_request` | A missing or malformed parameter, for example no `code_challenge` from an app without a secret |

---

## `POST /oauth/token`

Called from the app's **server**, with `Content-Type: application/x-www-form-urlencoded`.

### Swapping a code

| Field | Value |
|---|---|
| `grant_type` | `authorization_code` |
| `client_id` | The app's client ID |
| `client_secret` | The app's client secret. Leave it out for apps without a secret. |
| `redirect_uri` | The same callback URL used on `/oauth/authorize` |
| `code` | The `code` from the callback |
| `code_verifier` | The PKCE verifier, if `code_challenge` was sent |

### Renewing with a refresh token

| Field | Value |
|---|---|
| `grant_type` | `refresh_token` |
| `client_id` | The app's client ID |
| `client_secret` | The app's client secret. Leave it out for apps without a secret. |
| `refresh_token` | The latest refresh token |
| `scope` | Optional. Leave it out to keep the same scopes; you can ask for fewer, never more. |

Refreshing doesn't re-check the app's rules, so call `/api/oauth/me` afterwards before trusting
the person again.

### Success: `200`

```json
{
  "token_type": "Bearer",
  "expires_in": 900,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9…",
  "refresh_token": "def50200b7…"
}
```

Treat both tokens as secrets. Keep them on the app's server, never in the browser or in logs.

### Errors

Errors are JSON with `error`, `error_description` and sometimes `hint`:

```json
{
  "error": "invalid_grant",
  "error_description": "The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.",
  "hint": "Authorization code has been revoked"
}
```

| HTTP status | `error` | Meaning | What the app should do |
|---|---|---|---|
| 400 | `invalid_grant` | Code or refresh token already used, expired or revoked, or `redirect_uri` / `code_verifier` doesn't match | Start the sign-in again |
| 401 | `invalid_client` | Wrong client ID or secret | Check the app's configuration; the secret may have been replaced |
| 400 | `invalid_request` | A required field is missing | Fix the request |
| 429 | | Too many requests | Wait and retry |

---

## `GET /api/oauth/me`

Called from the app's **server**.

```
GET https://sis.example/api/oauth/me
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9…
Accept: application/json
```

### Success: `200`

With the `profile`, `email` and `enrollment` scopes:

```json
{
  "sub": "1042",
  "user_id_no": "2023-00123",
  "name": "Juan Santos Dela Cruz",
  "given_name": "Juan",
  "middle_name": "Santos",
  "family_name": "Dela Cruz",
  "role": "student",
  "active": true,
  "email": "juan.delacruz@example.com",
  "enrollment": {
    "currently_enrolled": true,
    "school_year": "2026-2027",
    "semester": "First",
    "course": "Bachelor of Science in Information Technology",
    "course_code": "BSIT",
    "major": null,
    "year_level": "Third Year",
    "section": "A"
  }
}
```

| Field | Scope | Notes |
|---|---|---|
| `sub` | Always | The SIS-OCC account number, as a string. Never changes. Use it to link accounts. |
| `user_id_no` | `profile` | The school ID number. Show it, but don't link accounts with it. |
| `name` | `profile` | First, middle and last name. The ID number if SIS-OCC has no name on file. |
| `given_name`, `middle_name`, `family_name` | `profile` | Can be `null` |
| `role` | `profile` | The SIS-OCC role, such as `student`, `faculty` or `registrar` |
| `active` | `profile` | Always `true` in a successful response, because inactive accounts are refused |
| `email` | `email` | Can be `null` |
| `enrollment` | `enrollment` | `null` for anyone who isn't a student |
| `enrollment.currently_enrolled` | `enrollment` | Whether the student has an enrollment record in the school year marked current |
| `enrollment.school_year`, `semester`, `course`, `course_code`, `major`, `year_level`, `section` | `enrollment` | Only when `currently_enrolled` is `true`. Values are as recorded in SIS-OCC. |

A student who isn't enrolled this semester gets `"enrollment": {"currently_enrolled": false}`.
Only apps that don't require enrollment ever see this.

### Errors

| HTTP status | Body | Meaning | What the app should do |
|---|---|---|---|
| 401 | `{"message": "Unauthenticated."}` | The token is missing, expired or revoked | Refresh once; if that fails, sign the person out |
| 401 | `{"error": "invalid_token", "error_description": "This person can no longer use OCC Library.", "failed_checks": ["enrollment"]}` | The person no longer meets the app's rules. SIS-OCC has revoked the token. | Sign the person out |
| 401 | `{"error": "invalid_token", "error_description": "OCC Library is switched off in SIS-OCC."}` | MIS switched the app off | Sign the person out and say the app is unavailable |
| 403 | `{"code": "PASSWORD_CHANGE_REQUIRED", …}` | The person must change their SIS-OCC password first | Ask them to sign in to SIS-OCC and change it |
| 429 | | Too many requests | Wait and retry |

`failed_checks` can contain `role`, `active` and `enrollment`.

---

## About the access token

The access token is a JWT signed by SIS-OCC. Its `aud` claim is the client ID it was issued to
and its `sub` claim is the person's `sub`. Apps should treat it as opaque and ask
`/api/oauth/me`, which also applies the app's rules. Don't accept SIS-OCC tokens that were issued
to a different app.
