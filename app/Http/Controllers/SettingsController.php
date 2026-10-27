<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\User;

class SettingsController extends Controller
{
    public function settings(Request $request): Response
    {
        $user = Auth::user();

        $user = User::select(
            'user_id_no',
            'email',
            'user_id',
            'user_role',
            'first_name',
            'last_name',
            'middle_name',
            'gender',
            'birthday',
            'contact_number',
            'present_address',
            'zip_code'
        )
            ->where('users.id', '=', $user->id)
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->first();

        return Inertia::render('Settings/Index', [
            'user' => $user
        ]);
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|current_password',
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
            'password_change' => true,
        ]);

        return back()->with('success', 'Password updated successfully!');
    }
}
