<?php

namespace App\Http\Controllers\CsgAttendance;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CsgAttendanceController extends Controller
{
    public function csgAttendanceLogin(Request $request)
    {
        $user = User::where('user_id_no', $request->user_id_no)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 422);
        }

        if (!in_array($user->user_role, ['student'])) {
            return response()->json(['message' => 'Access to this portal is restricted to students only.'], 403);
        }

        $token = $user->createToken('csg-attendance-token')->plainTextToken;

        $accessToken = $user->tokens()->latest('id')->first();
        $accessToken->expires_at = now()->addMonth();
        $accessToken->save();

        return response()->json([
            'token' => $token
        ]);
    }

    public function csgAttendanceUser(Request $request)
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
}
