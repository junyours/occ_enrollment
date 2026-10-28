# OCC Student Information System

Student information and enrollment system for **Opol Community College**. The repository is named `occ_enrollment`, and the application includes enrollment, academic records, scheduling, grading, attendance, billing, and faculty evaluation workflows.

Laravel handles authentication, authorization, database access, and server-side workflows. React pages are rendered through Inertia, with Vite building the frontend assets.

## Main modules

| Area | Features represented in the application |
| --- | --- |
| Academic setup | School years and semesters, departments, programs, curricula, subjects, year levels, and sections |
| Enrollment | Student enrollment, section assignment, enrolled subjects, and Certificate of Registration (COR) generation |
| Scheduling | Class, room, faculty, and subject schedules |
| Grades | Assessments, exams, grade submissions, verification, and grade change requests |
| Attendance | Class attendance, exports, and local pending changes that synchronize when connectivity returns |
| Student records | Student profiles, academic records, Form 9, and Transcript of Records (TOR) preparation and printing |
| Billing | Billing periods, student balances, payments, allocations, and transaction history |
| Faculty evaluation | Questionnaires, evaluations, feedback analysis, rankings, and reports for Guidance and VPAA |
| NSTP | Components, sections, schedules, and grade workflows |
| Administration | User management, announcements, site settings, maintenance controls, and file management |

Access is controlled through authentication and role/permission middleware. Screens are organized for students, faculty, registrars, program heads, administrative offices, and other assigned roles.

## Technology stack

| Layer | Tools |
| --- | --- |
| Backend | PHP 8.2+, Laravel 11, Laravel Sanctum |
| Frontend | React 18, Inertia 2, Vite 6, Tailwind CSS 3 |
| UI and client state | Radix/Base UI components, TanStack Query and Table, Zustand |
| Database | MySQL; historical migrations contain MySQL-specific SQL |
| Documents and spreadsheets | Laravel Dompdf, PhpSpreadsheet, and frontend printing/export libraries |
| Integrations | Google Drive, configurable mail delivery, and PWA assets |
| Tests | Pest and PHPUnit |

Dependency constraints are defined in `composer.json` and `package.json`. Use the committed lockfiles to reproduce dependency versions.

## Requirements

- PHP compatible with the Composer lockfile; the project declares `^8.2`.
- Composer 2.
- Node.js 22 and npm as a compatible baseline for the locked Vite toolchain.
- MySQL and a dedicated local development database.
- PHP extensions required by Composer, including `mbstring`, `gd`, `zip`, and XML/DOM support; enable `pdo_mysql` for the application and `pdo_sqlite` for SQLite-based tests.

The commands below run from the repository root. Environment file copying uses PowerShell syntax.

## Local setup

### 1. Install dependencies

```powershell
composer install
npm ci
composer check-platform-reqs
```

### 2. Configure a local environment

For a new checkout without an existing `.env`:

```powershell
Copy-Item .env.example .env
```

Update `.env` with local database credentials and a consistent application URL. For example:

```dotenv
APP_NAME="SIS - Opol Community College"
APP_ENV=local
APP_DEBUG=true
APP_TIMEZONE=Asia/Manila
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=occ_enrollment_local
DB_USERNAME=your_local_database_user
DB_PASSWORD="your_local_database_password"

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=sync
MAIL_MAILER=log
```

Generate a key for this new local environment and clear any previously cached configuration:

```powershell
php artisan key:generate
php artisan config:clear
```

Keep an existing environment's application key when maintaining that installation.

`QUEUE_CONNECTION=sync` runs queued work during the request and avoids requiring a local queue worker. Although `.env.example` defaults to the database queue, the checked-in migrations do not create its `jobs` table. Use the database queue only after its schema has been provisioned.

### 3. Prepare the database and initial accounts

Create the dedicated MySQL database named in `.env` before starting the application.

The repository contains historical schema and data migrations, including MySQL-specific statements and account creation. A complete installation from an empty database has not been verified. Review the migration history before applying it to a new local database; obtain a sanitized development database baseline from the project maintainer if needed.

For an existing development baseline, inspect the recorded migration state:

```powershell
php artisan migrate:status
```

After reviewing the pending migrations for that database:

```powershell
php artisan migrate
```

The configured database session/cache drivers require the `sessions`, `cache`, and `cache_locks` tables. Their migration is `database/migrations/0001_01_01_000001_create_cache_table.php`.

Provision development accounts and academic reference data intentionally. Public registration routes are currently disabled in `routes/auth.php`. The current `DatabaseSeeder` also needs review: it passes a created user into `$this->call()`, which expects seeder class names. An unconditional `php artisan db:seed` is therefore not part of these setup instructions.

### 4. Start development servers

With the local `QUEUE_CONNECTION=sync` setting above, start Laravel and Vite in two separate terminals:

```powershell
php artisan serve
```

```powershell
npm run dev
```

Open [http://localhost:8000](http://localhost:8000), or the address printed by Artisan if the default port is unavailable. Keep `APP_URL` aligned with the address you use.

After configuring an asynchronous queue and its backing schema, you can use the combined development script:

```powershell
composer dev
```

This script starts Laravel's development server, a queue listener, and Vite. It is intended for a configured asynchronous queue rather than the local synchronous setting above.

For features that serve files from the public storage disk, create its link:

```powershell
php artisan storage:link
```

On Windows, creating the link may require Developer Mode or the appropriate symbolic-link permission.

## Optional integrations

### Mail

The example environment uses `MAIL_MAILER=log`. Credential, password-reset, and email-change messages are written to application logs rather than delivered to an inbox. Configure the `MAIL_*` values for your mail service when testing actual delivery; see `config/mail.php`.

### Google Drive

Google Drive is used by file-management and document/photo workflows. Add these values to `.env` when those features are needed; they are read by `config/services.php` but are absent from the current `.env.example`:

```dotenv
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
```

Use credentials with access to the configured folder, then run `php artisan config:clear` after changing local configuration. Supply real credentials privately.

### PWA and attendance synchronization

PWA settings live in `config/pwa.php`, with browser assets in `public/manifest.json`, `public/sw.js`, and `public/offline.html`. The service worker provides an offline navigation fallback; it does not make every SIS screen available offline.

Attendance includes IndexedDB-backed pending changes and synchronization through the authenticated layout. This is separate from the service worker's offline fallback.

## Folder structure

```text
occ_enrollment/
|-- app/
|   |-- Console/Commands/     Custom Artisan commands
|   |-- Http/
|   |   |-- Controllers/     Feature and role controllers
|   |   |-- Middleware/      Authentication, roles, permissions, maintenance
|   |   |-- Requests/        Form request validation
|   |   `-- Services/        Existing Drive and TOR photo services
|   |-- Mail/                Mail message classes
|   |-- Models/              Eloquent models
|   |-- Providers/           Service providers and shared application setup
|   |-- Services/            Account, feedback, and file-management services
|   `-- helpers.php          Composer-autoloaded helpers
|-- bootstrap/               Application routing and middleware registration
|-- config/                  Application and integration configuration
|-- database/
|   |-- factories/           Test data factories
|   |-- migrations/          Schema and historical data changes
|   `-- seeders/             Data/account seeders requiring review before use
|-- public/                  Web entry point, public assets, and PWA files
|-- resources/
|   |-- css/                 Application styles
|   |-- images/              Source images
|   |-- js/
|   |   |-- Components/      Shared UI and navigation configuration
|   |   |-- hooks/           Shared React hooks
|   |   |-- Layouts/         Authenticated and guest application shells
|   |   |-- Lib/             Utilities and address lookup data
|   |   |-- Pages/           Inertia screens and feature-specific helpers
|   |   `-- app.jsx          React/Inertia entry point
|   `-- views/               Root Blade view, email templates, and PDF views
|-- routes/                  Web, API, auth, console, and feature route files
|-- storage/                 Runtime files, caches, logs, and stored files
`-- tests/                   Feature and unit tests
```

### Finding the code for a feature

- Start at `routes/web.php` and its included feature route files for browser workflows. Token-authenticated mobile and CSG attendance endpoints are defined in `routes/api.php`.
- Follow the route to a controller under `app/Http/Controllers/`, then to its models and services.
- Inertia page names resolve to `resources/js/Pages/<name>.jsx`. Match the spelling and capitalization used by `Inertia::render()`.
- The `@/` frontend import alias points to `resources/js/`. Shared UI primitives are in `Components/ui/`, and role navigation is configured in `Components/Config/menuConfig.js`.
- Both `App\Services` and `App\Http\Services` currently exist, including separate `GoogleDriveService` classes. Check the full namespace when following or adding an import.

## Development commands

| Command | Purpose |
| --- | --- |
| `composer dev` | Start Laravel, the queue listener, and Vite together after configuring an asynchronous queue |
| `php artisan serve` | Start the Laravel development server |
| `npm run dev` | Start Vite with frontend hot reload |
| `npm run build` | Generate production frontend assets in `public/build/` |
| `php artisan route:list` | Inspect registered routes and middleware |
| `php artisan config:clear` | Clear cached environment configuration |
| `php artisan queue:listen --tries=1` | Process queued jobs when using a provisioned asynchronous queue |
| `php artisan test` | Run tests after configuring a disposable test database |

## Testing

Tests are configured in `phpunit.xml` and `tests/Pest.php`. Existing suites cover authentication/password flows, profile behavior, school-year management, and TOR photo services.

**Configure a dedicated disposable test database before running the full suite.** `phpunit.xml` does not select a database connection or database name, and Pest feature tests use `RefreshDatabase`. Without a testing override, those tests can inherit the application's database settings.

Create an untracked `.env.testing` with `APP_ENV=testing`, its own application key, and database credentials pointing only to the disposable MySQL database. Use `MAIL_MAILER=array`, `QUEUE_CONNECTION=sync`, `SESSION_DRIVER=array`, and `CACHE_STORE=array` for tests. The current `.gitignore` does not include `.env.testing`; keep it out of commits.

Once the testing environment and schema requirements are understood:

```powershell
php artisan config:clear
php artisan test
```

Historical migrations depend on MySQL, so SQLite is not a substitute for the full migration history. Some starter authentication tests also reference registration/email-verification routes that are currently disabled; full-suite success has not been established by this documentation.

Two focused tests explicitly isolate their dependencies:

```powershell
php artisan test --filter=SchoolYearManagementTest
php vendor/phpunit/phpunit/phpunit tests/Unit/TorPhotoServiceTest.php
```

`SchoolYearManagementTest` builds its own SQLite in-memory schema and requires `pdo_sqlite`. `TorPhotoServiceTest` uses an isolated container and fakes without loading the application, a real database, or network services.

## Serving a built application

Build frontend assets with `npm run build`. Configure the web server's document root to `public/` and allow the application to write to `storage/` and `bootstrap/cache/`.

For a production installation, set `APP_ENV=production`, `APP_DEBUG=false`, and the correct `APP_URL`. Keep the installation's existing application key, configure real mail/integration credentials, and review database changes before applying them. If using an asynchronous queue, provision its backing schema and run a managed worker.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Database connection fails | Confirm MySQL is running and the `DB_*` values identify the intended local database; clear cached configuration after changes. |
| Missing session/cache tables | Check the database baseline and the migration that creates `sessions`, `cache`, and `cache_locks`. |
| Queue reports a missing `jobs` table | Use `QUEUE_CONNECTION=sync` locally or provision the database queue schema before starting its listener. |
| Vite manifest or frontend assets are missing | Run `npm run dev` during development or `npm run build` to generate built assets. |
| Credential or reset emails never arrive | `MAIL_MAILER=log` writes messages locally; configure a delivery service to send them. |
| Drive features report missing configuration or access | Check the four `GOOGLE_DRIVE_*` values and the credential's access to the configured folder. |
| A page cannot be resolved by Inertia | Compare the controller's page name with the path and capitalization under `resources/js/Pages/`. |
