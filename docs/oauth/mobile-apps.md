# Mobile apps

How a mobile app, such as a React Native app, signs people in with "Continue with SIS-OCC".
Read [Web apps](web-apps.md) first: the server side here builds on it.

In the examples, SIS-OCC runs at `https://sis.example`, the app's Laravel backend at
`https://library-api.example`, and the app opens links that start with `occlibrary://`.

## Choose a setup

| | **With a backend** (recommended) | Without a backend |
|---|---|---|
| Who talks to SIS-OCC | The app's Laravel backend | The app itself |
| Client secret | Yes, kept on the backend | None; PKCE only |
| SIS-OCC tokens on the phone | Never | Yes, in secure storage |
| Callback URL MIS registers | The backend's https route | An https App Link or Universal Link |
| Works with SIS-OCC today | Yes | Only with https links; app schemes such as `occlibrary://` aren't accepted |

Most school apps already have a backend for their own data, so use it. The rest of this guide
covers that setup; the other is summarised [at the end](#without-a-backend).

## How it works with a backend

1. The app makes its own one-time challenge and opens the backend's **start** URL in the phone's
   browser (never a WebView).
2. The backend redirects to SIS-OCC, exactly like a web app.
3. The person signs in. SIS-OCC sends the browser to the backend's **callback**.
4. The backend swaps the code with its secret, calls `/api/oauth/me` and finds or creates the
   user by `sub`.
5. The backend redirects to `occlibrary://auth?ticket=…` with a **one-time ticket** that's valid
   for 60 seconds. It never puts a token in the link.
6. The phone opens the app. The app sends the ticket and its challenge proof to the backend and
   receives the backend's own Sanctum token.

From then on, the app talks only to its own backend with that token.

**Why a ticket and a challenge?** On Android, another app can register the same `occlibrary://`
scheme and catch the redirect. A caught ticket is useless without the challenge proof, which never
leaves the real app.

**Why the phone's browser?** In a WebView, the app could read the student's password. The browser
also shares the SIS-OCC sign-in with the rest of the phone, so students often just tap through,
and it shows the real SIS-OCC address.

## 1. Registration

Ask MIS to register the app as **Has its own server**, with the backend's callback URL:

```
https://library-api.example/auth/sis/mobile/callback
```

`occlibrary://auth` is between the app and its own backend, so MIS doesn't register it. If the
same backend also has a web sign-in, MIS registers both callback URLs on the same app.

## 2. Backend (Laravel)

Set up the configuration, the `users` columns and the `SisOcc` service as in
[Web apps](web-apps.md#3-laravel-example). Install Sanctum (`php artisan install:api`) for the
app's own tokens. Add a mobile callback URL to `.env`:

```dotenv
SIS_OCC_MOBILE_REDIRECT_URI=https://library-api.example/auth/sis/mobile/callback
```

and to `config/services.php` under `sis_occ`:

```php
'mobile_redirect' => env('SIS_OCC_MOBILE_REDIRECT_URI'),
```

### Routes visited by the phone's browser

`routes/web.php`:

```php
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

Route::get('/auth/sis/mobile/start', function (Request $request) {
    $request->validate(['app_challenge' => ['required', 'string', 'size:43']]);

    $sis = config('services.sis_occ');
    $state = Str::random(40);
    $verifier = Str::random(64);

    Cache::put("sis-login:{$state}", [
        'verifier' => $verifier,
        'app_challenge' => $request->query('app_challenge'),
    ], now()->addMinutes(10));

    return redirect($sis['url'].'/oauth/authorize?'.http_build_query([
        'client_id' => $sis['client_id'],
        'redirect_uri' => $sis['mobile_redirect'],
        'response_type' => 'code',
        'scope' => 'profile enrollment',
        'state' => $state,
        'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='),
        'code_challenge_method' => 'S256',
    ], '', '&', PHP_QUERY_RFC3986));
});

Route::get('/auth/sis/mobile/callback', function (Request $request) {
    $login = Cache::pull('sis-login:'.$request->query('state'));   // works once

    if (! $login) {
        return redirect()->away('occlibrary://auth?error=expired');
    }

    if ($request->filled('error')) {
        return redirect()->away('occlibrary://auth?error=access_denied');
    }

    $sis = config('services.sis_occ');
    $tokens = Http::asForm()->acceptJson()->post($sis['url'].'/oauth/token', [
        'grant_type' => 'authorization_code',
        'client_id' => $sis['client_id'],
        'client_secret' => $sis['client_secret'],
        'redirect_uri' => $sis['mobile_redirect'],
        'code' => (string) $request->query('code'),
        'code_verifier' => $login['verifier'],
    ]);

    $me = $tokens->successful()
        ? Http::withToken($tokens['access_token'])->acceptJson()->get($sis['url'].'/api/oauth/me')
        : null;

    if (! $me?->successful()) {
        return redirect()->away('occlibrary://auth?error=failed');
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

    $ticket = Str::random(40);
    Cache::put("sis-ticket:{$ticket}", [
        'user_id' => $user->id,
        'app_challenge' => $login['app_challenge'],
    ], now()->addMinute());

    return redirect()->away('occlibrary://auth?ticket='.$ticket);
});
```

`state`, the PKCE verifier and the ticket live in the cache rather than the session, so use a
cache store that's shared by all requests (`database`, `file` or `redis`).

### Routes called by the app

`routes/api.php`:

```php
use App\Http\Middleware\EnsureSisOccApiAccess;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;

// Swap the one-time ticket for the app's own token.
Route::post('/auth/sis/mobile/exchange', function (Request $request) {
    $data = $request->validate([
        'ticket' => ['required', 'string'],
        'app_verifier' => ['required', 'string'],
    ]);

    $ticket = Cache::pull('sis-ticket:'.$data['ticket']);   // works once
    $challenge = rtrim(strtr(base64_encode(hash('sha256', $data['app_verifier'], true)), '+/', '-_'), '=');

    abort_unless($ticket && hash_equals($ticket['app_challenge'], $challenge), 401);

    return ['token' => User::findOrFail($ticket['user_id'])->createToken('mobile')->plainTextToken];
})->middleware('throttle:10,1');

Route::middleware(['auth:sanctum', EnsureSisOccApiAccess::class])->group(function () {
    Route::post('/auth/logout', function (Request $request) {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    });

    // The app's own API routes go here.
});
```

### Re-checking with SIS-OCC

The app runs on the backend's Sanctum token, so the backend has to notice when SIS-OCC stops
allowing someone. Use the `SisOcc` service from [Web apps](web-apps.md#re-checking-while-the-person-is-signed-in)
in an API middleware:

```php
<?php
// app/Http/Middleware/EnsureSisOccApiAccess.php

namespace App\Http\Middleware;

use App\Services\SisOcc;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSisOccApiAccess
{
    public function __construct(private SisOcc $sis)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->sis_user_id && ! $this->sis->stillAllowed($user)) {
            $user->tokens()->delete();

            return response()->json(['message' => 'Your access through SIS-OCC has ended. Sign in again.'], 401);
        }

        return $next($request);
    }
}
```

## 3. The app (React Native with Expo)

Give the app its link scheme in `app.json`:

```json
{
  "expo": {
    "scheme": "occlibrary"
  }
}
```

Install the modules:

```powershell
npx expo install expo-web-browser expo-linking expo-crypto expo-secure-store
```

Sign in:

```js
// auth.js
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export const API = 'https://library-api.example';
const TOKEN_KEY = 'library_token';
const base64Url = (b64) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function continueWithSisOcc() {
  const verifier = Crypto.randomUUID() + Crypto.randomUUID();
  const challenge = base64Url(await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 },
  ));

  const result = await WebBrowser.openAuthSessionAsync(
    `${API}/auth/sis/mobile/start?app_challenge=${challenge}`,
    'occlibrary://auth',
  );
  if (result.type !== 'success') return null; // the person closed the browser

  const { ticket, error } = Linking.parse(result.url).queryParams;
  if (error === 'access_denied') throw new Error("SIS-OCC didn't allow this sign-in.");
  if (error || !ticket) throw new Error("Sign-in couldn't be completed. Try again.");

  const res = await fetch(`${API}/api/auth/sis/mobile/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ticket, app_verifier: verifier }),
  });
  if (!res.ok) throw new Error("Sign-in couldn't be completed. Try again.");

  const { token } = await res.json();
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return token;
}

export async function signOut() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    await fetch(`${API}/api/auth/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Calls the app's own API. A 401 means the session has ended: sign in again.
export async function api(path, options = {}) {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const res = await fetch(`${API}/api${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
  return res;
}
```

Without Expo, use `react-native-inappbrowser-reborn` (`InAppBrowser.openAuth`) to open the
browser and `react-native-keychain` to store the token. The backend stays the same.

### Rules for the app

- Open sign-in in the phone's browser through `openAuthSessionAsync`, never in a WebView.
- Store the token with `expo-secure-store` (Keychain or Keystore), never in AsyncStorage.
- Never put the client secret, or any SIS-OCC token, in the app.
- When the API answers `401`, show the sign-in screen again.

### Shared devices

On a phone or tablet several people use, the next person would be signed in as the previous one.
Either have the backend add `'prompt' => 'login'` to the authorize URL for those devices, or, on
iOS, pass `{ preferEphemeralSession: true }` as the third argument to `openAuthSessionAsync` so
that the browser forgets the SIS-OCC sign-in after each use.

## 4. Testing on a phone

The phone has to reach both SIS-OCC and the backend, and SIS-OCC accepts plain http callback URLs
only for `localhost`, `127.0.0.1`, `[::1]` and `.test`. Use a development build rather than Expo
Go, whose `exp://` addresses change with the network. The options are in
[Development and testing](development.md#testing-on-a-phone).

## Without a backend

Only for apps with no server at all:

- MIS registers the app as **No server**. It gets a client ID and no secret.
- Every sign-in must use PKCE; SIS-OCC refuses sign-ins without it.
- The callback URL must be an https link that opens the app: an Android App Link or an iOS
  Universal Link on a domain the school controls. App schemes like `occlibrary://` aren't
  accepted by the registry.
- `react-native-app-auth` or `expo-auth-session` handle the browser, PKCE and the token request.
- The app stores the SIS-OCC access and refresh tokens in secure storage and calls
  `/api/oauth/me` itself.
- The app has no server to re-check for it, so it must call `/api/oauth/me` whenever it opens and
  sign the person out on a `401`.
