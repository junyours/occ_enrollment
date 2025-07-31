<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\User;
use Hash;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function user(Request $request)
    {
        $user_id = $request->user()->id;

        $user = User::with('UserInformation')
            ->find($user_id);

        return response()->json($user);
    }

    public function login(Request $request)
    {
        $request->validate([
            'user_id_no' => 'required',
            'password' => 'required',
        ]);

        $user = User::where('user_id_no', $request->user_id_no)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 422);
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
