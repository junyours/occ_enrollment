<?php

use App\Http\Controllers\SuperAdmin\SuperAdminController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'SuperAdmin'])->group(function () {
    Route::get('/users', [SuperAdminController::class, 'view'])->name('users');
    Route::post('/impersonate/{id}', [SuperAdminController::class, 'impersonate']);
});

Route::middleware(['auth'])->group(function () {
    Route::post('/stop-impersonate', [SuperAdminController::class, 'stopImpersonate'])->name('stop-impersonate');
});
