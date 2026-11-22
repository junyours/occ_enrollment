# MIS guide

How the MIS office registers school apps for "Continue with SIS-OCC", decides who may use them,
and helps people who can't sign in.

Everything here is under **Integrations → Connected apps** in the SIS-OCC menu. Only accounts
with the **MIS** role can open it.

## Before you register an app

Ask the app's developer for:

| What | Example | Why it matters |
|---|---|---|
| App name | OCC Library | Students see it when they sign in |
| A one-line description | Borrow books and reserve study rooms. | Shown on the "allow access?" screen |
| Website | `https://library.example` | Where people use the app. Information only. |
| Callback URL(s) | `https://library.example/auth/sis/callback` | Where SIS-OCC sends people back. Must be exact. |
| Does the app have its own server? | Yes | Decides whether it gets a client secret |
| Who should be able to sign in | Students and faculty | You set this, not the developer |
| Must students be enrolled this semester? | No | |
| What data the app needs | Name and enrollment | Give the least it needs |
| Who will maintain it | ID numbers | They get access to **My apps** |

### Website or callback URL?

These are easy to mix up:

- **Website** is the address people open to use the app, usually its frontend. It only appears
  on the "allow access?" screen and is never used to send anyone anywhere.
- **Callback URL** is where SIS-OCC sends the browser back with the sign-in code. For an app
  with a server, it's a route on the app's **backend**, because the backend holds the client
  secret needed to use the code.

| How the app is built | Callback URL to register |
|---|---|
| One web app (like SIS-OCC itself) | That app's route, e.g. `https://library.example/auth/sis/callback` |
| A frontend plus a separate backend API | **The backend's** route, e.g. `https://library-api.example/auth/sis/callback` |
| A mobile app with a backend | The backend's route, e.g. `https://library-api.example/auth/sis/mobile/callback` |

## Register an app

1. Open **Connected apps** and choose **Register app**.
2. Fill in the form:

   | Field | What to enter |
   |---|---|
   | **App name** | The name students will recognise |
   | **Description**, **Website** | Optional |
   | **Callback URLs** | Up to five, copied exactly from the developer. They must start with `https://`. Plain `http://` is accepted only for development addresses: `localhost`, `127.0.0.1`, `[::1]` and names ending in `.test`. |
   | **How the app runs** | **Has its own server** for almost every app: it gets a client secret. **No server** only for apps without any backend; they get no secret and must use PKCE. |
   | **Who can sign in** | Tick every role allowed. Everyone else is refused before the app learns anything. |
   | **Students must be enrolled this semester** | Requires an enrollment record in the school year marked current. Only applies to students. |
   | **What the app can read** | `profile`: name, ID number and role. `email`: email address. `enrollment`: course, year level, section and whether they're enrolled. Grades, addresses, billing and parents' details are never shared. |
   | **School-owned app** | On: people go straight back to the app after signing in. Off: they see an "allow access?" screen listing what the app will receive. Turn it off for apps run by anyone outside the school. |

3. Choose **Register app**.
4. **Copy the client secret from the dialog now.** SIS-OCC stores only a scrambled copy and
   can't show it again.

### Giving the credentials to the developer

The developer needs the **client ID**, the **client secret** and the three URLs shown on the app's
page (Authorize, Token and User info).

- Hand the secret over in person or through a password manager, not in a group chat or a
  plain email.
- It belongs in the app server's `.env` file, never in a mobile app, in browser code or in Git.
- If it's lost or may have leaked, issue a new one. Don't send it again.

## The app's page

Open an app from **Connected apps** to see:

- **Signed in now:** people with a current session.
- **Sign-ins** and **Blocked** in the last 7 days.
- **Settings:** the same fields as registration.
- **Recent activity:** sign-ins, blocked attempts with their reason, and every change.
- **Credentials:** client ID, callback URLs, endpoints, and **Issue new secret**.
- **Maintainers.**

The same events are in the SIS-OCC activity log, with actions starting with `oauth.`.

### Changing settings

- **Tightening the rules** (removing a role, removing a kind of data, or turning on the enrollment
  requirement) signs everyone out of the app. Each person is checked against the new rules the
  next time they sign in.
- **Loosening the rules** or editing names and URLs doesn't sign anyone out.
- Callback URL changes take effect immediately. If the app is still using an old URL, its
  sign-ins fail until the developer updates it.

### Issuing a new secret

**Issue new secret** replaces the secret immediately:

- The old secret stops working at once, so nobody can sign in to the app until the developer
  puts the new one in the app's `.env`. Agree on a time with the developer first.
- People already signed in stay signed in.
- Maintainers can do this themselves under **My apps**.

### Switching an app off

**Switch off** signs everyone out of the app and refuses new sign-ins with "{app} is switched off
in SIS-OCC right now". **Switch on** allows sign-ins again. Use this for apps that are retired,
compromised or no longer needed. Apps can't be deleted.

## Maintainers

Maintainers are the people responsible for an app, usually its developers. Add them by ID number
on the app's page. They can have any role.

A maintainer sees the app under **Developer → My apps** in their own menu. There they can:

- read the client ID, callback URLs and endpoints,
- see the app's rules and recent activity, including why someone was blocked,
- issue a new client secret.

They can't change who may sign in, what data the app reads, or its callback URLs. Those stay
with MIS.

When someone leaves the project, remove them. If they ever saw the client secret, issue a new one.

## Apps still in development

Developers should test against a copy of SIS-OCC on their own computer or a staging server, with
fake accounts; see [Development and testing](development.md).

If a test registration on the real SIS-OCC can't be avoided:

- register it as a **separate app**, for example "OCC Library (development)",
- give it only its `localhost` callback URL and the data being tested,
- switch it off when nobody is using it.

When the app goes live, register the production version with its https callback URL and switch
the development one off.

## Helping someone who can't sign in

Ask what the screen says, then check the app's **Recent activity**: blocked attempts show the reason.

| What they see | Cause | What to do |
|---|---|---|
| "{app} is only for {roles}." | Their role isn't allowed for the app | Correct if their role is wrong in Users. Otherwise add the role to the app only if they should have access. |
| "Your SIS-OCC account has been deactivated." | Their account is inactive | Reactivate the account in Users if appropriate |
| "You have no enrollment record for the current semester." | The app requires enrollment and they have no record in the school year marked current | Ask the registrar to check their enrollment, and check that the right school year is marked current |
| "{app} is switched off in SIS-OCC right now." | The app is switched off | Switch it on if it should be available |
| A password change page | Their new account still has its first password | They change it and are taken back automatically |
| The maintenance page | SIS-OCC is in maintenance mode for their role | Sign-ins to other apps pause with SIS-OCC |
| A plain error mentioning `invalid_client` | The app's client ID or callback URL doesn't match its registration | The developer compares the app's configuration with the app's page |
| They're signed in to the app as someone else | A shared computer still had another person signed in to SIS-OCC, and school-owned apps sign in without showing a screen | Sign out of SIS-OCC in that browser and try again (or choose **Use another account** if a SIS-OCC screen appears). Apps used on shared computers should ask for a fresh sign-in; see [Web apps](web-apps.md#shared-computers). |
| The app says their access ended | Their status changed (deactivated, role changed, enrollment removed) or the app's rules were tightened | Check the reason in Recent activity |

### When the semester changes

Enrollment checks use the school year marked **current**. When the registrar marks a new one
current, students who aren't enrolled in it yet lose access to apps that require enrollment the
next time those apps check. They get access again as soon as their enrollment is recorded.

## Good practice

- Give each app only the data it needs. Leave `email` off unless the app sends email.
- Keep **School-owned app** off for anything run outside the school.
- Review each app's maintainers every semester.
- Switch off apps nobody uses.
- Keep one registration per environment: development and production never share credentials.
