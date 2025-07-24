<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/mobile/login', function (Request $request) {
    $request->validate([
        'user_id_no' => 'required',
        'password' => 'required',
    ]);

    $user = User::where('user_id_no', $request->user_id_no)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    $token = $user->createToken('mobile-token')->plainTextToken;

    return response()->json([
        'token' => $token,
        'user' => $user,
    ]);
});

Route::get('/users', function () {
    return response()->json(['message' => 'Welcome'], 200);
});
