<?php

namespace Tests\Feature\OAuth;

use App\Http\Middleware\DatabaseBasedMaintenance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogAuthenticatedUserActivity;
use App\Models\ActivityLog;
use App\Models\OAuth\Client;
use App\Models\User;
use App\Services\OAuth\ClientRegistrar;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Passport\Passport;
use phpseclib4\Crypt\RSA;
use Tests\TestCase;

/**
 * "Continue with SIS-OCC" end to end: authorize, token, /api/oauth/me, the
 * school's sign-in rules and revocation. Uses isolated in-memory tables only.
 */
class ContinueWithSisOccTest extends TestCase
{
    private const CALLBACK = 'https://vote.occ.test/auth/sis/callback';

    private static ?string $keyPath = null;

    private User $mis;
    private User $enrolledStudent;
    private User $unenrolledStudent;
    private User $faculty;
    private Client $election;
    private string $secret;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.key' => 'base64:'.base64_encode(str_repeat('k', 32)),
            'database.default' => 'sqlite',
            'database.connections.sqlite' => [
                'driver' => 'sqlite', 'url' => null, 'database' => ':memory:',
                'prefix' => '', 'foreign_key_constraints' => true,
            ],
            'session.driver' => 'array', 'cache.default' => 'array',
            'mail.default' => 'array', 'hashing.bcrypt.rounds' => 4,
        ]);
        DB::purge('sqlite');
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());

        $this->withoutMiddleware([
            DatabaseBasedMaintenance::class, HandleInertiaRequests::class, LogAuthenticatedUserActivity::class,
        ]);
        $this->withoutVite();

        Passport::loadKeysFrom(self::keyPath());

        $this->createSchoolTables();
        foreach (glob(database_path('migrations/2026_11_20_1702*_create_oauth_*.php')) as $file) {
            (require $file)->up();
        }
        (require database_path('migrations/2026_11_20_170300_create_oauth_client_settings_tables.php'))->up();

        $this->seedSchool();
    }

    public function test_an_enrolled_student_signs_in_and_the_app_reads_their_details(): void
    {
        $token = $this->signIn($this->enrolledStudent);

        $this->me($token)
            ->assertOk()
            ->assertJson([
                'sub' => (string) $this->enrolledStudent->id,
                'user_id_no' => '2023-00123',
                'name' => 'Juan Dela Cruz',
                'role' => 'student',
                'enrollment' => [
                    'currently_enrolled' => true,
                    'school_year' => '2026-2027',
                    'semester' => 'First',
                    'course' => 'Bachelor of Science in Information Technology',
                    'course_code' => 'BSIT',
                    'year_level' => 'Third Year',
                    'section' => 'A',
                ],
            ])
            ->assertJsonMissingPath('email');

        $this->assertDatabaseHas('activity_logs', ['action' => 'oauth.sign_in_allowed', 'user_id' => $this->enrolledStudent->id]);
    }

    public function test_a_student_who_is_not_enrolled_is_refused_before_any_code_is_issued(): void
    {
        $this->actingAs($this->unenrolledStudent)
            ->get($this->authorizeUrl())
            ->assertStatus(403)
            ->assertInertia(fn (Assert $page) => $page
                ->component('OAuth/Denied')
                ->where('appName', 'CSG Election')
                ->where('reasons', fn ($reasons) => str_contains($reasons[0], 'no enrollment record'))
                ->where('backUrl', fn (string $url) => str_starts_with($url, self::CALLBACK.'?')
                    && str_contains($url, 'error=access_denied')
                    && str_contains($url, 'state=state-123')));

        $this->assertSame(0, DB::table('oauth_auth_codes')->count());
        $log = ActivityLog::where('action', 'oauth.sign_in_blocked')->sole();
        $this->assertSame(['enrollment'], $log->properties['failed_checks']);
    }

    public function test_a_role_the_app_does_not_accept_is_refused(): void
    {
        $this->actingAs($this->faculty)
            ->get($this->authorizeUrl())
            ->assertStatus(403)
            ->assertInertia(fn (Assert $page) => $page
                ->component('OAuth/Denied')
                ->where('reasons', ['CSG Election is only for students.']));

        $this->assertSame(0, DB::table('oauth_auth_codes')->count());
    }

    public function test_a_switched_off_app_signs_nobody_in(): void
    {
        app(ClientRegistrar::class)->setStatus($this->election, 'suspended');

        $this->actingAs($this->enrolledStudent)
            ->get($this->authorizeUrl())
            ->assertStatus(403)
            ->assertInertia(fn (Assert $page) => $page->component('OAuth/Denied'));
    }

    public function test_guests_are_sent_to_the_sis_login_first(): void
    {
        $this->get($this->authorizeUrl())->assertRedirect(route('login'));
    }

    public function test_the_login_page_returning_through_inertia_gets_a_full_page_load(): void
    {
        $this->actingAs($this->enrolledStudent)
            ->get($this->authorizeUrl(), ['X-Inertia' => 'true'])
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location');
    }

    public function test_deactivating_an_account_ends_its_app_sessions(): void
    {
        $token = $this->signIn($this->enrolledStudent);

        $this->enrolledStudent->update(['active' => false]);
        $this->app['auth']->forgetGuards();

        $this->me($token)->assertUnauthorized();
        $this->assertSame(0, DB::table('oauth_access_tokens')->where('revoked', false)->count());
        $this->assertSame(0, DB::table('oauth_refresh_tokens')->where('revoked', false)->count());
        $this->assertDatabaseHas('activity_logs', ['action' => 'oauth.tokens_revoked']);
    }

    public function test_the_rules_are_checked_again_on_every_userinfo_call(): void
    {
        $token = $this->signIn($this->enrolledStudent);

        // Removed outside Eloquent, so no model event revokes anything.
        DB::table('enrolled_students')->where('student_id', $this->enrolledStudent->id)->delete();
        $this->app['auth']->forgetGuards();

        $this->me($token)
            ->assertUnauthorized()
            ->assertJson(['error' => 'invalid_token', 'failed_checks' => ['enrollment']]);

        $this->assertSame(0, DB::table('oauth_access_tokens')->where('revoked', false)->count());
    }

    public function test_a_code_works_only_once(): void
    {
        $code = $this->authorizationCode($this->enrolledStudent);

        $this->exchange($code)->assertOk();
        $this->exchange($code)->assertStatus(400)->assertJson(['error' => 'invalid_grant']);
    }

    public function test_a_wrong_client_secret_is_refused(): void
    {
        $code = $this->authorizationCode($this->enrolledStudent);

        $this->post('/oauth/token', [
            'grant_type' => 'authorization_code',
            'client_id' => $this->election->getKey(),
            'client_secret' => 'not-the-secret',
            'redirect_uri' => self::CALLBACK,
            'code' => $code,
        ])->assertUnauthorized()->assertJson(['error' => 'invalid_client']);
    }

    public function test_an_unregistered_callback_url_is_refused(): void
    {
        $this->actingAs($this->enrolledStudent)
            ->get($this->authorizeUrl(['redirect_uri' => 'https://evil.example/steal']))
            ->assertStatus(401);

        $this->assertSame(0, DB::table('oauth_auth_codes')->count());
    }

    public function test_scopes_the_app_was_not_given_are_never_granted(): void
    {
        $token = $this->signIn($this->enrolledStudent, 'profile enrollment email');

        $this->me($token)->assertOk()->assertJsonMissingPath('email');
    }

    public function test_mis_registers_an_app_and_sees_its_secret_once(): void
    {
        $response = $this->actingAs($this->mis)->post(route('mis.oauth-apps.store'), [
            'name' => 'OCC Library',
            'redirect_uris' => ['https://library.occ.test/auth/sis/callback', ''],
            'confidential' => true,
            'scopes' => ['profile'],
            'allowed_roles' => ['student', 'faculty'],
            'requires_enrollment' => false,
            'skips_consent' => true,
        ]);

        $client = Client::where('name', 'OCC Library')->sole();
        $response->assertRedirect(route('mis.oauth-apps.show', $client))->assertSessionHas('oauth_new_secret');

        $plain = session('oauth_new_secret');
        $this->assertSame(40, strlen($plain));
        $this->assertNotSame($plain, $client->getAttributes()['secret']);
        $this->assertSame(['https://library.occ.test/auth/sis/callback'], $client->redirect_uris);
        $this->assertSame(['student', 'faculty'], $client->settings->allowed_roles);
        $this->assertDatabaseHas('activity_logs', ['action' => 'oauth.app_registered', 'user_id' => $this->mis->id]);
    }

    public function test_callback_urls_must_use_https_outside_local_development(): void
    {
        $this->actingAs($this->mis)->post(route('mis.oauth-apps.store'), [
            'name' => 'Canteen',
            'redirect_uris' => ['http://canteen.example.edu/callback'],
            'confidential' => true,
            'scopes' => ['profile'],
            'allowed_roles' => ['student'],
            'requires_enrollment' => false,
            'skips_consent' => true,
        ])->assertSessionHasErrors('redirect_uris.0');
    }

    public function test_only_mis_can_open_the_app_registry(): void
    {
        $this->actingAs($this->faculty)->get(route('mis.oauth-apps.index'))->assertForbidden();
    }

    public function test_tightening_an_apps_rules_ends_its_sessions(): void
    {
        $this->signIn($this->enrolledStudent);

        $this->actingAs($this->mis)->put(route('mis.oauth-apps.update', $this->election), [
            'name' => 'CSG Election',
            'redirect_uris' => [self::CALLBACK],
            'scopes' => ['profile'],
            'allowed_roles' => ['student'],
            'requires_enrollment' => true,
            'skips_consent' => true,
        ])->assertRedirect();

        $this->assertSame(0, DB::table('oauth_access_tokens')->where('revoked', false)->count());
    }

    public function test_a_maintainer_can_replace_only_their_own_apps_secret(): void
    {
        $registrar = app(ClientRegistrar::class);
        $registrar->addMaintainer($this->election, $this->faculty, $this->mis);
        $other = $registrar->register($this->appData('OCC Library'), $this->mis);

        $this->actingAs($this->faculty)
            ->post(route('oauth.my-apps.secret', $this->election))
            ->assertSessionHas('oauth_new_secret');

        $this->actingAs($this->faculty)
            ->post(route('oauth.my-apps.secret', $other))
            ->assertNotFound();
    }

    /* ---------------------------------------------------------------- helpers */

    private function authorizeUrl(array $overrides = []): string
    {
        return '/oauth/authorize?'.http_build_query(array_merge([
            'client_id' => $this->election->getKey(),
            'redirect_uri' => self::CALLBACK,
            'response_type' => 'code',
            'scope' => 'profile enrollment',
            'state' => 'state-123',
        ], $overrides), '', '&', PHP_QUERY_RFC3986);
    }

    private function authorizationCode(User $user, string $scope = 'profile enrollment'): string
    {
        $response = $this->actingAs($user)->get($this->authorizeUrl(['scope' => $scope]));
        $response->assertRedirect();

        $location = $response->headers->get('Location');
        $this->assertStringStartsWith(self::CALLBACK.'?', $location);
        parse_str(parse_url($location, PHP_URL_QUERY), $query);
        $this->assertSame('state-123', $query['state']);

        return $query['code'];
    }

    private function exchange(string $code): TestResponse
    {
        return $this->post('/oauth/token', [
            'grant_type' => 'authorization_code',
            'client_id' => $this->election->getKey(),
            'client_secret' => $this->secret,
            'redirect_uri' => self::CALLBACK,
            'code' => $code,
        ]);
    }

    private function signIn(User $user, string $scope = 'profile enrollment'): string
    {
        $response = $this->exchange($this->authorizationCode($user, $scope));
        $response->assertOk()->assertJsonStructure(['token_type', 'expires_in', 'access_token', 'refresh_token']);

        $this->app['auth']->forgetGuards();

        return $response->json('access_token');
    }

    private function me(string $token): TestResponse
    {
        return $this->getJson('/api/oauth/me', ['Authorization' => 'Bearer '.$token]);
    }

    private function appData(string $name): array
    {
        return [
            'name' => $name,
            'redirect_uris' => ['https://'.str($name)->slug().'.occ.test/callback'],
            'confidential' => true,
            'scopes' => ['profile', 'enrollment'],
            'allowed_roles' => ['student'],
            'requires_enrollment' => true,
            'skips_consent' => true,
        ];
    }

    private static function keyPath(): string
    {
        if (self::$keyPath) {
            return self::$keyPath;
        }

        $dir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'sis-occ-passport-test-keys';

        if (! is_file($dir.'/oauth-private.key')) {
            @mkdir($dir, 0700, true);
            $key = RSA::createKey(2048);
            file_put_contents($dir.'/oauth-private.key', (string) $key);
            file_put_contents($dir.'/oauth-public.key', (string) $key->getPublicKey());
        }

        return self::$keyPath = $dir;
    }

    private function createSchoolTables(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('user_id_no')->unique();
            $table->string('user_role');
            $table->string('email')->nullable();
            $table->string('password');
            $table->boolean('password_change')->default(true);
            $table->boolean('active')->default(true);
            $table->timestamp('first_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('user_information', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email_address')->nullable();
            $table->timestamps();
        });
        Schema::create('semesters', function (Blueprint $table) {
            $table->id();
            $table->string('semester_name');
            $table->timestamps();
        });
        Schema::create('school_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('semester_id');
            $table->integer('start_year');
            $table->integer('end_year');
            $table->boolean('is_current')->default(false);
            $table->timestamps();
        });
        Schema::create('course', function (Blueprint $table) {
            $table->id();
            $table->string('course_name');
            $table->string('major')->nullable();
            $table->string('course_name_abbreviation')->nullable();
            $table->timestamps();
        });
        Schema::create('year_level', function (Blueprint $table) {
            $table->id();
            $table->integer('year_level');
            $table->string('year_level_name');
            $table->timestamps();
        });
        Schema::create('year_section', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_year_id');
            $table->foreignId('course_id');
            $table->foreignId('year_level_id');
            $table->string('section');
            $table->timestamps();
        });
        Schema::create('enrolled_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id');
            $table->foreignId('year_section_id');
            $table->timestamps();
        });
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable();
            $table->string('action');
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('target_type')->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->text('description')->nullable();
            $table->json('properties')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });
    }

    private function seedSchool(): void
    {
        $person = function (string $idNo, string $role, string $first, string $last): User {
            $user = User::forceCreate(['user_id_no' => $idNo, 'user_role' => $role, 'password' => 'secret']);
            DB::table('user_information')->insert(['user_id' => $user->id, 'first_name' => $first, 'last_name' => $last]);

            // Load column defaults (active = true), as a signed-in user would have.
            return $user->refresh();
        };

        $this->mis = $person('MIS-0001', 'mis', 'Mia', 'Santos');
        $this->enrolledStudent = $person('2023-00123', 'student', 'Juan', 'Dela Cruz');
        $this->unenrolledStudent = $person('2022-00456', 'student', 'Maria', 'Reyes');
        $this->faculty = $person('FAC-0042', 'faculty', 'Ana', 'Lopez');

        $semester = DB::table('semesters')->insertGetId(['semester_name' => 'First']);
        $previous = DB::table('school_years')->insertGetId(['semester_id' => $semester, 'start_year' => 2025, 'end_year' => 2026, 'is_current' => false]);
        $current = DB::table('school_years')->insertGetId(['semester_id' => $semester, 'start_year' => 2026, 'end_year' => 2027, 'is_current' => true]);
        $course = DB::table('course')->insertGetId(['course_name' => 'Bachelor of Science in Information Technology', 'course_name_abbreviation' => 'BSIT']);
        $level = DB::table('year_level')->insertGetId(['year_level' => 3, 'year_level_name' => 'Third Year']);

        $section = fn (int $schoolYear) => DB::table('year_section')->insertGetId([
            'school_year_id' => $schoolYear, 'course_id' => $course, 'year_level_id' => $level, 'section' => 'A',
        ]);

        DB::table('enrolled_students')->insert([
            ['student_id' => $this->enrolledStudent->id, 'year_section_id' => $section($current)],
            // Enrolled last year only.
            ['student_id' => $this->unenrolledStudent->id, 'year_section_id' => $section($previous)],
        ]);

        $this->actingAs($this->mis);
        $this->election = app(ClientRegistrar::class)->register([
            'name' => 'CSG Election',
            'description' => 'Vote for your student government officers.',
            'redirect_uris' => [self::CALLBACK],
            'confidential' => true,
            'scopes' => ['profile', 'enrollment'],
            'allowed_roles' => ['student'],
            'requires_enrollment' => true,
            'skips_consent' => true,
        ], $this->mis);
        $this->secret = $this->election->plainSecret;
        $this->app['auth']->forgetGuards();
    }
}
