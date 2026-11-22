<?php

/*
| "Continue with SIS-OCC" (OAuth 2.0 authorization server).
|
| Loaded from bootstrap/app.php with the "/oauth" prefix and "passport." names.
| These are the Passport routes the SIS uses, plus the school's sign-in rules on
| /oauth/authorize. Passport's own route file is switched off in AppServiceProvider.
*/

use Illuminate\Support\Facades\Route;
use Laravel\Passport\Http\Controllers\AccessTokenController;
use Laravel\Passport\Http\Controllers\ApproveAuthorizationController;
use Laravel\Passport\Http\Controllers\AuthorizationController;
use Laravel\Passport\Http\Controllers\DenyAuthorizationController;

// Server to server: the app swaps a code (or refresh token) for an access token.
Route::post('/token', [AccessTokenController::class, 'issueToken'])
    ->middleware('throttle:60,1')
    ->name('token');

// The browser arrives here from the app. Passport sends guests to the SIS login first.
Route::get('/authorize', [AuthorizationController::class, 'authorize'])
    ->middleware(['web', 'maintenance', 'oauth.school-rules'])
    ->name('authorizations.authorize');

Route::middleware(['web', 'auth'])->group(function () {
    // "Allow" on the consent screen (only for apps that don't skip it).
    Route::post('/authorize', [ApproveAuthorizationController::class, 'approve'])
        ->middleware('oauth.school-rules')
        ->name('authorizations.approve');

    // "Cancel" on the consent screen.
    Route::delete('/authorize', [DenyAuthorizationController::class, 'deny'])
        ->name('authorizations.deny');
});
