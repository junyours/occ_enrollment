<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;

class PasswordRecoverySession
{
    public function user(Request $request): ?User
    {
        $recovery = $request->session()->get('password_recovery');
        if (! is_array($recovery) || empty($recovery['user_id'])
            || ($recovery['selected_at'] ?? 0) <= now()->subMinutes(30)->timestamp) {
            $request->session()->forget('password_recovery');

            return null;
        }

        $user = User::find($recovery['user_id']);
        if (! $user) {
            $request->session()->forget('password_recovery');
        }

        return $user;
    }

    public function select(Request $request, User $user): void
    {
        $request->session()->regenerate();
        $request->session()->put('password_recovery', [
            'user_id' => $user->id,
            'selected_at' => now()->timestamp,
            'request_id' => null,
        ]);
    }

    public function props(User $user): array
    {
        $user->loadMissing('information');
        $mask = static function (?string $value): string {
            $value = mb_convert_encoding(trim($value ?? ''), 'UTF-8', 'UTF-8');

            return $value === '' ? '' : mb_substr($value, 0, 1).str_repeat('*', max(1, mb_strlen($value) - 1));
        };
        $name = trim(implode(' ', array_filter([
            $mask($user->information?->first_name),
            $mask($user->information?->middle_name),
            $mask($user->information?->last_name),
        ])));
        [$local, $domain] = array_pad(explode('@', (string) $user->email, 2), 2, '');

        return [
            'user_id_no' => $user->user_id_no,
            'masked_email' => $mask($local).'@'.$domain,
            'name' => $name ?: 'Your account',
        ];
    }
}
