# Web apps

How to add "Continue with SIS-OCC" to a web app. The example is a Laravel app, but the steps are
the same in any language. Endpoint details are in the [API reference](api-reference.md).

In the examples, SIS-OCC runs at `https://sis.example` and the app at `https://library.example`.

## 1. Get the app registered

Ask the MIS office to register the app; the [MIS guide](mis-guide.md#before-you-register-an-app)
lists what they'll ask for. The two addresses that matter:

- **Website:** where people use the app (its frontend). Information only.
- **Callback URL:** the route on the app's **server** that receives the sign-in code, such as
  `https://library.example/auth/sis/callback`. If the frontend and backend are separate, this is
  the backend's address. The backend holds the client secret, and the secret is needed to use
  the code.

You receive a **client ID** and a **client secret**. The secret is shown to MIS once, so store it
straight away in the app server's `.env`. It must never reach the browser, a mobile app or Git.

While the app is being built, test against a copy of SIS-OCC instead; see
[Development and testing](development.md).

## 2. How the sign-in works

1. **Start:** the app creates a random `state` and a PKCE verifier, keeps both in the person's
   session, and redirects the browser to `/oauth/authorize`.
2. **SIS-OCC:** the person signs in (or is already signed in), and SIS-OCC checks the app's rules.
3. **Callback:** SIS-OCC sends the browser to the callback URL with `code` and `state`, or with
   `error=access_denied`.
4. **Swap:** the app's server checks `state` and swaps the code at `/oauth/token`, using its
   secret and the verifier.
5. **Who is it:** the app's server calls `/api/oauth/me`, finds or creates its own account by
   `sub`, and signs the person in.
6. **Later:** at most every 15 minutes, the app renews the token and calls `/api/oauth/me` again.
   If SIS-OCC refuses, the app signs the person out.

## 3. Laravel example

### Configuration

`.env`:

```dotenv
SIS_OCC_URL=https://sis.example
SIS_OCC_CLIENT_ID=9b0c6f0e-...
SIS_OCC_CLIENT_SECRET=...
SIS_OCC_REDIRECT_URI=https://library.example/auth/sis/callback
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

### Users table

The app keeps its own `users` table and links each row to SIS-OCC by `sub`:

```php
// database/migrations/xxxx_add_sis_occ_to_users_table.php
Schema::table('users', function (Blueprint $table) {
    $table->string('sis_user_id')->nullable()->unique(); // SIS-OCC "sub"
    $table->string('student_id')->nullable();            // SIS-OCC "user_id_no", for display
    $table->text('sis_refresh_token')->nullable();       // stored encrypted

    // Only if everyone signs in through SIS-OCC and has no password in this app:
    $table->string('email')->nullable()->change();
    $table->string('password')->nullable()->change();
});
```

On the `User` model, add `sis_user_id`, `student_id` and `sis_refresh_token` to `$fillable`,
hide the refresh token and encrypt it:

```php
protected $hidden = ['password', 'remember_token', 'sis_refresh_token'];

protected function casts(): array
{
    return ['sis_refresh_token' => 'encrypted'];
}
```

### Routes

`routes/web.php`:

```php
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

Route::get('/auth/sis/redirect', function (Request $request) {
    $sis = config('services.sis_occ');
    $state = Str::random(40);
    $verifier = Str::random(64);
    $request->session()->put(['sis_state' => $state, 'sis_verifier' => $verifier]);

    return redirect($sis['url'].'/oauth/authorize?'.http_build_query([
        'client_id' => $sis['client_id'],
        'redirect_uri' => $sis['redirect'],
        'response_type' => 'code',
        'scope' => 'profile enrollment',
        'state' => $state,
        'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='),
        'code_challenge_method' => 'S256',
    ], '', '&', PHP_QUERY_RFC3986));
})->name('sis.redirect');

Route::get('/auth/sis/callback', function (Request $request) {
    $sis = config('services.sis_occ');
    $state = $request->session()->pull('sis_state');
    $verifier = $request->session()->pull('sis_verifier');

    if (! $state || ! hash_equals($state, (string) $request->query('state'))) {
        return redirect()->route('login')->withErrors(['sis' => 'That sign-in expired. Try again.']);
    }

    if ($request->filled('error')) {
        return redirect()->route('login')->withErrors(['sis' => "SIS-OCC didn't allow this sign-in."]);
    }

    $tokens = Http::asForm()->acceptJson()->post($sis['url'].'/oauth/token', [
        'grant_type' => 'authorization_code',
        'client_id' => $sis['client_id'],
        'client_secret' => $sis['client_secret'],
        'redirect_uri' => $sis['redirect'],
        'code' => (string) $request->query('code'),
        'code_verifier' => $verifier,
    ]);

    if ($tokens->failed()) {
        return redirect()->route('login')->withErrors(['sis' => "Sign-in couldn't be completed. Try again."]);
    }

    $me = Http::withToken($tokens['access_token'])->acceptJson()->get($sis['url'].'/api/oauth/me');

    if ($me->status() === 403) {
        return redirect()->route('login')->withErrors(['sis' => 'Change your SIS-OCC password first, then try again.']);
    }

    if ($me->failed()) {
        return redirect()->route('login')->withErrors(['sis' => "SIS-OCC didn't allow this sign-in."]);
    }

    $user = User::updateOrCreate(
        ['sis_user_id' => $me['sub']],
        [
            'name' => $me['name'],
            'student_id' => $me['user_id_no'],
            'sis_refresh_token' => $tokens['refresh_token'],
        ],
    );

    Cache::put("sis-ok:{$user->id}", true, now()->addMinutes(15));
    Auth::login($user);
    $request->session()->regenerate();

    return redirect()->intended('/');
})->name('sis.callback');
```

### The sign-in button

```html
<a href="/auth/sis/redirect">Continue with SIS-OCC</a>
```

In an Inertia app, use a plain `<a href>` (or `window.location.href`), not Inertia's `<Link>`.
`<Link>` loads pages in the background and can't follow the redirect to SIS-OCC.

### Re-checking while the person is signed in

SIS-OCC re-applies the app's rules on every `/api/oauth/me` call, but the app has to ask. This
service asks at most every 15 minutes per person:

```php
<?php
// app/Services/SisOcc.php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class SisOcc
{
    /**
     * Whether SIS-OCC still lets this person use the app. Asks at most every 15 minutes.
     */
    public function stillAllowed(User $user): bool
    {
        if (Cache::has("sis-ok:{$user->id}")) {
            return true;
        }

        // One check at a time per person: each refresh token works only once.
        return Cache::lock("sis-check:{$user->id}", 15)->block(10, function () use ($user) {
            if (Cache::has("sis-ok:{$user->id}")) {
                return true; // another request has just checked
            }

            $user->refresh(); // read the latest refresh token
            $sis = config('services.sis_occ');

            try {
                $tokens = Http::asForm()->acceptJson()->post($sis['url'].'/oauth/token', [
                    'grant_type' => 'refresh_token',
                    'client_id' => $sis['client_id'],
                    'client_secret' => $sis['client_secret'],
                    'refresh_token' => $user->sis_refresh_token,
                ]);

                $me = $tokens->successful()
                    ? Http::withToken($tokens['access_token'])->acceptJson()->get($sis['url'].'/api/oauth/me')
                    : null;
            } catch (ConnectionException) {
                return true; // SIS-OCC unreachable: keep the person signed in and ask again next time
            }

            if ($tokens->serverError() || $me?->serverError()) {
                return true; // SIS-OCC had a problem: ask again next time
            }

            if (! $me?->successful()) {
                $user->forceFill(['sis_refresh_token' => null])->save();

                return false;
            }

            $user->forceFill([
                'name' => $me['name'],
                'sis_refresh_token' => $tokens['refresh_token'],
            ])->save();

            Cache::put("sis-ok:{$user->id}", true, now()->addMinutes(15));

            return true;
        });
    }
}
```

The cache store must support locks and be shared by all requests: `database`, `file`, `redis` or
`memcached`, not `array`.

Choose deliberately what happens when SIS-OCC is unreachable. This example keeps people signed
in and asks again on the next request. An app that must never let a dropped student in, such as
a voting system, should return `false` there instead.

A middleware signs the person out when SIS-OCC refuses:

```php
<?php
// app/Http/Middleware/EnsureSisOccAccess.php

namespace App\Http\Middleware;

use App\Services\SisOcc;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureSisOccAccess
{
    public function __construct(private SisOcc $sis)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->sis_user_id && ! $this->sis->stillAllowed($user)) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->withErrors(['sis' => 'Your access through SIS-OCC has ended. Sign in again.']);
        }

        return $next($request);
    }
}
```

Add it to the `web` group in `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->web(append: [\App\Http\Middleware\EnsureSisOccAccess::class]);
})
```

A refresh token lasts 7 days and each refresh issues a new one. Someone who doesn't open the app
for a week is asked to sign in again; if they're still signed in to SIS-OCC, that's one click.

## 4. Returning users

The second time someone uses "Continue with SIS-OCC":

- If they're still signed in to SIS-OCC in that browser, there's no password prompt. For
  school-owned apps there's no screen at all, just a quick redirect.
- SIS-OCC checks the app's rules again, so someone who has stopped qualifying is refused.
- `/api/oauth/me` returns **the same `sub`** with current details.
- SIS-OCC never creates a second account; the person already has one.

On the app's side, `updateOrCreate` by `sis_user_id` finds the existing row, refreshes the name
and ID number, and signs the person in. Nothing new is inserted:

| Method | First sign-in | Later sign-ins |
|---|---|---|
| `updateOrCreate` | Creates the row | Updates the details from SIS-OCC |
| `firstOrCreate` | Creates the row | Leaves the row as it is |

Keep the unique index on `sis_user_id`. It stops a double-clicked button from creating two rows.
Link accounts by `sub`, never by ID number or name.

### Existing accounts

If the app already had its own accounts before adding SIS-OCC, link them once. For example, sign
the person in with their old password, then send them through "Continue with SIS-OCC" and save
`sub` on their row. Don't match by ID number automatically without that confirmation.

## 5. Signing out

Signing out of the app ends the app's session only. The person stays signed in to SIS-OCC in that
browser, which is what makes the next sign-in one click.

### Shared computers

On library kiosks, computer labs and other shared machines, the next person would be signed in as
the previous one. For apps used on shared computers, add `prompt=login` to the authorize URL:

```php
'prompt' => 'login',
```

SIS-OCC then signs out whoever was signed in and asks for an ID number and password every time.

## 6. Handling errors

| Where | What happens | What the app should do |
|---|---|---|
| Callback | `error=access_denied` | Show "SIS-OCC didn't allow this sign-in." SIS-OCC already told the person why. |
| Callback | `state` missing or different | Refuse, and offer to start again |
| `/oauth/token` | `400 invalid_grant` | Code used, expired or mismatched: start the sign-in again |
| `/oauth/token` | `401 invalid_client` | Wrong client ID or secret: check `.env`; the secret may have been replaced |
| `/api/oauth/me` | `401` | Refresh once; if that fails, sign the person out |
| `/api/oauth/me` | `403 PASSWORD_CHANGE_REQUIRED` | Ask them to change their SIS-OCC password first |
| `/oauth/authorize` | A plain `invalid_client` error, no redirect | The client ID or callback URL doesn't match the registration |

## Checklist before going live

- [ ] Registered on the real SIS-OCC with an https callback URL
- [ ] Client secret only in the production server's `.env`
- [ ] `state` checked on every callback, and PKCE sent
- [ ] Accounts linked by `sub`, with a unique index
- [ ] Error messages for `access_denied` and failed swaps
- [ ] Re-check with `/api/oauth/me` at least every 15 minutes
- [ ] `prompt=login` if the app runs on shared computers
- [ ] Development registration switched off
