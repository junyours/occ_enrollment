<?php

use App\Http\Controllers\SuperAdmin\SuperAdminController;
use Illuminate\Support\Facades\Route;


Route::middleware(['auth', 'SuperAdmin'])->group(function () {
    Route::get('/users', [SuperAdminController::class, 'view'])->name('users');
    Route::post('/impersonate/{id}', [SuperAdminController::class, 'impersonate']);
});
