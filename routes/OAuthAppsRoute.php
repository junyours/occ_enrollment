<?php

use App\Http\Controllers\OAuth\MyAppsController;
use Illuminate\Support\Facades\Route;

// "My apps": for people MIS assigned to maintain a school app, whatever their role.
Route::middleware(['auth', 'maintenance'])->group(function () {
    Route::get('/my-apps', [MyAppsController::class, 'index'])->name('oauth.my-apps');
    Route::post('/my-apps/{client}/secret', [MyAppsController::class, 'rotateSecret'])->name('oauth.my-apps.secret');
});
