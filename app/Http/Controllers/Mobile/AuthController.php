<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\User;
use Auth;
use Hash;
use Illuminate\Http\Request;

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

        if (!in_array($user->user_role, ['student', 'faculty', 'program_head', 'registrar'])) {
            return response()->json(['message' => 'Access to this portal is restricted to Student, Faculty, Program Head, and Registrar only.'], 403);
        }

        $token = $user->createToken('mobile-token')->plainTextToken;

        return response()->json([
            'token' => $token
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        $user->currentAccessToken()->delete();
    }
}
