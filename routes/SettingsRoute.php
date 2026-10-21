<?php

use App\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance'])->group(function () {
    Route::get('/settings', [SettingsController::class, 'settings'])->name('settings');
});
