<?php

namespace App\Services;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProfileEmailChange
{
    public const EMAIL_PATTERN = '/\Aocc\.[a-z]+\.[a-z]+[0-9]*@gmail\.com\z/';
    public const CODE_MINUTES = 10;
    public const RESEND_SECONDS = 60;
    public const MAX_ATTEMPTS = 5;
    public const MAX_SENDS_PER_HOUR = 5;
    public const REAUTH_MINUTES = 30;

    public function state(Model $actor): array
    {
        $user = $actor->fresh();
        abort_unless($user, 401);
        $row = $this->query($user)->first();
        $pending = $row && $this->belongsToCurrentCredentials($user, $row)
            ? [
                'request_id' => $row->request_id,
                'email' => $row->new_email,
                'expires_at' => $this->iso($row->expires_at),
                'reauthenticated_until' => $this->iso($row->reauthenticated_until),
                'attempts_remaining' => max(0, self::MAX_ATTEMPTS - $row->attempts),
            ]
            : null;

        return [
            'current_email' => $user->email,
            'requires_occ_email' => $this->requiresOccEmail($user),
            'pending' => $pending,
            'send_available_at' => $row ? $this->nextSendAt($row)->toIso8601String() : now()->toIso8601String(),
            'server_time' => now()->toIso8601String(),
        ];
    }

    public function start(Model $actor, string $email, string $password): array
    {
        return $this->locked($actor, function ($user, $row) use ($email, $password) {
            // Check the fresh, locked user, so a concurrent password change is respected.
            if (! Hash::check($password, $user->getAuthPassword())) {
                throw ValidationException::withMessages([
                    'current_password' => 'Your current password is incorrect.',
                ]);
            }

            $this->assertDestination($user, $email);
            $this->assertSendAllowed($row);

            return $this->issue($user, $row, $email, now()->addMinutes(self::REAUTH_MINUTES));
        });
    }

    public function resend(Model $actor, string $requestId): array
    {
        return $this->locked($actor, function ($user, $row) use ($requestId) {
            $this->assertCurrentRequest($user, $row, $requestId);
            $this->assertDestination($user, $row->new_email);
            $this->assertSendAllowed($row);

            return $this->issue($user, $row, $row->new_email, Carbon::parse($row->reauthenticated_until));
        });
    }

    public function verify(Model $actor, string $requestId, string $code): array
    {
        return $this->locked($actor, function ($user, $row) use ($requestId, $code) {
            if (! $this->matchesRequest($user, $row, $requestId)) {
                return ['error' => 'This request is no longer active. Use the latest code or start again.'];
            }

            if (Carbon::parse($row->expires_at)->lte(now())) {
                return ['error' => 'This code has expired. Request a new code.'];
            }

            if (! Hash::check($code, $row->code_hash)) {
                $attempts = $row->attempts + 1;

                if ($attempts >= self::MAX_ATTEMPTS) {
                    $this->clearChallenge($user);
                    return ['error' => 'Too many incorrect codes. Start again with your password.'];
                }

                $this->query($user)->update(['attempts' => $attempts, 'updated_at' => now()]);

                // Return rather than throw: the failed-attempt update must commit.
                return ['error' => 'Incorrect code. ' . (self::MAX_ATTEMPTS - $attempts) . ' attempts remaining.'];
            }

            // Recheck after verification; another account may have claimed this email.
            $this->assertDestination($user, $row->new_email);
            $oldEmail = $user->email;
            $user->email = $row->new_email;

            // Works with applications that do not have Laravel's verification column.
            if (array_key_exists('email_verified_at', $user->getAttributes())) {
                $user->email_verified_at = now();
            }

            // A UNIQUE database index on the account email closes cross-account races.
            $user->save();
            $this->clearChallenge($user);

            return ['old_email' => $oldEmail, 'new_email' => $user->email];
        });
    }

    public function cancel(Model $actor, string $requestId): bool
    {
        return $this->locked($actor, function ($user, $row) use ($requestId) {
            // An old browser tab must not cancel a newer request.
            if ($row->request_id === $requestId) {
                $this->clearChallenge($user);
                return true;
            }
            return false;
        });
    }

    public function invalidateDelivery(Model $actor, string $requestId): void
    {
        $this->cancel($actor, $requestId);
    }

    private function issue(Model $user, object $row, string $email, Carbon $reauthUntil): array
    {
        do {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        } while ($row->code_hash && Hash::check($code, $row->code_hash));

        $requestId = (string) Str::uuid();
        $newWindow = ! $row->send_window_started_at
            || Carbon::parse($row->send_window_started_at)->addHour()->lte(now());
        $expiresAt = now()->addMinutes(self::CODE_MINUTES);
        if ($expiresAt->gt($reauthUntil)) {
            $expiresAt = $reauthUntil->copy();
        }

        $this->query($user)->update([
            'request_id' => $requestId,
            'old_email' => $user->email,
            'new_email' => $email,
            'code_hash' => Hash::make($code),
            'password_fingerprint' => $this->passwordFingerprint($user),
            'expires_at' => $expiresAt,
            'reauthenticated_until' => $reauthUntil,
            'resend_available_at' => now()->addSeconds(self::RESEND_SECONDS),
            'attempts' => 0,
            'send_window_started_at' => $newWindow ? now() : $row->send_window_started_at,
            'send_count' => $newWindow ? 1 : $row->send_count + 1,
            'updated_at' => now(),
        ]);

        // This return value stays on the server; never serialize it into the response.
        return [
            'request_id' => $requestId,
            'email' => $email,
            'code' => $code,
            'expires_in_minutes' => max(1, (int) ceil(now()->diffInSeconds($expiresAt, false) / 60)),
        ];
    }

    private function locked(Model $actor, Closure $callback): mixed
    {
        return $actor->getConnection()->transaction(function () use ($actor, $callback) {
            // Lock the existing account before creating/reading its challenge row.
            $user = $actor->newQuery()->whereKey($actor->getKey())->lockForUpdate()->firstOrFail();
            $row = $this->query($user)->first();

            if (! $row) {
                $this->query($user)->insert([
                    'owner_key' => $this->ownerKey($user),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $row = $this->query($user)->first();
            }

            return $callback($user, $row);
        }, 3);
    }

    private function assertDestination(Model $user, string $email): void
    {
        // Use the fresh, locked account role on send, resend, and verification.
        // A role supplied by the browser must never control this requirement.
        if ($this->requiresOccEmail($user) && preg_match(self::EMAIL_PATTERN, $email) !== 1) {
            throw ValidationException::withMessages([
                'new_email' => 'Students must use occ.lastname.firstname@gmail.com, with optional numbers after the first name.',
            ]);
        }

        if (strtolower(trim((string) $user->email)) === $email) {
            throw ValidationException::withMessages(['new_email' => 'Enter a different email address.']);
        }

        $taken = $user->getConnection()->table($user->getTable())
            ->where('email', $email)
            ->where($user->getKeyName(), '<>', $user->getKey())
            ->exists();

        if ($taken) {
            throw ValidationException::withMessages(['new_email' => 'This email address is unavailable.']);
        }
    }

    private function requiresOccEmail(Model $user): bool
    {
        return $user->getAttribute('user_role') === 'student';
    }

    private function assertSendAllowed(object $row): void
    {
        $next = $this->nextSendAt($row);
        if ($next->gt(now())) {
            $seconds = max(1, (int) ceil(now()->diffInSeconds($next, false)));
            throw ValidationException::withMessages([
                'general' => 'Please wait ' . $seconds . ' seconds before requesting another code.',
            ]);
        }
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

    private function assertCurrentRequest(Model $user, object $row, string $requestId): void
    {
        if (! $this->matchesRequest($user, $row, $requestId)) {
            throw ValidationException::withMessages([
                'general' => 'This request is no longer active. Start again with your password.',
            ]);
        }
    }

    private function matchesRequest(Model $user, object $row, string $requestId): bool
    {
        return $row->request_id === $requestId && $this->belongsToCurrentCredentials($user, $row);
    }

    private function belongsToCurrentCredentials(Model $user, object $row): bool
    {
        return (bool) ($row->request_id && $row->new_email && $row->code_hash
            && $row->old_email === $user->email
            && $row->password_fingerprint === $this->passwordFingerprint($user)
            && $row->reauthenticated_until
            && Carbon::parse($row->reauthenticated_until)->gt(now()));
    }

    private function clearChallenge(Model $user): void
    {
        // Preserve send counters/cooldowns so cancel, failure, or success cannot reset limits.
        $this->query($user)->update([
            'request_id' => null,
            'old_email' => null,
            'new_email' => null,
            'code_hash' => null,
            'password_fingerprint' => null,
            'expires_at' => null,
            'reauthenticated_until' => null,
            'attempts' => 0,
            'updated_at' => now(),
        ]);
    }

    private function query(Model $user): Builder
    {
        return $user->getConnection()->table('profile_email_changes')
            ->where('owner_key', $this->ownerKey($user));
    }

    private function ownerKey(Model $user): string
    {
        return hash('sha256', $user->getMorphClass() . ':' . $user->getKey());
    }

    private function passwordFingerprint(Model $user): string
    {
        return hash_hmac('sha256', $user->getAuthPassword(), (string) config('app.key'));
    }

    private function iso(?string $date): ?string
    {
        return $date ? Carbon::parse($date)->toIso8601String() : null;
    }
}
