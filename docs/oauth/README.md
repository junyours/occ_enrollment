# Continue with SIS-OCC

SIS-OCC is the login provider for the school's other systems (library, CSG election, and so on).
A school app sends people to SIS-OCC to sign in. SIS-OCC checks them against the rules MIS set
for that app (role, active account, enrolled this semester) and only then tells the app who they are.
The app never sees passwords.

This guide has two parts:

- [For app developers](#for-app-developers): how to add "Continue with SIS-OCC" to an app.
- [For SIS administrators](#for-sis-administrators): setting up the server and registering apps.

---

## For app developers

### 1. Get your app registered

Ask the MIS office to register the app under **Connected apps**. They need:

| What | Example |
|---|---|
| App name (students see it) | OCC Library |
| Callback URL(s), exact | `https://library.occ.edu.ph/auth/sis/callback` |
| Does the app have its own server? | Yes: you get a client secret. No (mobile or browser-only app): no secret, PKCE required. |
| Who may sign in | Students and faculty |
| Must students be enrolled this semester? | No |
| What data the app needs | `profile`, `enrollment` |

You get a **client ID** and, for apps with a server, a **client secret**. The secret is shown once.
Put both in the app server's `.env`. Never put the secret in browser JavaScript, a mobile app or Git.
If you're listed as a maintainer, you can see the app and issue a new secret under **My apps** in SIS-OCC.

### 2. Endpoints

Replace `https://sis.example` with the SIS-OCC address.

| Purpose | Method and URL |
|---|---|
| Send the person to sign in | `GET https://sis.example/oauth/authorize` |
| Swap a code or refresh token for tokens | `POST https://sis.example/oauth/token` |
| Who signed in | `GET https://sis.example/api/oauth/me` |

### 3. Data you can ask for (scopes)

| Scope | Adds to `/api/oauth/me` |
|---|---|
| `profile` | `user_id_no`, `name`, `given_name`, `middle_name`, `family_name`, `role`, `active` |
| `email` | `email` |
| `enrollment` | `enrollment` (students only; `null` for other roles) |

`sub` is always included. Scopes your app isn't registered for are silently dropped.
Grades, addresses, billing and parents' details are never available.

### 4. The sign-in flow

#### Step 1: send the browser to SIS-OCC

Create a random `state` and a PKCE pair, keep both in the person's session, then redirect:

```
GET https://sis.example/oauth/authorize
    ?client_id=CLIENT_ID
    &redirect_uri=https%3A%2F%2Flibrary.occ.edu.ph%2Fauth%2Fsis%2Fcallback
    &response_type=code
    &scope=profile%20enrollment
    &state=RANDOM_STATE
    &code_challenge=BASE64URL(SHA256(CODE_VERIFIER))
    &code_challenge_method=S256
```

- `redirect_uri` must match a registered callback URL exactly.
- PKCE (`code_challenge`) is required for apps without a secret and recommended for every app.
- Optional `prompt`: `login` forces a fresh SIS-OCC sign-in, `none` returns an error instead of
  showing any screen, `consent` always shows the "allow access?" screen.

SIS-OCC signs the person in (or reuses their SIS-OCC session) and checks the app's rules.

#### Step 2: handle the callback

Success:

```
https://library.occ.edu.ph/auth/sis/callback?code=AUTH_CODE&state=RANDOM_STATE
```

Refused, or the person cancelled:

```
https://library.occ.edu.ph/auth/sis/callback?error=access_denied&error_description=...&state=RANDOM_STATE
```

Always check that `state` matches the one you stored, and reject the callback if it doesn't.
The code works once and expires after 10 minutes.

#### Step 3: swap the code for tokens (server to server)

```
POST https://sis.example/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id=CLIENT_ID
&client_secret=CLIENT_SECRET        (omit for apps without a secret)
&redirect_uri=https://library.occ.edu.ph/auth/sis/callback
&code=AUTH_CODE
&code_verifier=CODE_VERIFIER
```

```json
{
  "token_type": "Bearer",
  "expires_in": 900,
  "access_token": "eyJ0eXAiOiJKV1Qi...",
  "refresh_token": "def50200..."
}
```

Access tokens last 15 minutes. Refresh tokens last 7 days and can be used once: each refresh
returns a new refresh token.

#### Step 4: ask who signed in

```
GET https://sis.example/api/oauth/me
Authorization: Bearer ACCESS_TOKEN
Accept: application/json
```

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

A student who isn't enrolled this semester gets `"enrollment": {"currently_enrolled": false}`
(only possible for apps that don't require enrollment).

#### Renewing the access token

```
POST https://sis.example/oauth/token

grant_type=refresh_token
&client_id=CLIENT_ID
&client_secret=CLIENT_SECRET
&refresh_token=REFRESH_TOKEN
&scope=profile enrollment
```

### 5. Rules your app must follow

1. **Link accounts by `sub`.** It's the SIS-OCC account ID and never changes. Show `user_id_no`,
   but don't use it as the link.
2. **Treat a `401` from `/api/oauth/me` as "sign this person out".** SIS-OCC checks the app's
   rules on every call. A deactivated account, a removed enrollment, or an app MIS switched off
   all return `401` with `"error": "invalid_token"`.
3. **Call `/api/oauth/me` at every sign-in** and again whenever you need fresh enrollment data.
   Don't keep enrollment status for longer than a session.
4. **Keep the client secret on the server**, in `.env`. If it leaks, a maintainer issues a new one
   under **My apps** and you update `.env`.
5. **Check `state` on every callback**, and use PKCE.

### 6. Errors

| Where | Response | Meaning |
|---|---|---|
| Callback | `error=access_denied` | The person doesn't meet the app's rules, cancelled, or the app is switched off. Show a friendly message. |
| `/oauth/authorize` | `401 invalid_client` error, no redirect back | The `client_id` or `redirect_uri` isn't registered. Check the app's configuration. |
| `/oauth/token` | `400 invalid_grant` | Code already used, expired, or `redirect_uri` / `code_verifier` doesn't match. Start the sign-in again. |
| `/oauth/token` | `401 invalid_client` | Wrong client ID or secret. |
| `/api/oauth/me` | `401 invalid_token` | Token expired, revoked, or the person no longer qualifies. Refresh once; if it fails, sign the person out. |
| `/api/oauth/me` | `403 PASSWORD_CHANGE_REQUIRED` | The person must change their SIS-OCC password first. |

### 7. Example: a Laravel app

No extra package needed. `.env`:

```dotenv
SIS_OCC_URL=https://sis.example
SIS_OCC_CLIENT_ID=your-client-id
SIS_OCC_CLIENT_SECRET=your-client-secret
SIS_OCC_REDIRECT_URI=https://library.occ.edu.ph/auth/sis/callback
```

`config/services.php`:

```php
'sis_occ' => [
    'url' => env('SIS_OCC_URL'),
    'client_id' => env('SIS_OCC_CLIENT_ID'),
    'client_secret' => env('SIS_OCC_CLIENT_SECRET'),
    'redirect' => env('SIS_OCC_REDIRECT_URI'),
],
```

`routes/web.php`:

```php
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

Route::get('/auth/sis/redirect', function (Request $request) {
    $config = config('services.sis_occ');
    $state = Str::random(40);
    $verifier = Str::random(64);
    $request->session()->put(['sis_state' => $state, 'sis_verifier' => $verifier]);

    return redirect($config['url'].'/oauth/authorize?'.http_build_query([
        'client_id' => $config['client_id'],
        'redirect_uri' => $config['redirect'],
        'response_type' => 'code',
        'scope' => 'profile enrollment',
        'state' => $state,
        'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='),
        'code_challenge_method' => 'S256',
    ], '', '&', PHP_QUERY_RFC3986));
})->name('sis.redirect');

Route::get('/auth/sis/callback', function (Request $request) {
    $config = config('services.sis_occ');
    $state = $request->session()->pull('sis_state');

    abort_unless($state && hash_equals($state, (string) $request->query('state')), 403);

    if ($request->filled('error')) {
        return redirect('/login')->withErrors(['sis' => 'SIS-OCC didn\'t allow this sign-in.']);
    }

    $tokens = Http::asForm()->acceptJson()->post($config['url'].'/oauth/token', [
        'grant_type' => 'authorization_code',
        'client_id' => $config['client_id'],
        'client_secret' => $config['client_secret'],
        'redirect_uri' => $config['redirect'],
        'code' => $request->query('code'),
        'code_verifier' => $request->session()->pull('sis_verifier'),
    ])->throw()->json();

    $me = Http::withToken($tokens['access_token'])->acceptJson()
        ->get($config['url'].'/api/oauth/me')->throw()->json();

    $user = User::updateOrCreate(
        ['sis_user_id' => $me['sub']],
        ['name' => $me['name'], 'student_id' => $me['user_id_no']],
    );

    Auth::login($user);
    $request->session()->regenerate();

    return redirect()->intended('/');
});
```

Add a `sis_user_id` column (unique) to the app's own `users` table.

---

## For SIS administrators

### Server setup

1. PHP needs the `sodium` and `openssl` extensions (`php -m`). On XAMPP, enable `extension=sodium`
   in `php.ini` and restart Apache.
2. Run the migrations: `php artisan migrate` (creates the `oauth_*` tables).
3. Create the signing keys once per server: `php artisan passport:keys`. They're written to
   `storage/oauth-private.key` and `storage/oauth-public.key` (ignored by Git). On hosting where
   files are awkward, put them in `.env` as `PASSPORT_PRIVATE_KEY` and `PASSPORT_PUBLIC_KEY`
   instead. Keep the same keys across deploys: new keys sign everyone out of every app.
4. Make sure the scheduler runs (`php artisan schedule:run` every minute). It purges expired and
   revoked tokens daily at 02:30.
5. Serve SIS-OCC over https.

### Registering an app (MIS)

**Connected apps** in the MIS menu:

- **Register app**: name, callback URLs, whether it has a server, who may sign in, enrollment
  requirement, data it may read, and whether it's school-owned (skips the "allow access?" screen).
- The client secret is shown once after registering. Give it to the app's developer securely.
- **Maintainers**: add people by ID number. They see the app under **My apps** and can issue a
  new secret. Only MIS can change who may sign in or the callback URLs.
- **Switch off** signs everyone out of the app and blocks new sign-ins until it's switched on.
- Removing a role or a scope, or turning on the enrollment requirement, signs everyone out of
  the app so they're checked against the new rules.

Every sign-in, blocked attempt and change is recorded in the activity log (actions starting
with `oauth.`) and shown on the app's page.

### How the rules are enforced

| When | What SIS-OCC checks |
|---|---|
| `/oauth/authorize` | App switched on; role allowed; account active; for apps that require it, enrolled in the school year marked current. No code is issued if any check fails. |
| Every `/api/oauth/me` call | The same checks again. A failure revokes the token and returns `401`. |
| Account deactivated | All the person's app tokens are revoked. |
| Role changed, enrollment deleted | Tokens for apps the person no longer qualifies for are revoked. |

### Code map

| Piece | Where |
|---|---|
| OAuth routes (`/oauth/*`) | `routes/oauth.php`, loaded in `bootstrap/app.php` |
| Sign-in rules on `/oauth/authorize` | `app/Http/Middleware/EnforceOAuthClientPolicy.php` |
| The rules themselves | `app/Services/OAuth/AccessPolicy.php` |
| `/api/oauth/me` | `app/Http/Controllers/OAuth/UserInfoController.php`, `app/Services/OAuth/UserInfo.php` |
| Revocation | `app/Services/OAuth/TokenRevoker.php`, hooks in `AppServiceProvider::configureOAuth()` |
| MIS registry, My apps | `app/Http/Controllers/Mis/OAuthAppController.php`, `app/Http/Controllers/OAuth/MyAppsController.php` |
| Bearer-token user model | `app/Models/OAuth/OAuthUser.php` (kept apart from Sanctum's `User` for the mobile app) |
| Tests | `tests/Feature/OAuth/ContinueWithSisOccTest.php` |

---

## More guides

Longer guides for each reader, added alongside this one:

| Guide | For |
|---|---|
| [Overview](overview.md) | How a sign-in works, a glossary, what SIS-OCC guarantees, and current limitations |
| [MIS guide](mis-guide.md) | Registering apps and helping someone who can't sign in |
| [Web apps](web-apps.md) | A full Laravel example with error handling and re-checking |
| [Mobile apps](mobile-apps.md) | React Native with a Laravel backend |
| [Development and testing](development.md) | Testing an app before it goes live, including on phones |
| [API reference](api-reference.md) | Every parameter, field, error and limit |
| [Server setup](server-setup.md) | Keys, the scheduler, logs and the code map in more detail |
