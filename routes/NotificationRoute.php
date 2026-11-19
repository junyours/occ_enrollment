<?php

use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

// The signed-in user's notifications (the bell in the header).
Route::middleware('auth')
    ->prefix('notifications')
    ->name('notifications.')
    ->controller(NotificationController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('counts', 'counts')->name('counts');
        Route::post('read-all', 'readAll')->name('read-all');
        Route::post('{id}/read', 'read')->whereUuid('id')->name('read');
    });
