<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\User;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function profile(Request $request): Response
    {
        $userId = Auth::user()->id;

        $user = User::select(
            'user_id_no',
            'email',
            'user_id',
            'first_name',
            'last_name',
            'middle_name',
            'gender',
            'birthday',
            'contact_number',
            'present_address',
            'zip_code'
        )
            ->where('users.id', '=', $userId)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->first();

        return Inertia::render('Profile/Index', [
            'user' => $user
        ]);
    }

    /**
     * Update the user's password.
     */
    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|current_password',
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back()->with('success', 'Password updated successfully!');
    }

    /**
     * Export user data.
     */
    public function exportData(Request $request)
    {
        $userId = Auth::user()->id;

        $user = User::select(
            'user_id_no',
            'user_id',
            'first_name',
            'last_name',
            'middle_name',
            'gender',
            'birthday',
            'contact_number',
            'email',
            'present_address',
            'zip_code'
        )
            ->where('users.id', '=', $userId)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->first();

        $userData = [
            'account_info' => [
                'user_id_no' => $user->user_id_no,
                'user_id' => $user->user_id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'middle_name' => $user->middle_name,
                'email' => $user->email,
                'contact_number' => $user->contact_number,
                'gender' => $user->gender,
                'birthday' => $user->birthday,
                'present_address' => $user->present_address,
                'zip_code' => $user->zip_code,
            ],
            'export_date' => now(),
            'exported_by' => $user->user_id_no,
        ];

        $fileName = 'user_data_' . $user->user_id_no . '_' . now()->format('Y-m-d') . '.json';

        return response()->json($userData)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="' . $fileName . '"');
    }

    /**
     * Get user profile information (API endpoint if needed)
     */
    public function getProfile(Request $request)
    {
        $userId = Auth::user()->id;

        $user = User::select(
            'users.user_id_no',
            'users.user_id',
            'users.email',
            'user_information.first_name',
            'user_information.last_name',
            'user_information.middle_name',
            'user_information.gender',
            'user_information.birthday',
            'user_information.contact_number',
            'user_information.present_address',
            'user_information.zip_code'
        )
            ->where('users.id', '=', $userId)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->first();

        return response()->json([
            'user' => $user,
            'message' => 'Profile information retrieved successfully'
        ]);
    }
}
