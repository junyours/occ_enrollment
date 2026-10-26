<?php

namespace App\Services;

use App\Models\User;
use Closure;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetOtp
{
    public const CODE_MINUTES = 10;
    public const RESEND_SECONDS = 60;
    public const MAX_ATTEMPTS = 5;
    public const MAX_SENDS_PER_HOUR = 5;

    public function state(User $user, ?string $requestId, ?string $verifiedRequestId = null): array
    {
        $row = $this->query($user)->first();
        $current = $row && $requestId && $this->matches($user, $row, $requestId);
        $verified = $current && $row->code_hash === null && $verifiedRequestId === $requestId;

        return [
            'server_time' => now()->timestamp,
            'otp_sent' => (bool) ($current && ($row->code_hash || $verified)),
            'code_verified' => (bool) $verified,
            'expires_at' => $current ? Carbon::parse($row->expires_at)->timestamp : null,
            'resend_available_at' => $row ? $this->nextSendAt($row)->timestamp : null,
            'expires_in_minutes' => self::CODE_MINUTES,
            'max_attempts' => self::MAX_ATTEMPTS,
        ];
    }

    public function issue(User $actor): array
    {
        return $this->locked($actor, function (User $user, ?object $row) {
            if (! filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
                throw ValidationException::withMessages([
                    'general' => 'Your account needs a valid registered email. Please contact MIS for help.',
                ]);
            }

            if ($row && $this->nextSendAt($row)->gt(now())) {
                $seconds = max(1, (int) ceil(now()->diffInSeconds($this->nextSendAt($row), false)));
                throw ValidationException::withMessages([
                    'general' => "Please wait {$seconds} seconds before requesting another code.",
                ]);
            }

            do {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            } while ($row?->code_hash && Hash::check($code, $row->code_hash));

            $requestId = (string) Str::uuid();
            $newWindow = ! $row?->send_window_started_at
                || Carbon::parse($row->send_window_started_at)->addHour()->lte(now());

            $this->query($user)->updateOrInsert(['user_id' => $user->id], [
                'request_id' => $requestId,
                'email' => $user->email,
                'code_hash' => Hash::make($code),
                'password_fingerprint' => $this->fingerprint($user),
                'expires_at' => now()->addMinutes(self::CODE_MINUTES),
                'resend_available_at' => now()->addSeconds(self::RESEND_SECONDS),
                'attempts' => 0,
                'send_window_started_at' => $newWindow ? now() : $row->send_window_started_at,
                'send_count' => $newWindow ? 1 : $row->send_count + 1,
                'created_at' => $row?->created_at ?? now(),
                'updated_at' => now(),
            ]);

            // The plaintext code is used only by the server-side mailer.
            return ['request_id' => $requestId, 'email' => $user->email, 'code' => $code];
        });
    }

    public function invalidateDelivery(User $actor, string $requestId): void
    {
        $this->locked($actor, function (User $user, ?object $row) use ($requestId) {
            if ($row?->request_id === $requestId) {
                $this->clearCode($user);
            }
        });
    }

    public function verify(User $actor, string $requestId, string $code): array
    {
        return $this->locked($actor, function (User $user, ?object $row) use ($requestId, $code) {
            if (! $row || ! $this->matches($user, $row, $requestId) || ! $row->code_hash) {
                return ['error' => 'This code is no longer active. Request a new code.'];
            }

            if (Carbon::parse($row->expires_at)->lte(now())) {
                return ['error' => 'This code has expired. Request a new code.'];
            }

            if ($row->attempts >= self::MAX_ATTEMPTS) {
                return ['error' => 'Too many incorrect codes. Request a new code before trying again.'];
            }

            if (! Hash::check($code, $row->code_hash)) {
                $attempts = $row->attempts + 1;
                $this->query($user)->update(['attempts' => $attempts, 'updated_at' => now()]);

                // Commit the attempt before the controller returns a validation error.
                return ['error' => $attempts >= self::MAX_ATTEMPTS
                    ? 'Too many incorrect codes. Request a new code before trying again.'
                    : 'Incorrect code. '.(self::MAX_ATTEMPTS - $attempts).' attempts remaining.'];
            }

            // Consume the OTP and allow ten minutes to choose a password. The random
            // request ID remains private in the verified browser's server-side session.
            $this->query($user)->update([
                'code_hash' => null,
                'expires_at' => now()->addMinutes(self::CODE_MINUTES),
                'updated_at' => now(),
            ]);

            return ['verified' => true];
        });
    }

    public function reset(User $actor, string $requestId, string $password): array
    {
        return $this->locked($actor, function (User $user, ?object $row) use ($requestId, $password) {
            if (! $row || ! $this->matches($user, $row, $requestId) || $row->code_hash !== null) {
                return ['error' => 'Verify your email code before choosing a new password.'];
            }

            if (Carbon::parse($row->expires_at)->lte(now())) {
                return ['error' => 'Your verified recovery session has expired. Request a new code.'];
            }

            if (Hash::check($password, $user->getAuthPassword())) {
                return ['password_error' => 'Choose a different password from your current password.'];
            }

            $user->forceFill([
                'password' => Hash::make($password),
                'remember_token' => Str::random(60),
                'password_change' => true,
            ])->save();

            // Revoke existing mobile tokens and database-backed web sessions.
            $user->tokens()->delete();
            if (config('session.driver') === 'database') {
                DB::connection(config('session.connection'))
                    ->table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
            }

            // Retain delivery counters so starting over cannot bypass the send limit.
            $this->clearCode($user);

            return ['user' => $user];
        });
    }
    private function locked(User $actor, Closure $callback): mixed
    {
        return $actor->getConnection()->transaction(function () use ($actor, $callback) {
            // Serialize issue and consume operations even before a challenge row exists.
            $user = $actor->newQuery()->whereKey($actor->getKey())->lockForUpdate()->firstOrFail();

            return $callback($user, $this->query($user)->first());
        }, 3);
    }

    private function matches(User $user, object $row, string $requestId): bool
    {
        return $row->request_id === $requestId
            && $row->expires_at
            && $row->email === $user->email
            && hash_equals((string) $row->password_fingerprint, $this->fingerprint($user));
    }

    private function fingerprint(User $user): string
    {
        return hash_hmac('sha256', $user->getAuthPassword(), config('app.key'));
    }

    private function nextSendAt(object $row): Carbon
    {
        $next = $row->resend_available_at ? Carbon::parse($row->resend_available_at) : now();

        if ($row->send_window_started_at && $row->send_count >= self::MAX_SENDS_PER_HOUR) {
            $windowEnds = Carbon::parse($row->send_window_started_at)->addHour();
            if ($windowEnds->gt($next)) {
                $next = $windowEnds;
            }
        }

        return $next;
    }

    private function clearCode(User $user): void
    {
        $this->query($user)->update([
            'request_id' => null,
            'code_hash' => null,
            'password_fingerprint' => null,
            'expires_at' => null,
            'updated_at' => now(),
        ]);
    }

    private function query(User $user): \Illuminate\Database\Query\Builder
    {
        return $user->getConnection()->table('password_reset_otps')->where('user_id', $user->id);
    }
}
