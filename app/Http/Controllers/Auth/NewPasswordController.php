<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\PasswordRecoverySession;
use App\Services\PasswordResetOtp;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    public function __construct(
        private PasswordResetOtp $codes,
        private PasswordRecoverySession $recovery,
    ) {}

    public function create(Request $request): Response|RedirectResponse
    {
        $user = $this->recovery->user($request);
        $state = $user ? $this->codes->state(
            $user,
            $request->session()->get('password_recovery.request_id'),
            $request->session()->get('password_recovery.verified_request_id'),
        ) : null;
        if (! $state || ! $state['otp_sent']) {
            return redirect()->route('password.request')->withErrors([
                'general' => 'Request a new password reset code to continue.',
            ]);
        }

        return Inertia::render('Auth/ResetPassword', array_merge($state, [
            'user_data' => $this->recovery->props($user),
            'status' => $request->session()->get('status'),
        ]));
    }

    public function verify(Request $request): RedirectResponse
    {
        $user = $this->recovery->user($request);
        $requestId = $request->session()->get('password_recovery.request_id');
        if (! $user || ! is_string($requestId)) {
            return redirect()->route('password.request')->withErrors([
                'general' => 'Your recovery session has expired. Find your account and request a new code.',
            ]);
        }

        $validated = $request->validate([
            'otp' => ['bail', 'required', 'string', 'regex:/\A[0-9]{6}\z/'],
        ], ['otp.regex' => 'Enter the six-digit code from your email.']);

        $result = $this->codes->verify($user, $requestId, $validated['otp']);
        if (isset($result['error'])) {
            throw ValidationException::withMessages(['otp' => $result['error']]);
        }

        $request->session()->regenerate();
        $request->session()->put('password_recovery.verified_request_id', $requestId);
        $request->session()->put('password_recovery.selected_at', now()->timestamp);

        return redirect()->route('password.reset')->with('status', 'Email verified. You can now choose a new password.');
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->recovery->user($request);
        $requestId = $request->session()->get('password_recovery.request_id');
        if (! $user || ! is_string($requestId)) {
            return redirect()->route('password.request')->withErrors([
                'general' => 'Your recovery session has expired. Find your account and request a new code.',
            ]);
        }

        if ($request->session()->get('password_recovery.verified_request_id') !== $requestId) {
            return redirect()->route('password.reset')->withErrors([
                'otp' => 'Verify your email code before choosing a new password.',
            ]);
        }

        $validated = $request->validate([
            'password' => ['bail', 'required', 'string', 'not_regex:/\x00/', 'max:72', 'confirmed', Password::min(8)->mixedCase()->numbers(),
                static function (string $attribute, mixed $value, \Closure $fail) {
                    if (is_string($value) && strlen($value) > 72) {
                        $fail('The password must not exceed 72 bytes.');
                    }
                }],
        ], ['password.not_regex' => 'The password must not contain null characters.']);

        $result = $this->codes->reset($user, $requestId, $validated['password']);
        if (isset($result['error'])) {
            $request->session()->forget('password_recovery.verified_request_id');

            return redirect()->route('password.request')->withErrors(['general' => $result['error']]);
        }
        if (isset($result['password_error'])) {
            throw ValidationException::withMessages(['password' => $result['password_error']]);
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();
        event(new PasswordReset($result['user']));

        return redirect()->route('login')->with('status', 'Your password has been changed. Sign in with your new password.');
    }
}
