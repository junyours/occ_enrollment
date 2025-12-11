<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Find user by user_id_no and return user info
     */
    public function findUser(Request $request)
    {
        // If it's a GET request, redirect to the main forgot password page
        if ($request->isMethod('GET')) {
            return redirect()->route('password.request');
        }

        $request->validate([
            'user_id_no' => ['required'],
        ]);

        // Find user by user_id_no
        $user = User::where('user_id_no', '=', $request->user_id_no)->first();

        // Check if user exists
        if (!$user) {
            return back()->withErrors(['user_id_no' => 'User ID not found.']);
        }

        // Check if user has an email
        if (empty($user->email)) {
            return back()->withErrors(['email' => 'No email address found for this user.']);
        }

        // Get additional user information
        $userWithInfo = User::where('users.id', $user->id)
            ->select('users.user_id_no', 'users.email', 'first_name', 'middle_name', 'last_name')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->first();

        $userData = $userWithInfo ?: $user;

        // Mask names - show only first letter
        $maskName = fn($name) => empty($name) || strlen($name) <= 1 ? $name : $name[0] . str_repeat('*', strlen($name) - 1);

        $maskedFullName = trim(implode(' ', array_filter([
            $maskName($userData->first_name ?? ''),
            $maskName($userData->middle_name ?? ''),
            $maskName($userData->last_name ?? '')
        ]))) ?: 'User';

        // Mask email - show first 3 and last 1 character
        $emailParts = explode('@', $userData->email);
        $local = $emailParts[0];
        $localLength = strlen($local);

        if ($localLength > 4) {
            $maskedEmail = substr($local, 0, 3) . str_repeat('*', $localLength - 4) . substr($local, -1) . '@' . $emailParts[1];
        } else {
            $maskedEmail = substr($local, 0, min(2, $localLength)) . str_repeat('*', max(0, $localLength - 2)) . '@' . $emailParts[1];
        }

        // Return Inertia response instead of back()->with()
        return Inertia::render('Auth/ForgotPassword', [
            'user_found' => true,
            'user_data' => [
                'user_id_no' => $userData->user_id_no,
                'email' => $userData->email,
                'masked_email' => $maskedEmail,
                'name' => $maskedFullName,
            ]
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     */
    public function store(Request $request)
    {
        $request->validate([
            'user_id_no' => ['required'],
            'email' => ['required', 'email'],
        ]);

        // Find user by user_id_no and verify email matches
        $user = User::where('user_id_no', '=', $request->user_id_no)
            ->where('email', '=', $request->email)
            ->first();

        if (!$user) {
            return back()->withErrors(['general' => 'Invalid user credentials.']);
        }

        // Get additional user information for email
        $userWithInfo = User::where('users.id', $user->id)
            ->select('users.id', 'users.email', 'users.user_id_no', 'first_name', 'middle_name', 'last_name')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->first();

        $emailUser = $userWithInfo ?: $user;

        if ($userWithInfo) {
            $emailUser->first_name = ucwords(strtolower($userWithInfo->first_name));
            $emailUser->middle_name = ucwords(strtolower($userWithInfo->middle_name));
            $emailUser->last_name = ucwords(strtolower($userWithInfo->last_name));
        }

        // Generate the token
        $token = Password::createToken($user);

        // Generate the reset URL
        $resetUrl = url(route('password.reset', [
            'token' => $token,
            'email' => $user->email,
        ]));

        try {
            // Send custom email
            Mail::to($user->email)->send(new \App\Mail\PasswordResetMail($emailUser, $resetUrl, $token));

            // Return success
            return Inertia::render('Auth/ForgotPassword', [
                'status' => 'We have emailed your password reset link!',
            ]);
        } catch (\Exception $e) {
            // Log the error for debugging
            Log::error('Password reset email failed: ' . $e->getMessage());

            // Check if it's a rate limit error
            if (
                str_contains($e->getMessage(), 'Daily user sending limit exceeded') ||
                str_contains($e->getMessage(), '550-5.4.5')
            ) {
                // return back()->withErrors(['email' => 'Daily email sending limit exceeded. Please try again tomorrow or contact support.']);
                return Inertia::render('Auth/ForgotPassword', [
                    'errors' => [
                        'email' => 'Daily email sending limit exceeded. Please try again tomorrow or contact support.',
                    ],
                ]);
            }

            // Generic email error
            // return back()->withErrors([
            //     'email' => 'Failed to send password reset email. Please try again later or contact support.',
            // ]);

            return Inertia::render('Auth/ForgotPassword', [
                'errors' => [
                    'email' => 'Failed to send password reset email. Please try again later or contact support.',
                ],
            ]);
        }
    }
}
