<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use App\Services\PasswordRecoverySession;
use App\Services\PasswordResetOtp;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PasswordResetLinkController extends Controller
{
    public function __construct(
        private PasswordResetOtp $codes,
        private PasswordRecoverySession $recovery,
    ) {}

    public function create(Request $request): Response
    {
        $user = $this->recovery->user($request);

        return Inertia::render('Auth/ForgotPassword', array_merge([
            'status' => $request->session()->get('status'),
            'user_found' => (bool) $user,
            'user_data' => $user ? $this->recovery->props($user) : null,
            'server_time' => now()->timestamp,
            'otp_sent' => false,
            'expires_at' => null,
            'resend_available_at' => null,
            'expires_in_minutes' => PasswordResetOtp::CODE_MINUTES,
            'max_attempts' => PasswordResetOtp::MAX_ATTEMPTS,
        ], $user ? $this->codes->state($user, $request->session()->get('password_recovery.request_id'), $request->session()->get('password_recovery.verified_request_id')) : []));
    }

    public function findUser(Request $request): RedirectResponse
    {
        if ($request->isMethod('GET')) {
            return redirect()->route('password.request');
        }

        if (is_string($request->input('user_id_no'))) {
            $request->merge(['user_id_no' => trim($request->input('user_id_no'))]);
        }

        $validated = $request->validate(['user_id_no' => ['required', 'string', 'max:255']]);
        $request->session()->forget('password_recovery');
        $user = User::where('user_id_no', $validated['user_id_no'])->first();

        if (! $user || ! filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            return redirect()->route('password.request')->withErrors([
                'user_id_no' => 'We could not find an account with a registered email. Check your ID or contact MIS for help.',
            ]);
        }

        $this->recovery->select($request, $user);

        return redirect()->route('password.request');
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->recovery->user($request);
        if (! $user) {
            return redirect()->route('password.request')->withErrors([
                'general' => 'Find your account again to request a password reset code.',
            ]);
        }

        // The destination and account come exclusively from the server-side session.
        $delivery = $this->codes->issue($user);
        $request->session()->forget('password_recovery.verified_request_id');
        try {
            Mail::to($delivery['email'])->send(new PasswordResetMail($delivery['code'], PasswordResetOtp::CODE_MINUTES));
        } catch (Throwable $exception) {
            $this->codes->invalidateDelivery($user, $delivery['request_id']);
            $request->session()->forget('password_recovery.request_id');
            Log::warning('Password reset code delivery failed.', ['exception_type' => $exception::class]);

            return redirect()->route('password.request')->withErrors([
                'general' => 'We could not send your code. Please try again after the cooldown or contact MIS for help.',
            ]);
        }

        $request->session()->put('password_recovery.request_id', $delivery['request_id']);
        $request->session()->put('password_recovery.selected_at', now()->timestamp);

        return redirect()->route('password.reset')->with('status', 'A six-digit code was sent. Check your inbox and spam folder.');
    }

    public function restart(Request $request): RedirectResponse
    {
        $request->session()->forget('password_recovery');

        return redirect()->route('password.request');
    }
}
