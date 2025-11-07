<?php

use App\Http\Controllers\SuperAdmin\SuperAdminController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'SuperAdmin'])->group(function () {
    Route::get('/users', [SuperAdminController::class, 'view'])->name('users');
    Route::post('/impersonate/{id}', [SuperAdminController::class, 'impersonate']);

    Route::get('/reset-credentials', [SuperAdminController::class, 'viewResetPassword'])->name('reset-credentials');
    Route::post('/super-admin/search-user', [SuperAdminController::class, 'searchUser'])->name('super-admin.search-user');
    Route::post('/super-admin/reset-user-credentials', [SuperAdminController::class, 'resetUserCredentials'])->name('super-admin.reset-user-credentials');
    Route::post('/super-admin/change-user-password', [SuperAdminController::class, 'changePassword'])->name('super-admin.change-user-password');

});

Route::middleware(['auth'])->group(function () {
    Route::post('/stop-impersonate', [SuperAdminController::class, 'stopImpersonate'])->name('stop-impersonate');
});
