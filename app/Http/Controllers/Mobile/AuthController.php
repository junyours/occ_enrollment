<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function user(Request $request)
    {
        $user_id = $request->user()->id;

        $user = User::select(
            "users.id",
            "users.user_id_no",
            "users.user_role",
            "users.email",
            "users.password_change",
            "user_information.first_name",
            "user_information.last_name",
            "user_information.middle_name",
            "user_information.gender",
            "user_information.birthday",
            "user_information.contact_number",
            "user_information.present_address",
            "user_information.zip_code"
        )
            ->join("user_information", "user_information.user_id", "=", "users.id")
            ->where("users.id", $user_id)
            ->first();

        return response()->json($user);
    }

    public function login(Request $request)
    {
        $user = User::where('user_id_no', $request->user_id_no)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 422);
        }

        if (!in_array($user->user_role, ['student', 'faculty'])) {
            return response()->json(['message' => 'Access to this portal is restricted to students and faculty only.'], 403);
        }

        $token = $user->createToken('mobile-token')->plainTextToken;

        return response()->json([
            'token' => $token
        ]);
    }

    public function changePassword(Request $request)
    {
        $user_id = $request->user()->id;

        $user = User::find($user_id);

        if ($user->password_change === 0) {
            $request->validate([
                'password' => ['required', 'confirmed', Password::defaults()],
            ]);

            $user->update([
                'password' => Hash::make($request->password),
                'password_change' => 1
            ]);
        } else {
            $request->validate([
                'current_password' => ['required'],
            ]);

            if (!Hash::check($request->current_password, $user->password)) {
                throw ValidationException::withMessages([
                    'message' => 'The current password is incorrect.',
                ]);
            }

            $request->validate([
                'password' => ['required', 'confirmed', Password::defaults()],
            ]);

            $user->update([
                'password' => Hash::make($request->password),
            ]);
        }
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        $user->currentAccessToken()->delete();
    }
}
