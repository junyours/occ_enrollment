# Server setup

Installing and maintaining "Continue with SIS-OCC" on an SIS-OCC server. For registering apps,
see the [MIS guide](mis-guide.md).

## Requirements

- Everything SIS-OCC already needs; see the project [README](../../README.md#requirements).
- The PHP extensions `sodium` and `openssl`. Check with `php -m`. On XAMPP, remove the `;` from
  `;extension=sodium` in `php.ini` and restart Apache. Most Linux PHP builds include both.
- https. Codes and tokens travel in URLs and headers, so production must not use plain http.

## Installing or upgrading

1. Install dependencies, which include Laravel Passport:

   ```powershell
   composer install --no-dev --optimize-autoloader
   ```

2. Create the tables:

   ```powershell
   php artisan migrate
   ```

3. Create the signing keys, **once per server**:

   ```powershell
   php artisan passport:keys
   ```

4. Make sure the scheduler runs every minute. It deletes old codes and tokens daily at 02:30
   (`passport:purge --hours=168`). On Linux:

   ```
   * * * * * cd /path/to/sis && php artisan schedule:run >> /dev/null 2>&1
   ```

   On Windows, use Task Scheduler to run `php artisan schedule:run` every minute.

5. Set `APP_URL` to the public https address. The endpoints shown to app developers are built from it.

### The signing keys

`passport:keys` writes `storage/oauth-private.key` and `storage/oauth-public.key`. Git ignores
them (`/storage/*.key`).

- **Permissions on Linux:** if other users can read the key files, Passport raises an error
  that stops sign-ins. It accepts 400, 440, 600, 640 or 660. Use `chmod 600 storage/oauth-*.key`,
  owned by the web server's user.
- **Keys in `.env` instead:** where files are awkward, set the keys as environment variables.
  `\n` sequences are turned into line breaks:

  ```dotenv
  PASSPORT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----"
  PASSPORT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBI...\n-----END PUBLIC KEY-----"
  ```

- **Keep the same keys across deploys**, and back them up with the server's other secrets.

What changing a key does:

| Change | Effect |
|---|---|
| New Passport keys | Every access token stops working. Apps get `401` and renew with their refresh token, so most people don't notice. |
| New `APP_KEY` | Codes and refresh tokens stop working too, as do SIS-OCC's own sessions. Everyone signs in again everywhere. |

## How the rules are enforced

| When | What SIS-OCC does |
|---|---|
| `/oauth/authorize`, after sign-in | Checks that the app is switched on, the role is allowed, the account is active and, if required, the student has an enrollment record in the school year marked current. No code is issued if any check fails. |
| "Allow" on the consent screen | Checks the same rules again |
| Every `/api/oauth/me` call | Checks the same rules again. On failure it revokes the token and answers `401`. |
| An account is deactivated | Revokes all of that person's tokens and codes |
| A role changes, or an enrollment is deleted | Revokes that person's tokens for apps they no longer qualify for |
| MIS switches an app off, or tightens its rules | Revokes all of the app's tokens |

Revocation runs from model events, so a change made directly in the database (outside Eloquent)
doesn't revoke anything. The re-check on `/api/oauth/me` still refuses the person the next time
the app asks.

When SIS-OCC is in maintenance mode, `/oauth/authorize` follows the same rules as the rest of
SIS-OCC: roles blocked by maintenance mode can't sign in to other apps either.

## Records and logs

| Where | What |
|---|---|
| `activity_logs`, actions starting with `oauth.` | `sign_in_allowed`, `sign_in_blocked` (with `failed_checks`), `tokens_revoked`, `app_registered`, `app_updated`, `secret_rotated`, `app_suspended`, `app_activated`, `maintainer_added`, `maintainer_removed` |
| `user_logs` | Each `/api/oauth/me` call, like any other signed-in request. Expect one row per person every time an app re-checks. |
| `oauth_access_tokens`, `oauth_refresh_tokens`, `oauth_auth_codes` | Token IDs, scopes, expiry and revocation. Never the tokens themselves. |
| `oauth_clients` | Registered apps. Client secrets are stored hashed. |

## Limits

| Endpoint | Limit |
|---|---|
| `POST /oauth/token` | 60 requests a minute per calling IP address |
| `GET /api/oauth/me` | 120 requests a minute per person |

## Code map

| Piece | Where |
|---|---|
| OAuth routes (`/oauth/*`) | `routes/oauth.php`, loaded in `bootstrap/app.php` |
| `/api/oauth/me` route | `routes/api.php` |
| MIS **Connected apps** routes | `routes/MisRoute.php` |
| **My apps** routes | `routes/OAuthAppsRoute.php` |
| Passport settings, revocation hooks | `AppServiceProvider::configureOAuth()` |
| Rules check on `/oauth/authorize` | `app/Http/Middleware/EnforceOAuthClientPolicy.php` |
| The rules | `app/Services/OAuth/AccessPolicy.php` |
| `/api/oauth/me` | `app/Http/Controllers/OAuth/UserInfoController.php`, `app/Services/OAuth/UserInfo.php` |
| Scopes | `app/Services/OAuth/Scopes.php` |
| Revoking tokens | `app/Services/OAuth/TokenRevoker.php` |
| Registering and changing apps | `app/Services/OAuth/ClientRegistrar.php` |
| MIS and My apps controllers | `app/Http/Controllers/Mis/OAuthAppController.php`, `app/Http/Controllers/OAuth/MyAppsController.php` |
| Models | `app/Models/OAuth/` (`Client`, `ClientSetting`, `OAuthUser`) |
| Pages | `resources/js/Pages/Mis/OAuthApps/`, `resources/js/Pages/OAuth/`, `resources/js/Components/OAuth/` |
| Tables | `database/migrations/2026_11_20_1702*_create_oauth_*` and `..._170300_create_oauth_client_settings_tables.php` |
| Tests | `tests/Feature/OAuth/ContinueWithSisOccTest.php` |

### Why there are two user models

Bearer tokens on `/api/oauth/me` resolve to `App\Models\OAuth\OAuthUser`, which reads the same
`users` table as `App\Models\User`. Passport's and Sanctum's `HasApiTokens` traits define the same
methods differently, so they can't share a model. Sanctum keeps serving the SIS mobile app and CSG
attendance through `User`.

## Upgrading Passport

Passport's own routes are switched off (`Passport::ignoreRoutes()`), and `routes/oauth.php`
registers only what SIS-OCC uses, plus the rules check. After upgrading Passport:

1. Compare `vendor/laravel/passport/routes/web.php` with `routes/oauth.php`.
2. Check Passport's upgrade guide for database changes. Its migrations were published into
   `database/migrations` when it was installed.
3. Run `php artisan test --filter=ContinueWithSisOccTest`.
