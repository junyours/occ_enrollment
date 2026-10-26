<?php

namespace Tests\Feature\Auth;

use App\Mail\PasswordResetMail;
use App\Models\User;
use App\Services\PasswordResetOtp;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Avoid RefreshDatabase: .env points to the application database, and
        // legacy migrations contain MySQL-only SQL. This suite uses only SQLite.
        config([
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

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('user_id_no')->unique();
            $table->string('email')->nullable();
            $table->string('password');
            $table->string('user_role')->default('student');
            $table->boolean('password_change')->default(false);
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
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
        Schema::create('recovery_sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->text('payload')->nullable();
            $table->integer('last_activity')->default(0);
        });
        $tokenMigration = require database_path('migrations/2019_12_14_000001_create_personal_access_tokens_table.php');
        $tokenMigration->up();

        $migration = require database_path('migrations/2026_10_26_000000_create_password_reset_otps_table.php');
        $migration->up();
        Mail::fake();
        $this->withoutVite();
    }

    public function test_forgot_password_page_can_be_opened(): void
    {
        $this->get('/forgot-password')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Auth/ForgotPassword'));
    }

    public function test_lookup_only_exposes_masked_contact_information(): void
    {
        $user = $this->user();
        DB::table('user_information')->insert([
            'user_id' => $user->id, 'first_name' => 'María', 'last_name' => 'Santos',
        ]);
        $this->selectAccount($user);
        $this->get('/forgot-password')->assertInertia(fn (Assert $page) => $page
            ->component('Auth/ForgotPassword')->where('user_found', true)
            ->where('user_data.user_id_no', $user->user_id_no)
            ->where('user_data.masked_email', fn ($value) => is_string($value)
                && str_contains($value, '*') && $value !== $user->email)
            ->missing('user_data.email'));
        Mail::assertNothingSent();
    }

    public function test_unknown_accounts_and_accounts_without_email_cannot_receive_codes(): void
    {
        $this->from('/forgot-password')->post('/find-user', ['user_id_no' => 'UNKNOWN'])->assertSessionHasErrors();
        $user = $this->user(['email' => null]);
        $this->from('/forgot-password')->post('/find-user', ['user_id_no' => $user->user_id_no])->assertSessionHasErrors();
        Mail::assertNothingSent();
        $this->assertDatabaseCount('password_reset_otps', 0);
    }

    public function test_sending_a_code_requires_a_selected_account(): void
    {
        $user = $this->user();
        $this->post('/forgot-password', ['user_id_no' => $user->user_id_no, 'email' => $user->email])->assertSessionHasErrors();
        Mail::assertNothingSent();
        $this->assertDatabaseCount('password_reset_otps', 0);
    }

    public function test_emailed_six_digit_code_is_stored_only_as_a_hash(): void
    {
        $user = $this->user();
        $code = $this->requestCode($user);
        $record = DB::table('password_reset_otps')->where('user_id', $user->id)->first();
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $this->assertNotSame($code, $record->code_hash);
        $this->assertTrue(Hash::check($code, $record->code_hash));
        $this->assertSame($user->email, $record->email);
        $this->assertSame(0, (int) $record->attempts);
        $this->assertSame($record->request_id, session('password_recovery.request_id'));
        Mail::assertSent(PasswordResetMail::class, function ($mail) use ($user, $code) {
            $html = $mail->render();

            return $mail->hasTo($user->email) && $mail->expiresInMinutes === 10
                && str_contains($html, $code) && ! str_contains($html, '/reset-password/');
        });
        $this->get('/reset-password')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Auth/ResetPassword')->where('code_verified', false)->missing('email')->missing('token'));
    }

    public function test_posted_account_and_email_cannot_change_the_recipient(): void
    {
        $user = $this->user();
        $other = $this->user(['user_id_no' => 'OTHER-001', 'email' => 'other@example.test']);
        $this->selectAccount($user);
        $this->post('/forgot-password', ['user_id_no' => $other->user_id_no, 'email' => $other->email])->assertSessionHasNoErrors();
        Mail::assertSent(PasswordResetMail::class, fn ($mail) => $mail->hasTo($user->email));
        Mail::assertNotSent(PasswordResetMail::class, fn ($mail) => $mail->hasTo($other->email));
        $this->assertDatabaseHas('password_reset_otps', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('password_reset_otps', ['user_id' => $other->id]);
    }

    public function test_valid_code_resets_password_rotates_remember_token_and_clears_session(): void
    {
        Event::fake([PasswordReset::class]);
        $user = $this->user();
        $rememberToken = $user->remember_token;
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()
            ->assertRedirect('/login')->assertSessionMissing('password_recovery');
        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword123', $user->password));
        $this->assertNotSame($rememberToken, $user->remember_token);
        $this->assertTrue((bool) $user->password_change);
        Event::assertDispatched(PasswordReset::class, fn ($event) => $event->user->is($user));
        $this->assertGuest();
    }

    public function test_accounts_sharing_an_email_cannot_reset_each_other(): void
    {
        $user = $this->user();
        $other = $this->user(['user_id_no' => 'OTHER-001', 'email' => $user->email]);
        $oldPassword = $other->password;
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $this->post('/reset-password', [
            ...$this->payload(), 'email' => $other->email,
            'user_id_no' => $other->user_id_no, 'user_id' => $other->id,
        ])->assertSessionHasNoErrors()->assertRedirect('/login');
        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
        $this->assertSame($oldPassword, $other->fresh()->password);
    }

    public function test_wrong_code_preserves_password_and_a_valid_retry_works(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->from('/reset-password')->post('/reset-password/verify', ['otp' => $this->wrongCode($code)])
            ->assertSessionHasErrors('otp');
        $this->assertSame($oldPassword, $user->fresh()->password);
        $this->assertDatabaseHas('password_reset_otps', ['user_id' => $user->id, 'attempts' => 1]);
        $this->verifyCode($code);
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
    }

    public function test_code_expires_after_ten_minutes(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->travel(10)->minutes();
        $this->from('/reset-password')->post('/reset-password/verify', ['otp' => $code])->assertSessionHasErrors('otp');
        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    public function test_five_wrong_attempts_lock_the_current_code(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->from('/reset-password')->post('/reset-password/verify', ['otp' => $this->wrongCode($code)])
                ->assertSessionHasErrors('otp');
        }
        $this->post('/reset-password/verify', ['otp' => $code])->assertSessionHasErrors('otp');
        $this->post('/reset-password', $this->payload())->assertSessionHasErrors();
        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    public function test_resend_cooldown_is_enforced_on_the_server(): void
    {
        $user = $this->user();
        $this->requestCode($user);
        $this->from('/reset-password')->post('/forgot-password')->assertSessionHasErrors();
        Mail::assertSent(PasswordResetMail::class, 1);
        $this->travel(61)->seconds();
        $this->post('/forgot-password')->assertSessionHasNoErrors();
        Mail::assertSent(PasswordResetMail::class, 2);
    }

    public function test_resending_invalidates_the_previous_code(): void
    {
        $user = $this->user();
        $oldCode = $this->requestCode($user);
        $requestId = session('password_recovery.request_id');
        $this->travel(61)->seconds();
        $this->post('/forgot-password')->assertSessionHasNoErrors();
        $newCode = Mail::sent(PasswordResetMail::class)->last()->code;
        $this->assertNotSame($requestId, session('password_recovery.request_id'));
        $this->from('/reset-password')->post('/reset-password/verify', ['otp' => $oldCode])->assertSessionHasErrors('otp');
        $this->verifyCode($newCode);
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
    }

    public function test_restart_does_not_bypass_the_hourly_send_limit(): void
    {
        $user = $this->user();
        $this->requestCode($user);
        for ($send = 1; $send < 5; $send++) {
            $this->travel(61)->seconds();
            $this->post('/forgot-password')->assertSessionHasNoErrors();
        }
        $this->post('/forgot-password/restart')->assertRedirect('/forgot-password');
        $this->selectAccount($user);
        $this->travel(61)->seconds();
        $this->post('/forgot-password')->assertSessionHasErrors();
        Mail::assertSent(PasswordResetMail::class, 5);
    }

    public function test_code_requires_the_session_it_was_issued_to(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->withSession(['password_recovery' => [
            'user_id' => $user->id, 'selected_at' => now()->timestamp, 'request_id' => null,
        ]])->post('/reset-password/verify', ['otp' => $code])->assertSessionHasErrors();
        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    public function test_changing_email_invalidates_an_existing_code(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $user->update(['email' => 'changed@example.test']);
        $this->from('/reset-password')->post('/reset-password/verify', ['otp' => $code])->assertSessionHasErrors('otp');
        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    public function test_changing_password_invalidates_an_existing_code(): void
    {
        $user = $this->user();
        $code = $this->requestCode($user);
        $user->update(['password' => Hash::make('ChangedPassword123')]);
        $oldPassword = $user->password;
        $this->from('/reset-password')->post('/reset-password/verify', ['otp' => $code])->assertSessionHasErrors('otp');
        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    public function test_reset_screen_and_old_links_require_the_new_flow(): void
    {
        $this->get('/reset-password')->assertRedirect('/forgot-password');
        $this->get('/reset-password/old-link-token?email=user@example.test')->assertRedirect('/forgot-password');
        $this->post('/reset-password', [
            'token' => 'old-link-token', 'email' => 'user@example.test',
            'password' => 'NewPassword123', 'password_confirmation' => 'NewPassword123',
        ])->assertSessionHasErrors();
    }

    public function test_code_cannot_be_reused_after_success(): void
    {
        $user = $this->user();
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $recovery = session('password_recovery');
        $this->post('/reset-password', $this->payload())->assertRedirect('/login');
        $this->withSession(['password_recovery' => $recovery])
            ->post('/reset-password', $this->payload('AnotherPassword456'))->assertSessionHasErrors();
        $this->post('/reset-password/verify', ['otp' => $code])->assertSessionHasErrors();
        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
    }

    public function test_password_rules_and_confirmation_are_enforced(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        foreach (['short1A', 'onlylowercase123', 'ONLYUPPERCASE123', 'NoNumbersHere', str_repeat('A', 71).'a1'] as $password) {
            $this->from('/reset-password')->post('/reset-password', $this->payload($password))->assertSessionHasErrors('password');
        }
        $this->post('/reset-password', [
            ...$this->payload(), 'password_confirmation' => 'DifferentPassword123',
        ])->assertSessionHasErrors('password');
        $this->assertSame($oldPassword, $user->fresh()->password);
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
    }

    public function test_malformed_codes_do_not_change_password(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $this->requestCode($user);
        foreach (['12345', '1234567', 'abcdef', '123 45'] as $code) {
            $this->from('/reset-password')->post('/reset-password/verify', ['otp' => $code])->assertSessionHasErrors('otp');
        }
        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    public function test_restart_clears_recovery_session(): void
    {
        $user = $this->user();
        $this->requestCode($user);
        $this->post('/forgot-password/restart')->assertRedirect('/forgot-password')->assertSessionMissing('password_recovery');
        $this->get('/reset-password')->assertRedirect('/forgot-password');
    }

    public function test_mail_failure_returns_a_safe_recoverable_error(): void
    {
        $user = $this->user();
        $this->selectAccount($user);
        Mail::shouldReceive('to')->once()->with($user->email)->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new \RuntimeException('private SMTP credentials detail'));
        $this->from('/forgot-password')->post('/forgot-password')->assertSessionHasErrors();
        $this->assertStringNotContainsString('private SMTP credentials detail', json_encode(session('errors')->getBag('default')->messages()));
        $this->get('/reset-password')->assertRedirect('/forgot-password');
    }

    public function test_codes_with_leading_zeroes_can_be_verified(): void
    {
        $user = $this->user();
        $this->requestCode($user);
        DB::table('password_reset_otps')->where('user_id', $user->id)->update(['code_hash' => Hash::make('012345')]);
        $this->verifyCode('012345');
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
    }

    public function test_current_password_cannot_be_reused_and_does_not_consume_the_code(): void
    {
        $user = $this->user();
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $this->from('/reset-password')->post('/reset-password', $this->payload('OldPassword123'))->assertSessionHasErrors('password');
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
    }

    public function test_account_selection_expires_after_thirty_minutes(): void
    {
        $user = $this->user();
        $this->selectAccount($user);
        $this->travel(30)->minutes();
        $this->post('/forgot-password')->assertSessionHasErrors()->assertSessionMissing('password_recovery');
        Mail::assertNothingSent();
    }

    public function test_successful_reset_revokes_only_the_accounts_sanctum_tokens(): void
    {
        $user = $this->user();
        $other = $this->user(['user_id_no' => 'OTHER-001', 'email' => 'other@example.test']);
        $user->createToken('phone');
        $user->createToken('tablet');
        $otherToken = $other->createToken('other-phone')->accessToken;
        $this->assertDatabaseCount('personal_access_tokens', 3);
        $code = $this->requestCode($user);
        $this->verifyCode($code);

        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');

        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(1, $other->tokens()->count());
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $otherToken->id]);
    }

    public function test_successful_reset_revokes_only_the_accounts_database_sessions(): void
    {
        $user = $this->user();
        $other = $this->user(['user_id_no' => 'OTHER-001', 'email' => 'other@example.test']);
        DB::table('recovery_sessions')->insert([
            ['id' => 'own-phone', 'user_id' => $user->id],
            ['id' => 'own-desktop', 'user_id' => $user->id],
            ['id' => 'other-session', 'user_id' => $other->id],
        ]);
        config([
            'session.driver' => 'database', 'session.connection' => 'sqlite', 'session.table' => 'recovery_sessions',
        ]);
        $codes = app(PasswordResetOtp::class);
        $delivery = $codes->issue($user);
        $verified = $codes->verify($user, $delivery['request_id'], $delivery['code']);
        $this->assertArrayNotHasKey('error', $verified);

        // Avoid HTTP's database session handler creating an unrelated guest row.
        $result = $codes->reset($user, $delivery['request_id'], 'NewPassword123');

        $this->assertArrayHasKey('user', $result);
        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
        $this->assertDatabaseMissing('recovery_sessions', ['user_id' => $user->id]);
        $this->assertDatabaseHas('recovery_sessions', ['id' => 'other-session', 'user_id' => $other->id]);
        $this->assertDatabaseCount('recovery_sessions', 1);
    }

    public function test_null_characters_are_rejected_without_consuming_the_code(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->verifyCode($code);

        $this->from('/reset-password')->post('/reset-password', $this->payload("Secure\0Password123"))
            ->assertRedirect('/reset-password')->assertSessionHasErrors('password');

        $this->assertSame($oldPassword, $user->fresh()->password);
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
    }

    public function test_utf8_passwords_over_seventy_two_bytes_are_rejected(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $password = 'Aa1'.str_repeat('é', 35);
        $this->assertLessThan(72, mb_strlen($password));
        $this->assertGreaterThan(72, strlen($password));

        $this->from('/reset-password')->post('/reset-password', $this->payload($password))
            ->assertRedirect('/reset-password')->assertSessionHasErrors('password');

        $this->assertSame($oldPassword, $user->fresh()->password);
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
    }

    public function test_valid_unicode_passwords_can_be_used(): void
    {
        $user = $this->user();
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $password = 'SécurePassword123';

        $this->post('/reset-password', $this->payload($password))
            ->assertSessionHasNoErrors()->assertRedirect('/login');

        $this->assertTrue(Hash::check($password, $user->fresh()->password));
    }

    public function test_resending_near_session_expiry_gives_the_new_code_its_full_lifetime(): void
    {
        $user = $this->user();
        $this->requestCode($user);
        $firstSelection = session('password_recovery.selected_at');
        $this->travel(29)->minutes();
        $this->post('/forgot-password')->assertSessionHasNoErrors()->assertRedirect('/reset-password');
        $newCode = Mail::sent(PasswordResetMail::class)->last()->code;
        $this->assertGreaterThan($firstSelection, session('password_recovery.selected_at'));
        $this->travel(2)->minutes();
        $this->get('/reset-password')->assertOk();
        $this->verifyCode($newCode);
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
    }

    public function test_verifying_the_code_unlocks_password_entry_without_changing_the_password(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->get('/reset-password')->assertInertia(fn (Assert $page) => $page
            ->component('Auth/ResetPassword')->where('code_verified', false));

        // This endpoint receives only the OTP, before a password is chosen.
        $this->verifyCode($code);

        $this->assertSame($oldPassword, $user->fresh()->password);
        $this->assertSame(session('password_recovery.request_id'), session('password_recovery.verified_request_id'));
        $this->assertDatabaseHas('password_reset_otps', ['user_id' => $user->id, 'code_hash' => null]);
        $this->get('/reset-password')->assertInertia(fn (Assert $page) => $page
            ->component('Auth/ResetPassword')->where('code_verified', true)
            ->missing('otp')->missing('code')->missing('email'));
        $this->get('/reset-password')->assertInertia(fn (Assert $page) => $page->where('code_verified', true));
        $this->assertGuest();
    }

    public function test_password_reset_cannot_bypass_code_verification_with_client_flags(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);

        $this->from('/reset-password')->post('/reset-password', [
            ...$this->payload(), 'otp' => $code, 'code_verified' => true,
            'verified_request_id' => session('password_recovery.request_id'),
        ])->assertSessionHasErrors();

        $this->assertSame($oldPassword, $user->fresh()->password);
        $this->assertNull(session('password_recovery.verified_request_id'));
        $record = DB::table('password_reset_otps')->where('user_id', $user->id)->first();
        $this->assertTrue(Hash::check($code, $record->code_hash));
    }

    public function test_consumed_code_cannot_be_verified_again(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->verifyCode($code);

        $this->from('/reset-password')->post('/reset-password/verify', ['otp' => $code])->assertSessionHasErrors('otp');

        $this->assertSame($oldPassword, $user->fresh()->password);
        $this->assertDatabaseHas('password_reset_otps', ['user_id' => $user->id, 'code_hash' => null]);
    }

    public function test_resending_invalidates_a_previously_verified_reset_grant(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $oldGrant = session('password_recovery.verified_request_id');
        $this->travel(61)->seconds();
        $this->post('/forgot-password')->assertSessionHasNoErrors()->assertRedirect('/reset-password');
        $newCode = Mail::sent(PasswordResetMail::class)->last()->code;
        $this->get('/reset-password')->assertInertia(fn (Assert $page) => $page->where('code_verified', false));

        $this->withSession(['password_recovery.verified_request_id' => $oldGrant])
            ->post('/reset-password', $this->payload())->assertSessionHasErrors();

        $this->assertSame($oldPassword, $user->fresh()->password);
        $this->verifyCode($newCode);
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
    }

    public function test_verified_reset_grant_expires_after_ten_minutes(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $this->travel(10)->minutes();

        $this->from('/reset-password')->post('/reset-password', $this->payload())->assertSessionHasErrors();

        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    public function test_verification_grants_ten_fresh_minutes_to_choose_a_password(): void
    {
        $user = $this->user();
        $code = $this->requestCode($user);
        $this->travel(9)->minutes();
        $this->verifyCode($code);
        $this->travel(2)->minutes();

        $this->get('/reset-password')->assertInertia(fn (Assert $page) => $page->where('code_verified', true));
        $this->post('/reset-password', $this->payload())->assertSessionHasNoErrors()->assertRedirect('/login');
        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
    }

    public function test_a_verified_database_row_alone_cannot_replace_the_session_grant(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $recovery = session('password_recovery');
        unset($recovery['verified_request_id']);

        $this->withSession(['password_recovery' => $recovery])
            ->post('/reset-password', $this->payload())->assertSessionHasErrors();

        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    public function test_changing_email_invalidates_a_verified_reset_grant(): void
    {
        $user = $this->user();
        $oldPassword = $user->password;
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $user->update(['email' => 'changed@example.test']);

        $this->from('/reset-password')->post('/reset-password', $this->payload())->assertSessionHasErrors();

        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    public function test_changing_password_invalidates_a_verified_reset_grant(): void
    {
        $user = $this->user();
        $code = $this->requestCode($user);
        $this->verifyCode($code);
        $user->update(['password' => Hash::make('ChangedPassword123')]);
        $oldPassword = $user->password;

        $this->from('/reset-password')->post('/reset-password', $this->payload())->assertSessionHasErrors();

        $this->assertSame($oldPassword, $user->fresh()->password);
    }

    private function user(array $attributes = []): User
    {
        return User::forceCreate([
            'user_id_no' => 'STUDENT-001', 'email' => 'student.private@example.test',
            'password' => Hash::make('OldPassword123'), 'remember_token' => 'old-remember-token',
            'user_role' => 'student', 'password_change' => false, 'active' => true, ...$attributes,
        ]);
    }

    private function selectAccount(User $user): void
    {
        $this->post('/find-user', ['user_id_no' => $user->user_id_no])->assertSessionHasNoErrors()->assertRedirect('/forgot-password');
    }

    private function requestCode(User $user): string
    {
        $this->selectAccount($user);
        $this->post('/forgot-password')->assertSessionHasNoErrors()->assertRedirect('/reset-password');

        return Mail::sent(PasswordResetMail::class)->last()->code;
    }

    private function verifyCode(string $code): void
    {
        $this->from('/reset-password')->post('/reset-password/verify', ['otp' => $code])
            ->assertSessionHasNoErrors()->assertRedirect('/reset-password');
    }

    private function payload(string $password = 'NewPassword123'): array
    {
        return ['password' => $password, 'password_confirmation' => $password];
    }

    private function wrongCode(string $code): string
    {
        return $code === '000000' ? '000001' : '000000';
    }
}
