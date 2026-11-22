# Development and testing

How to build and test an app against SIS-OCC before it goes live, and how to test SIS-OCC's own
OAuth code.

## Pick an SIS-OCC to test against

| Option | Good for | Student data on developers' computers |
|---|---|---|
| **SIS-OCC on your own computer** | Early development, trying every case | None. Only the fake accounts you create. |
| **A shared staging SIS-OCC** with fake or anonymised data | Teams, testing on phones | None |
| **The real SIS-OCC**, with a separate development registration | Last checks only | Yes. Avoid this. |

If the real SIS-OCC is unavoidable, MIS registers a separate app such as
"OCC Library (development)", with only its `localhost` callback URL and the data being tested, and
switches it off when nobody is using it.

## Run SIS-OCC on your computer

1. Set up SIS-OCC as described in the project [README](../../README.md#local-setup), with a
   development database.
2. Make sure PHP has the `sodium` extension (`php -m`). On XAMPP, remove the `;` from
   `;extension=sodium` in `php.ini`.
3. Create the OAuth tables and the signing keys:

   ```powershell
   php artisan migrate
   ```

   ```powershell
   php artisan passport:keys
   ```

4. Start SIS-OCC on its own port:

   ```powershell
   php artisan serve --host=127.0.0.1 --port=8000
   ```

### Test accounts

Create local accounts for each case you need to test. In `php artisan tinker`, with a password
you choose for your computer only:

```php
$make = function (string $id, string $role, string $first, string $last) {
    $user = App\Models\User::forceCreate([
        'user_id_no' => $id,
        'user_role' => $role,
        'password' => Illuminate\Support\Facades\Hash::make('choose-a-local-password'),
        'password_change' => 1,
        'active' => 1,
    ]);
    App\Models\UserInformation::forceCreate(['user_id' => $user->id, 'first_name' => $first, 'last_name' => $last]);

    return $user;
};

$make('DEV-MIS-01', 'mis', 'Dev', 'MIS');
$make('DEV-STU-01', 'student', 'Dev', 'Student');
$make('DEV-FAC-01', 'faculty', 'Dev', 'Faculty');
$make('DEV-OFF-01', 'student', 'Dev', 'Deactivated')->update(['active' => 0]);
```

| Account | Tests |
|---|---|
| A student enrolled in the school year marked current | A normal sign-in. Enroll a test account through the SIS enrollment screens, or use one already enrolled in your development data. |
| `DEV-STU-01` (not enrolled) | "You have no enrollment record" on apps that require enrollment |
| `DEV-FAC-01` | "{app} is only for students" |
| `DEV-OFF-01` | "Your SIS-OCC account has been deactivated" |
| `DEV-MIS-01` | Registering your app under **Connected apps** |

Never create accounts like these on the real SIS-OCC.

### Register your app locally

Sign in as `DEV-MIS-01`, open **Integrations → Connected apps**, and register your app with its
local callback URL, for example `http://localhost:8001/auth/sis/callback`. Copy the client ID
and secret into your app's `.env`, with `SIS_OCC_URL=http://127.0.0.1:8000`.

### Two apps on one computer

Browsers share cookies between ports on the same host, so SIS-OCC on `localhost:8000` and your app
on `localhost:8001` would overwrite each other's sessions. Run them on different host names, such
as SIS-OCC on `127.0.0.1` and your app on `localhost`, or give your app its own session cookie name
in its `.env`:

```dotenv
SESSION_COOKIE=library_session
```

## Callback URLs during development

SIS-OCC accepts plain http callback URLs only for development addresses:

| Accepted | Not accepted |
|---|---|
| `http://localhost:8001/auth/sis/callback` | `http://192.168.1.20:8001/auth/sis/callback` |
| `http://127.0.0.1:8001/auth/sis/callback` | `http://library.example/auth/sis/callback` |
| `http://[::1]:8001/auth/sis/callback` | `occlibrary://auth` |
| `http://library.test/auth/sis/callback` (Herd, Valet) | |
| Any `https://` address, including tunnels | |

## Testing on a phone

The phone has to reach both SIS-OCC and the app's backend.

| Device | What to do |
|---|---|
| iOS simulator | `localhost` reaches your computer. Nothing extra. |
| Android emulator, or an Android phone on USB | Forward the ports, then use `localhost` on the phone too. |
| Any phone on Wi-Fi, including iPhones | Give the backend an https address with a tunnel (ngrok, Cloudflare Tunnel or Expose) and register that as the callback URL. |

Forwarding ports to an Android device:

```powershell
adb reverse tcp:8000 tcp:8000
```

```powershell
adb reverse tcp:8001 tcp:8001
```

More tips:

- Use an Expo development build, not Expo Go. Expo Go's `exp://` addresses change with your
  network and can't be registered.
- The app's plain-http calls to a local backend only work in debug builds.
- A tunnel address changes every time it starts unless you reserve one, and MIS has to update the
  registered callback URL each time it changes.

## One registration per environment

| | Development | Production |
|---|---|---|
| SIS-OCC | Your computer or staging | The real SIS-OCC |
| Callback URL | `http://localhost:8001/auth/sis/callback` | `https://library.example/auth/sis/callback` |
| Client ID and secret | Its own | Its own, issued by MIS at launch |
| Who knows the secret | The developers | Only the production server's `.env` |

The app's code doesn't change between environments; only its `.env` does:

```dotenv
SIS_OCC_URL=http://127.0.0.1:8000
SIS_OCC_CLIENT_ID=...development client ID...
SIS_OCC_CLIENT_SECRET=...development secret...
SIS_OCC_REDIRECT_URI=http://localhost:8001/auth/sis/callback
```

When the app is ready, go through the [checklist](web-apps.md#checklist-before-going-live), ask
MIS to register the production version, and put its values in the production `.env`.

## Testing SIS-OCC's OAuth code

The OAuth tests build their own tables in an in-memory SQLite database and never touch MySQL:

```powershell
php artisan test --filter=ContinueWithSisOccTest
```

They cover a full sign-in, blocked students and roles, switched-off apps, reused codes, wrong
secrets, unregistered callback URLs, scope limits, revocation, the re-check on `/api/oauth/me`,
MIS registration and maintainers. The code is in
[`tests/Feature/OAuth/ContinueWithSisOccTest.php`](../../tests/Feature/OAuth/ContinueWithSisOccTest.php).

For the rest of the test suite, see [Testing](../../README.md#testing) in the README.
