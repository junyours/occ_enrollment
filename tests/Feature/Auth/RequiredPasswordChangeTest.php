<?php

namespace Tests\Feature\Auth;

use App\Http\Middleware\DatabaseBasedMaintenance;
use App\Http\Middleware\LogAuthenticatedUserActivity;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RequiredPasswordChangeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Never run the legacy MySQL migrations or touch the application's database.
        config([
            'app.timezone' => 'Asia/Manila',
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
        $this->travelTo(now()->setDate(2026, 10, 26)->setTime(12, 0));

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('user_id_no')->unique();
            $table->string('email')->nullable();
            $table->string('password');
            $table->string('user_role')->default('student');
            $table->boolean('password_change')->nullable()->default(false);
            $table->timestamp('first_login_at')->nullable();
            $table->boolean('active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('user_information', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->timestamps();
        });
        Schema::create('school_years', function (Blueprint $table) {
            $table->id();
            $table->date('start_date');
            $table->date('end_date');
            $table->timestamps();
        });
        Schema::create('password_gate_sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->text('payload');
            $table->integer('last_activity');
        });
        $migration = require database_path('migrations/2019_12_14_000001_create_personal_access_tokens_table.php');
        $migration->up();

        // These unrelated concerns do not affect enforcement or password validation.
        $this->withoutMiddleware([LogAuthenticatedUserActivity::class, DatabaseBasedMaintenance::class]);
        $this->withoutVite();

        Route::middleware(['web', 'auth'])->group(function () {
            Route::get('/__test/password-gate', fn () => response('protected'));
            Route::post('/__test/password-gate/profile', function (Request $request) {
                $request->user()->update(['email' => 'changed@example.test']);
                return response('changed');
            });
        });
        Route::middleware(['api', 'auth:sanctum'])->get('/api/__test/password-gate', fn () => response()->json(['protected' => true]));
    }

    public function test_only_false_flags_for_accounts_created_on_or_after_the_cutoff_require_a_change(): void
    {
        foreach ([false, 0, '0'] as $flag) {
            $user = new User;
            $user->setRawAttributes(['password_change' => $flag, 'created_at' => '2026-10-26 09:00:00']);
            $this->assertTrue($user->requiresPasswordChange());
        }
    }

    public function test_true_and_null_flags_are_exempt_even_for_new_accounts(): void
    {
        foreach ([true, 1, '1', null] as $flag) {
            $user = new User;
            $user->setRawAttributes(['password_change' => $flag, 'created_at' => '2026-10-26 09:00:00']);
            $this->assertFalse($user->requiresPasswordChange());
        }
    }

    public function test_creation_exactly_at_midnight_and_all_later_creation_dates_require_a_change(): void
    {
        foreach (['2026-10-26 00:00:00', '2026-10-26 23:59:59', '2026-10-27 00:00:00'] as $timestamp) {
            $this->assertTrue($this->user(['created_at' => $timestamp, 'updated_at' => $timestamp])->requiresPasswordChange());
        }
    }

    public function test_missing_created_at_is_exempt(): void
    {
        $this->assertFalse($this->user(['created_at' => null])->requiresPasswordChange());
    }

    public function test_existing_authenticated_sessions_are_redirected_to_the_required_screen(): void
    {
        $user = $this->user();
        $this->actingAs($user)->get('/__test/password-gate')->assertRedirect(route('password.required'));
        $this->assertAuthenticatedAs($user);
        $this->assertSame('2026-10-26 10:00:00', $user->fresh()->updated_at->format('Y-m-d H:i:s'));
    }

    public function test_an_unrelated_profile_write_cannot_advance_the_timestamp_to_bypass_the_gate(): void
    {
        $user = $this->user();
        $this->actingAs($user)->post('/__test/password-gate/profile')->assertRedirect(route('password.required'));
        $user->refresh();
        $this->assertNotSame('changed@example.test', $user->email);
        $this->assertTrue($user->requiresPasswordChange());
    }

    public function test_existing_password_endpoints_cannot_bypass_the_required_flow(): void
    {
        $user = $this->user();
        $this->actingAs($user);
        foreach (['/password', '/profile/password'] as $path) {
            $this->put($path, $this->payload())->assertRedirect(route('password.required'));
        }
        $this->assertTrue(Hash::check('OldPassword123', $user->fresh()->password));
        $this->assertFalse((bool) $user->fresh()->password_change);
    }

    public function test_exempt_accounts_keep_access_to_protected_routes(): void
    {
        foreach ([['password_change' => true], ['created_at' => '2026-10-25 09:00:00', 'updated_at' => '2026-10-26 10:00:00'], ['password_change' => null]] as $attributes) {
            $this->actingAs($this->user($attributes))->get('/__test/password-gate')->assertOk()->assertSee('protected');
        }
    }

    public function test_guests_cannot_open_or_submit_the_required_password_form(): void
    {
        $this->get('/password/change-required')->assertRedirect(route('login'));
        $this->put('/password/change-required', $this->payload())->assertRedirect(route('login'));
    }

    public function test_required_page_is_available_without_redirect_loops_for_all_roles(): void
    {
        foreach (['student', 'faculty', 'super_admin'] as $role) {
            $this->actingAs($this->user(['user_role' => $role]))->get('/password/change-required')
                ->assertOk()->assertInertia(fn (Assert $page) => $page->component('Auth/RequiredPasswordChange'));
        }
    }

    public function test_exempt_accounts_are_redirected_out_of_the_required_page(): void
    {
        $this->actingAs($this->user(['password_change' => true]))->get('/password/change-required')->assertRedirect('/');
    }

    public function test_affected_users_can_still_log_out(): void
    {
        $this->actingAs($this->user())->post('/logout')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_login_enforces_the_new_account_creation_date_before_recording_the_first_login(): void
    {
        $user = $this->user(['first_login_at' => null]);
        $this->post('/login', ['user_id_no' => $user->user_id_no, 'password' => 'OldPassword123', 'remember' => true])
            ->assertSessionHasNoErrors()->assertRedirect(route('password.required'));
        $this->assertAuthenticatedAs($user);
        $user->refresh();
        $this->assertNull($user->first_login_at);
        $this->assertSame('2026-10-26 10:00:00', $user->updated_at->format('Y-m-d H:i:s'));
        $this->assertTrue($user->requiresPasswordChange());
    }

    public function test_exempt_login_retains_the_normal_destination_and_first_login_recording(): void
    {
        $user = $this->user(['created_at' => '2026-10-25 09:00:00', 'updated_at' => '2026-10-26 10:00:00']);
        $this->post('/login', ['user_id_no' => $user->user_id_no, 'password' => 'OldPassword123'])
            ->assertSessionHasNoErrors()->assertRedirect(route('classes', absolute: false));
        $this->assertNotNull($user->fresh()->first_login_at);
    }

    public function test_authenticated_first_login_can_choose_a_new_password_without_entering_the_current_password_again(): void
    {
        $user = $this->user();
        $this->post('/login', ['user_id_no' => $user->user_id_no, 'password' => 'OldPassword123'])
            ->assertSessionHasNoErrors()->assertRedirect(route('password.required'));
        $this->assertAuthenticatedAs($user);

        $this->from('/password/change-required')->put('/password/change-required', $this->payload())
            ->assertSessionHasNoErrors()->assertRedirect('/');
        $this->assertTrue(Hash::check('NewPassword456', $user->fresh()->password));
        $this->assertTrue((bool) $user->fresh()->password_change);
        $this->assertFalse($user->fresh()->requiresPasswordChange());
    }
    public function test_required_change_rejects_reusing_the_current_password(): void
    {
        $user = $this->user();
        $this->actingAs($user)->from('/password/change-required')->put('/password/change-required', $this->payload([
            'password' => 'OldPassword123', 'password_confirmation' => 'OldPassword123',
        ]))->assertSessionHasErrors('password');
        $this->assertTrue($user->fresh()->requiresPasswordChange());
    }

    public function test_required_change_rejects_mismatched_confirmation(): void
    {
        $user = $this->user();
        $this->actingAs($user)->from('/password/change-required')->put('/password/change-required', $this->payload([
            'password_confirmation' => 'DifferentPassword123',
        ]))->assertSessionHasErrors('password');
        $this->assertTrue($user->fresh()->requiresPasswordChange());
    }

    public function test_required_change_enforces_password_strength_and_bcrypt_byte_limits(): void
    {
        $user = $this->user();
        $this->actingAs($user);
        foreach (['Short1', 'lowercase123', 'UPPERCASE123', 'NoNumbersHere', str_repeat('a', 71).'A1', str_repeat('é', 35).'Aa1', "New\0Password123"] as $password) {
            $this->from('/password/change-required')->put('/password/change-required', $this->payload([
                'password' => $password, 'password_confirmation' => $password,
            ]))->assertSessionHasErrors('password');
        }
        $this->assertTrue(Hash::check('OldPassword123', $user->fresh()->password));
        $this->assertTrue($user->fresh()->requiresPasswordChange());
    }

    public function test_successful_change_updates_the_flag_records_first_login_and_rotates_remember_token(): void
    {
        $user = $this->user(['remember_token' => 'old-remember-token']);
        $this->actingAs($user)->from('/password/change-required')->put('/password/change-required', $this->payload())
            ->assertSessionHasNoErrors()->assertRedirect('/');
        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword456', $user->password));
        $this->assertTrue((bool) $user->password_change);
        $this->assertNotNull($user->first_login_at);
        $this->assertNotSame('old-remember-token', $user->remember_token);
        $this->assertFalse($user->requiresPasswordChange());
        $this->actingAs($user)->get('/__test/password-gate')->assertOk();
    }

    public function test_successful_change_returns_to_the_original_protected_page(): void
    {
        $user = $this->user();
        $this->actingAs($user)->get('/__test/password-gate')->assertRedirect(route('password.required'));
        $this->get('/password/change-required')->assertOk();
        $this->put('/password/change-required', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/__test/password-gate');
    }

    public function test_an_existing_first_login_timestamp_is_preserved(): void
    {
        $user = $this->user(['first_login_at' => '2026-10-26 09:30:00']);
        $this->actingAs($user)->put('/password/change-required', $this->payload())->assertSessionHasNoErrors();
        $this->assertSame('2026-10-26 09:30:00', (string) $user->fresh()->first_login_at);
    }

    public function test_successful_required_change_revokes_only_this_users_mobile_tokens(): void
    {
        $user = $this->user();
        $other = $this->user();
        $user->createToken('first-device');
        $user->createToken('second-device');
        $otherToken = $other->createToken('other-device')->accessToken;
        $this->actingAs($user)->put('/password/change-required', $this->payload())->assertSessionHasNoErrors();
        $this->assertSame(0, $user->tokens()->count());
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $otherToken->id]);
    }

    public function test_successful_required_change_revokes_other_web_sessions_but_keeps_the_current_one(): void
    {
        $user = $this->user();
        $other = $this->user();
        config(['session.driver' => 'database', 'session.table' => 'password_gate_sessions', 'session.connection' => 'sqlite']);
        DB::table('password_gate_sessions')->insert([
            ['id' => 'old-own-session', 'user_id' => $user->id, 'payload' => base64_encode(''), 'last_activity' => now()->timestamp],
            ['id' => 'other-user-session', 'user_id' => $other->id, 'payload' => base64_encode(''), 'last_activity' => now()->timestamp],
        ]);
        $this->actingAs($user)->put('/password/change-required', $this->payload())->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('password_gate_sessions', ['id' => 'old-own-session']);
        $this->assertDatabaseHas('password_gate_sessions', ['id' => 'other-user-session']);
        $this->assertAuthenticatedAs($user);
    }

    public function test_normal_password_handlers_also_record_the_changed_flag(): void
    {
        foreach (['/password', '/profile/password'] as $path) {
            $user = $this->user(['created_at' => '2026-10-25 09:00:00', 'updated_at' => '2026-10-26 10:00:00']);
            $this->actingAs($user)->from('/settings')->put($path, $this->payload(['current_password' => 'OldPassword123']))->assertSessionHasNoErrors();
            $this->assertTrue((bool) $user->fresh()->password_change);
            $this->assertTrue(Hash::check('NewPassword456', $user->fresh()->password));
        }
    }

    public function test_protected_api_requests_return_an_actionable_password_change_response(): void
    {
        $user = $this->user();
        $token = $user->createToken('new-device')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/__test/password-gate')
            ->assertForbidden()->assertJsonPath('password_change_required', true)
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED')
            ->assertJsonPath('change_password_url', route('password.required'));
    }

    public function test_exempt_bearer_tokens_still_access_the_api(): void
    {
        $user = $this->user(['password_change' => true]);
        $token = $user->createToken('current-device')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/__test/password-gate')
            ->assertOk()->assertJsonPath('protected', true);
    }

    public function test_json_web_requests_cannot_bypass_the_password_gate(): void
    {
        $this->actingAs($this->user())->postJson('/__test/password-gate/profile', ['email' => 'changed@example.test'])
            ->assertForbidden()->assertJsonPath('password_change_required', true);
    }

    public function test_mobile_login_reports_when_password_change_is_required(): void
    {
        $user = $this->user();
        $this->postJson('/api/mobile/login', ['user_id_no' => $user->user_id_no, 'password' => 'OldPassword123'])
            ->assertOk()->assertJsonPath('password_change_required', true)->assertJsonStructure(['token']);
    }

    public function test_csg_login_reports_when_password_change_is_required(): void
    {
        $user = $this->user();
        $this->postJson('/api/csg-attendance/login', ['user_id_no' => $user->user_id_no, 'password' => 'OldPassword123'])
            ->assertOk()->assertJsonPath('password_change_required', true)->assertJsonStructure(['token']);
    }

    public function test_authenticated_mobile_login_can_choose_a_new_password_without_reentering_the_current_password(): void
    {
        $user = $this->user();
        $response = $this->postJson('/api/mobile/login', ['user_id_no' => $user->user_id_no, 'password' => 'OldPassword123'])
            ->assertOk()->assertJsonPath('password_change_required', true);
        $token = $response->json('token');

        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/mobile/change-password', $this->payload())
            ->assertOk()->assertJsonPath('password_change_required', false);
        $this->assertTrue(Hash::check('NewPassword456', $user->fresh()->password));
        $this->assertTrue((bool) $user->fresh()->password_change);
    }
    public function test_mobile_required_change_cannot_reuse_the_current_password(): void
    {
        $user = $this->user();
        $token = $user->createToken('new-device')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/mobile/change-password', $this->payload([
            'password' => 'OldPassword123', 'password_confirmation' => 'OldPassword123',
        ]))->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertTrue($user->fresh()->requiresPasswordChange());
    }

    public function test_mobile_required_change_updates_the_password_and_flag(): void
    {
        $user = $this->user();
        $token = $user->createToken('new-device')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/mobile/change-password', $this->payload())
            ->assertOk()->assertJsonPath('password_change_required', false);
        $this->assertTrue(Hash::check('NewPassword456', $user->fresh()->password));
        $this->assertTrue((bool) $user->fresh()->password_change);
    }

    public function test_affected_mobile_tokens_can_log_out(): void
    {
        $user = $this->user();
        $token = $user->createToken('new-device')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/mobile/logout')->assertSuccessful();
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_blocked_inertia_password_write_redirects_with_get_without_changing_credentials(): void
    {
        $user = $this->user();
        $this->actingAs($user)->withHeader('X-Inertia', 'true')->put('/profile/password', $this->payload())
            ->assertStatus(303)->assertRedirect(route('password.required'));

        $user->refresh();
        $this->assertTrue(Hash::check('OldPassword123', $user->password));
        $this->assertFalse((bool) $user->password_change);
        $this->assertSame('2026-10-26 10:00:00', $user->updated_at->format('Y-m-d H:i:s'));
        $this->assertTrue($user->requiresPasswordChange());
    }
    public function test_june_24_accounts_remain_exempt_with_flag_zero_and_recent_updates(): void
    {
        $user = $this->user([
            'created_at' => '2026-06-24 09:00:00',
            'updated_at' => '2026-10-26 11:00:00',
            'password_change' => 0,
        ]);
        $this->assertFalse($user->requiresPasswordChange());
        $this->actingAs($user)->get('/__test/password-gate')->assertOk()->assertSee('protected');
        $this->post('/logout')->assertRedirect('/login');

        $this->post('/login', ['user_id_no' => $user->user_id_no, 'password' => 'OldPassword123'])
            ->assertSessionHasNoErrors()->assertRedirect(route('classes', absolute: false));
        $user->refresh();
        $this->assertNotNull($user->first_login_at);
        $this->assertSame('2026-06-24 09:00:00', $user->created_at->format('Y-m-d H:i:s'));
        $this->assertFalse((bool) $user->password_change);
        $this->assertFalse($user->requiresPasswordChange());
    }
    public function test_unrelated_model_and_database_updates_cannot_remove_the_requirement_for_new_accounts(): void
    {
        foreach ([false, true] as $directDatabaseUpdate) {
            $user = $this->user();
            $changes = ['email' => 'admin-updated@example.test', 'updated_at' => now()];
            if ($directDatabaseUpdate) {
                DB::table('users')->where('id', $user->id)->update($changes);
            } else {
                $user->forceFill($changes)->save();
            }

            $user->refresh();
            $this->assertSame('admin-updated@example.test', $user->email);
            $this->assertSame('2026-10-26 09:00:00', $user->created_at->format('Y-m-d H:i:s'));
            $this->assertTrue($user->updated_at->eq(now()));
            $this->assertFalse((bool) $user->password_change);
            $this->assertTrue($user->requiresPasswordChange());
            $this->actingAs($user)->get('/__test/password-gate')->assertRedirect(route('password.required'));
        }
    }
    public function test_normal_web_password_changes_still_require_the_current_password_for_exempt_accounts(): void
    {
        foreach (['/password', '/profile/password'] as $path) {
            $user = $this->user(['password_change' => true]);
            $this->actingAs($user)->from('/settings')->put($path, $this->payload())
                ->assertSessionHasErrors('current_password');
            $this->from('/settings')->put($path, $this->payload(['current_password' => 'IncorrectPassword123']))
                ->assertSessionHasErrors('current_password');
            $this->assertTrue(Hash::check('OldPassword123', $user->fresh()->password));
        }
    }

    public function test_normal_mobile_password_changes_still_require_the_current_password_for_exempt_accounts(): void
    {
        $user = $this->user(['password_change' => true]);
        $token = $user->createToken('normal-device')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/mobile/change-password', $this->payload())
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertTrue(Hash::check('OldPassword123', $user->fresh()->password));
    }

    public function test_a_stale_authenticated_user_cannot_use_the_required_flow_after_becoming_exempt(): void
    {
        $user = $this->user();
        DB::table('users')->where('id', $user->id)->update([
            'password' => Hash::make('AlreadyChangedPassword123'),
            'password_change' => true, 'updated_at' => now(),
        ]);

        // Keep the authenticated model stale; the service must recheck the locked row.
        $this->actingAs($user)->from('/password/change-required')->put('/password/change-required', $this->payload())
            ->assertSessionHasErrors('general');
        $this->assertTrue(Hash::check('AlreadyChangedPassword123', $user->fresh()->password));
        $this->assertTrue((bool) $user->fresh()->password_change);
    }
    public function test_accounts_created_before_the_cutoff_do_not_require_a_change(): void
    {
        foreach (['2026-06-24 09:00:00', '2026-10-25 23:59:59'] as $timestamp) {
            $this->assertFalse($this->user(['created_at' => $timestamp, 'updated_at' => now()])->requiresPasswordChange());
        }
    }

    public function test_old_accounts_with_recent_edits_receive_false_login_metadata_from_both_apis(): void
    {
        foreach (['/api/mobile/login', '/api/csg-attendance/login'] as $path) {
            $user = $this->user(['created_at' => '2026-06-24 09:00:00', 'updated_at' => now(), 'password_change' => 0]);
            $this->postJson($path, ['user_id_no' => $user->user_id_no, 'password' => 'OldPassword123'])
                ->assertOk()->assertJsonPath('password_change_required', false)->assertJsonStructure(['token']);
        }
    }

    public function test_old_flag_zero_mobile_accounts_have_access_but_normal_password_changes_still_require_the_current_password(): void
    {
        $user = $this->user(['created_at' => '2026-06-24 09:00:00', 'updated_at' => now(), 'password_change' => 0]);
        $response = $this->postJson('/api/mobile/login', ['user_id_no' => $user->user_id_no, 'password' => 'OldPassword123'])
            ->assertOk()->assertJsonPath('password_change_required', false);
        $this->withHeader('Authorization', 'Bearer '.$response->json('token'));

        $this->getJson('/api/__test/password-gate')->assertOk()->assertJsonPath('protected', true);
        $this->postJson('/api/mobile/change-password', $this->payload())
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertTrue(Hash::check('OldPassword123', $user->fresh()->password));

        $this->postJson('/api/mobile/change-password', $this->payload(['current_password' => 'OldPassword123']))
            ->assertOk()->assertJsonPath('password_change_required', false);
        $this->assertTrue(Hash::check('NewPassword456', $user->fresh()->password));
        $this->assertTrue((bool) $user->fresh()->password_change);
    }
    private function payload(array $overrides = []): array
    {
        return ['password' => 'NewPassword456', 'password_confirmation' => 'NewPassword456', ...$overrides];
    }

    private function user(array $overrides = []): User
    {
        $number = 'TEST-'.(DB::table('users')->count() + 1);
        $id = DB::table('users')->insertGetId([
            'user_id_no' => $number,
            'email' => strtolower($number).'@example.test',
            'password' => Hash::make('OldPassword123'),
            'user_role' => 'student', 'password_change' => false, 'first_login_at' => null,
            'active' => true, 'remember_token' => 'remember-token',
            'created_at' => '2026-10-26 09:00:00', 'updated_at' => '2026-10-26 10:00:00',
            ...$overrides,
        ]);

        return User::findOrFail($id);
    }
}
