<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AccountPasswordChange;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RequiredPasswordController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->user()->requiresPasswordChange()) {
            return redirect('/');
        }

        return Inertia::render('Auth/RequiredPasswordChange');
    }

    public function update(Request $request, AccountPasswordChange $passwords): RedirectResponse
    {
        if (! $request->user()->requiresPasswordChange()) {
            return redirect('/');
        }

        $validated = $request->validate(AccountPasswordChange::rules(), AccountPasswordChange::messages());
        $user = $passwords->updateRequired(
            $request->user(), $validated['password'], $request->session()->getId(),
        );
        $request->session()->regenerate();
        event(new PasswordReset($user));

        return redirect()->intended('/')->with('status', 'Your password has been updated.');
    }
}
