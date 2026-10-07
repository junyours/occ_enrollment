<?php

use App\Http\Controllers\Admin\UserLogController;
use App\Http\Controllers\SuperAdmin\DriveFileController;
use App\Http\Controllers\SuperAdmin\SuperAdminController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'SuperAdmin'])->group(function () {
    Route::get('/users', [SuperAdminController::class, 'view'])->name('users');
    Route::post('/impersonate/{id}', [SuperAdminController::class, 'impersonate']);

    Route::get('/reset-credentials', [SuperAdminController::class, 'viewResetPassword'])->name('reset-credentials');
    Route::post('/super-admin/search-user', [SuperAdminController::class, 'searchUser'])->name('super-admin.search-user');
    Route::post('/super-admin/reset-user-credentials', [SuperAdminController::class, 'resetUserCredentials'])->name('super-admin.reset-user-credentials');
    Route::post('/super-admin/change-user-password', [SuperAdminController::class, 'changePassword'])->name('super-admin.change-user-password');

    Route::get('/activity-logs', [UserLogController::class, 'index'])->name('admin.logs.index');
});

Route::middleware(['auth'])->group(function () {
    Route::post('/stop-impersonate', [SuperAdminController::class, 'stopImpersonate'])->name('stop-impersonate');
});

Route::middleware(['auth', 'SuperAdmin'])->group(function () {
    Route::get('/drive', [DriveFileController::class, 'index'])->name('drive');
    Route::get('/drive/folders/{id}', [DriveFileController::class, 'folder'])->where('id', '[A-Za-z0-9_-]+');
    Route::get('/drive/files/{id}', [DriveFileController::class, 'show'])->where('id', '[A-Za-z0-9_-]+');
    Route::patch('/drive/files/{id}', [DriveFileController::class, 'rename'])->where('id', '[A-Za-z0-9_-]+');
    Route::delete('/drive/files/{id}', [DriveFileController::class, 'destroy'])->where('id', '[A-Za-z0-9_-]+');

    Route::post('/drive/folders', [DriveFileController::class, 'storeFolder']);
    Route::post('/drive/upload', [DriveFileController::class, 'upload']);
});