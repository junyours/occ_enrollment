<?php

namespace Database\Seeders;

use Illuminate\Database\Connection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Throwable;

/**
 * Account-only fixtures for an isolated manual-testing database.
 * Run explicitly; deliberately excluded from DatabaseSeeder.
 */
class ManualDemoUsersSeeder extends Seeder
{
    public const ROLES = [
        'faculty', 'student', 'program_head', 'evaluator', 'registrar',
        'mis', 'super_admin', 'president', 'announcement_admin', 'guidance',
        'librarian', 'ojt_coordinator', 'research_coordinator', 'vpaa',
        'gened_coordinator', 'nstp_director', 'cwts_evaluator', 'rotc_evaluator',
        'lts_evaluator', 'billing', 'cashier', 'academic_dean', 'nstp_faculty',
    ];

    private const FACULTY_ROLES = ['faculty', 'program_head', 'evaluator', 'registrar'];
    private const DEPARTMENT_NAME = 'DEMO Manual Testing Department';
    private const COURSE_NAME = 'DEMO Manual Testing Program';

    public static function loginId(string $role): string
    {
        if (! in_array($role, self::ROLES, true)) {
            throw new RuntimeException('Unknown manual-demo role.');
        }

        return 'DEMO-'.strtoupper(str_replace('_', '-', $role));
    }

    /** Current application routes; unsupported modules are kept explicit. */
    public static function entryPage(string $role): array
    {
        self::loginId($role);
        $pages = [
            'faculty' => ['classes', '/classes'],
            'student' => ['classes', '/classes'],
            'program_head' => ['classes', '/classes'],
            'evaluator' => ['classes', '/classes'],
            'registrar' => ['classes', '/classes'],
            'mis' => ['mis-users', '/mis-users'],
            'super_admin' => ['users', '/users'],
            'president' => ['president.ongoing-enrollment', '/president/ongoing-enrollment'],
            'guidance' => ['guidance.dashboard', '/guidance/dashboard'],
            'librarian' => ['approval-sheets', '/approval-sheets'],
            'vpaa' => ['vdashboard', '/vpaadashboard'],
            'gened_coordinator' => ['gened-coordinator.rooms-schedules', '/gened-coordinator/rooms-schedules'],
            'nstp_director' => ['nstp-director.dashboard', '/nstp-director/dashboard'],
            'cwts_evaluator' => ['nstp-director.dashboard', '/nstp-director/dashboard'],
            'rotc_evaluator' => ['nstp-director.dashboard', '/nstp-director/dashboard'],
            'lts_evaluator' => ['nstp-director.dashboard', '/nstp-director/dashboard'],
            'billing' => ['billing.dashboard', '/billing/dashboard'],
            'academic_dean' => ['schedules.view-faculty-schedules', '/faculty-schedules'],
            'nstp_faculty' => ['classes', '/classes'],
        ];
        $unsupported = [
            'announcement_admin' => 'Announcement routes are commented out; its menu references a missing route.',
            'ojt_coordinator' => 'The role route group is empty and its Classes menu link is unauthorized.',
            'research_coordinator' => 'The role route group is empty and its Classes menu link is unauthorized.',
            'cashier' => 'No dedicated role routes or sidebar menu; billing middleware allows only billing.',
        ];
        $note = $unsupported[$role] ?? 'Navigate directly after login: the current login redirect may not select this role page.';
        if ($role === 'president') {
            $note = 'The current login redirect references a missing route; navigate directly to this URL after authentication.';
        }

        return [
            'supported' => isset($pages[$role]),
            'route' => $pages[$role][0] ?? null,
            'path' => $pages[$role][1] ?? null,
            'note' => $note,
        ];
    }

    public function run(): void
    {
        // Only configuration is read here. Do not resolve a DB connection before this guard.
        [$connectionName, $target] = self::assertSafeEnvironment();
        $path = $this->credentialsPath();
        $lock = @fopen($path.'.lock', 'c+b');
        if ($lock === false) {
            throw new RuntimeException('Cannot open the private manual-demo credentials lock.');
        }

        try {
            if (! flock($lock, LOCK_EX)) {
                throw new RuntimeException('Cannot lock the manual-demo credentials manifest.');
            }
            $original = is_file($path) ? file_get_contents($path) : null;
            if ($original === false) {
                throw new RuntimeException('Cannot read the existing manual-demo credentials manifest.');
            }
            $manifest = $this->readManifest($original, $target);
            $manifestWritten = false;
            $connection = DB::connection($connectionName);
            // A previously resolved connection may outlive a configuration change.
            foreach (['driver', 'host', 'port', 'database'] as $key) {
                if (array_key_exists($key, $target) && (string) $connection->getConfig($key) !== (string) $target[$key]) {
                    throw new RuntimeException('The resolved database connection does not match the isolated manual-demo target.');
                }
            }

            try {
                $connection->transaction(function () use ($connection, $target, $path, &$manifest, &$manifestWritten) {
                    $references = $this->references($connection, $manifest['references'] ?? null);
                    $previous = [];
                    foreach ($manifest['accounts'] ?? [] as $account) {
                        $previous[$account['role']] = $account;
                    }
                    $accounts = [];
                    foreach (self::ROLES as $role) {
                        $accounts[] = $this->account($connection, $role, $previous[$role] ?? null, $references['department_id']);
                    }
                    $manifest = [
                        'format_version' => 1,
                        'purpose' => 'Synthetic local manual-testing accounts. Keep this file private.',
                        'generated_at' => $manifest['generated_at'] ?? now()->toIso8601String(),
                        'database' => $target,
                        'references' => $references,
                        'accounts' => $accounts,
                    ];
                    $this->atomicWrite($path, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n");
                    $manifestWritten = true;
                }, 1);
            } catch (Throwable $exception) {
                // Manifest failures happen inside the transaction and roll back its inserts.
                // Also restore the previous manifest if the DB commit itself failed.
                if ($manifestWritten) {
                    if ($original !== null) {
                        $this->atomicWrite($path, $original);
                    } elseif (is_file($path) && ! @unlink($path)) {
                        throw new RuntimeException('Database seeding failed and the credentials manifest could not be removed.', 0, $exception);
                    }
                }
                throw $exception;
            }

            $this->command?->info('Manual demo accounts are ready. Credentials are stored privately at: '.$path);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    public static function assertSafeEnvironment(): array
    {
        if (config('manual_demo.enabled') !== true || ! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Manual demo seeding is disabled or this environment is not local/testing.');
        }
        $name = config('database.default');
        $config = config('database.connections.'.$name);
        if (! is_string($name) || ! is_array($config) || ! empty($config['url'])) {
            throw new RuntimeException('Manual demo seeding requires an explicit connection without a database URL.');
        }
        if (isset($config['read']) || isset($config['write'])) {
            throw new RuntimeException('Manual demo seeding does not permit read/write connection overrides.');
        }
        if (($config['driver'] ?? null) === 'sqlite' && app()->environment('testing') && ($config['database'] ?? null) === ':memory:') {
            return [$name, ['connection' => $name, 'driver' => 'sqlite', 'database' => ':memory:']];
        }
        $port = filter_var(config('manual_demo.database_port'), FILTER_VALIDATE_INT);
        $connectionPort = filter_var($config['port'] ?? null, FILTER_VALIDATE_INT);
        if (($config['driver'] ?? null) !== 'mysql'
            || ($config['host'] ?? null) !== '127.0.0.1'
            || ($config['database'] ?? null) !== 'occ_manual_demo'
            || ! empty($config['unix_socket'])
            || $port === false || $port < 1 || $port > 65535
            || $connectionPort !== $port) {
            throw new RuntimeException('Manual demo seeding requires MySQL 127.0.0.1, database occ_manual_demo, and the configured dedicated port.');
        }

        return [$name, ['connection' => $name, 'driver' => 'mysql', 'host' => '127.0.0.1', 'port' => $port, 'database' => 'occ_manual_demo']];
    }

    private function credentialsPath(): string
    {
        $path = config('manual_demo.credentials_path');
        if (! is_string($path) || $path === '' || str_contains($path, "\0") || str_contains($path, '://')
            || ! preg_match('~^(?:[A-Za-z]:[\\\\/]|/)~', $path)) {
            throw new RuntimeException('The manual-demo credentials path must be an absolute local file path.');
        }
        if (is_link($path) || is_link($path.'.lock')) {
            throw new RuntimeException('Manual demo credentials and lock must not be symbolic links.');
        }
        $directory = dirname($path);
        if (! is_dir($directory) && ! @mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('Cannot create the private manual-demo credentials directory.');
        }
        $directory = realpath($directory);
        $public = realpath(public_path()) ?: public_path();
        $normalizedDirectory = strtolower(str_replace('\\', '/', $directory));
        $normalizedPublic = rtrim(strtolower(str_replace('\\', '/', $public)), '/');
        if ($normalizedDirectory === $normalizedPublic || str_starts_with($normalizedDirectory, $normalizedPublic.'/')) {
            throw new RuntimeException('Manual demo credentials must be outside the public directory.');
        }

        return $directory.DIRECTORY_SEPARATOR.basename($path);
    }

    private function readManifest(?string $contents, array $target): array
    {
        if ($contents === null) {
            return [];
        }
        try {
            $manifest = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $exception) {
            throw new RuntimeException('The manual-demo credentials manifest is invalid; it will not be overwritten.', 0, $exception);
        }
        if (! is_array($manifest) || ($manifest['format_version'] ?? null) !== 1 || ($manifest['database'] ?? null) !== $target
            || ! is_array($manifest['accounts'] ?? null) || ! is_array($manifest['references'] ?? null)) {
            throw new RuntimeException('The manual-demo credentials manifest does not match this demo database.');
        }
        $seen = [];
        $passwords = [];
        foreach ($manifest['accounts'] as $account) {
            if (! is_array($account)) {
                throw new RuntimeException('The manual-demo credentials manifest contains an invalid account record.');
            }
            $role = $account['role'] ?? null;
            if (! is_string($role) || ! in_array($role, self::ROLES, true) || isset($seen[$role])
                || ($account['user_id_no'] ?? null) !== self::loginId($role)
                || ! is_int($account['user_id'] ?? null) || $account['user_id'] < 1
                || ! is_string($account['password'] ?? null) || strlen($account['password']) < 24
                || isset($passwords[$account['password']])) {
                throw new RuntimeException('The manual-demo credentials manifest contains invalid or duplicate account records.');
            }
            $seen[$role] = true;
            $passwords[$account['password']] = true;
        }

        return $manifest;
    }

    private function references(Connection $connection, ?array $previous): array
    {
        $departments = $connection->table('department')->where('department_name_abbreviation', 'DEMO')
            ->orWhere('department_name', self::DEPARTMENT_NAME)->get();
        $courses = $connection->table('course')->where('course_name_abbreviation', 'DEMO-MANUAL')
            ->orWhere('course_name', self::COURSE_NAME)->get();
        if ($departments->count() > 1 || $courses->count() > 1) {
            throw new RuntimeException('Ambiguous DEMO department or course references exist.');
        }
        $department = $departments->first();
        $course = $courses->first();
        if ($department && (! $previous || (int) ($previous['department_id'] ?? 0) !== (int) $department->id
            || $department->department_name !== self::DEPARTMENT_NAME || $department->department_name_abbreviation !== 'DEMO')) {
            throw new RuntimeException('A DEMO department collision exists; no existing reference will be adopted.');
        }
        if ($course && (! $previous || (int) ($previous['course_id'] ?? 0) !== (int) $course->id
            || $course->course_name !== self::COURSE_NAME || $course->course_name_abbreviation !== 'DEMO-MANUAL')) {
            throw new RuntimeException('A DEMO course collision exists; no existing reference will be adopted.');
        }
        if ($previous && (! $department || ! $course)) {
            throw new RuntimeException('Previously recorded demo reference data is missing; refusing to replace it.');
        }
        $now = now();
        $departmentId = $department ? (int) $department->id : $connection->table('department')->insertGetId([
            'department_name' => self::DEPARTMENT_NAME, 'department_name_abbreviation' => 'DEMO',
            'created_at' => $now, 'updated_at' => $now,
        ]);
        if ($course && (int) $course->department_id !== $departmentId) {
            throw new RuntimeException('The DEMO course belongs to another department.');
        }
        $courseId = $course ? (int) $course->id : $connection->table('course')->insertGetId([
            'department_id' => $departmentId, 'course_name' => self::COURSE_NAME, 'course_name_abbreviation' => 'DEMO-MANUAL',
            'created_at' => $now, 'updated_at' => $now,
        ]);

        return ['department_id' => (int) $departmentId, 'course_id' => (int) $courseId];
    }

    private function account(Connection $connection, string $role, ?array $previous, int $departmentId): array
    {
        $login = self::loginId($role);
        $user = $connection->table('users')->where('user_id_no', $login)->first();
        if ($user && (! $previous || $previous['user_id'] !== (int) $user->id || $user->user_role !== $role
            || ! Hash::check($previous['password'], $user->password))) {
            throw new RuntimeException('A demo login collision or credential mismatch exists for '.$login.'; nothing will be reset.');
        }
        if (! $user && $previous) {
            throw new RuntimeException('A previously recorded demo account is missing for '.$login.'; nothing will be replaced.');
        }
        $now = now();
        $password = $previous['password'] ?? 'dM9!'.bin2hex(random_bytes(24));
        $userId = $user ? (int) $user->id : $connection->table('users')->insertGetId([
            'user_id_no' => $login, 'email' => str_replace('_', '-', $role).'@manual-demo.invalid',
            'password' => Hash::make($password), 'user_role' => $role, 'active' => true,
            'password_change' => true, 'first_login_at' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        if (! $connection->table('user_information')->where('user_id', $userId)->exists()) {
            $connection->table('user_information')->insert([
                'user_id' => $userId, 'first_name' => 'DEMO', 'last_name' => ucwords(str_replace('_', ' ', $role)),
                'middle_name' => null, 'gender' => 'Female', 'birthday' => '2000-01-01', 'civil_status' => 'Single',
                'contact_number' => '00000000000', 'email_address' => str_replace('_', '-', $role).'@manual-demo.invalid',
                'present_address' => 'DEMO Synthetic Address', 'zip_code' => '0000',
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        if (in_array($role, self::FACULTY_ROLES, true)) {
            $faculty = $connection->table('faculty')->where('faculty_id', $userId)->first();
            if ($faculty && (int) $faculty->department_id !== $departmentId) {
                throw new RuntimeException('A demo faculty account is assigned outside the DEMO department.');
            }
            if (! $faculty) {
                $connection->table('faculty')->insert([
                    'faculty_id' => $userId, 'department_id' => $departmentId, 'active' => true,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        }

        return ['role' => $role, 'user_id' => (int) $userId, 'user_id_no' => $login, 'password' => $password, 'entry_page' => self::entryPage($role)];
    }

    private function atomicWrite(string $path, string $contents): void
    {
        $temporary = @tempnam(dirname($path), '.manual-demo-');
        if ($temporary === false) {
            throw new RuntimeException('Cannot stage the private manual-demo credentials manifest.');
        }
        try {
            @chmod($temporary, 0600);
            if (file_put_contents($temporary, $contents, LOCK_EX) !== strlen($contents)) {
                throw new RuntimeException('Cannot write the private manual-demo credentials manifest.');
            }
            if (! @rename($temporary, $path)) {
                throw new RuntimeException('Cannot atomically install the private manual-demo credentials manifest.');
            }
            @chmod($path, 0600);
        } finally {
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
    }
}
