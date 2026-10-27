<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AccountPasswordChange
{
    public static function rules(): array
    {
        return [
            'password' => ['bail', 'required', 'string', 'not_regex:/\x00/', 'max:72', 'confirmed',
                Password::min(8)->mixedCase()->numbers(),
                static function (string $attribute, mixed $value, \Closure $fail) {
                    if (is_string($value) && strlen($value) > 72) {
                        $fail('The password must not exceed 72 bytes.');
                    }
                },
            ],
        ];
    }

    public static function messages(): array
    {
        return ['password.not_regex' => 'The password must not contain null characters.'];
    }

    public function updateRequired(User $actor, string $password, ?string $keepSessionId = null, ?int $keepTokenId = null): User
    {
        return $actor->getConnection()->transaction(function () use ($actor, $password, $keepSessionId, $keepTokenId) {
            $user = $actor->newQuery()->whereKey($actor->getKey())->lockForUpdate()->firstOrFail();
            // Only the mandatory flow may rely on the already authenticated session/token.
            if (! $user->requiresPasswordChange()) {
                throw ValidationException::withMessages(['general' => 'Your password update is no longer required. Refresh the page to continue.']);
            }
            if (Hash::check($password, $user->getAuthPassword())) {
                throw ValidationException::withMessages(['password' => 'Choose a different password from your current password.']);
            }

            $attributes = [
                'password' => Hash::make($password),
                'password_change' => true,
                'remember_token' => Str::random(60),
            ];
            if (array_key_exists('first_login_at', $user->getAttributes()) && $user->first_login_at === null) {
                $attributes['first_login_at'] = now();
            }
            $user->forceFill($attributes)->save();

            $tokens = $user->tokens();
            if ($keepTokenId !== null) {
                $tokens->where('id', '<>', $keepTokenId);
            }
            $tokens->delete();

            if (config('session.driver') === 'database') {
                $sessions = DB::connection(config('session.connection'))
                    ->table(config('session.table', 'sessions'))->where('user_id', $user->id);
                if ($keepSessionId !== null) {
                    $sessions->where('id', '<>', $keepSessionId);
                }
                $sessions->delete();
            }

            return $user;
        }, 3);
    }
}
