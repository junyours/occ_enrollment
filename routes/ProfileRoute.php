<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    // Profile page
    Route::get('/profile', [ProfileController::class, 'profile'])->name('profile');

    // Update profile information
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');

    // Update password
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('password.update');

    // Export user data
    Route::get('/profile/export', [ProfileController::class, 'exportData'])->name('profile.export');
});
