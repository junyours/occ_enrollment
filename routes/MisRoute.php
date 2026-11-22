<?php

use App\Http\Controllers\Mis\MisController;
use App\Http\Controllers\Mis\OAuthAppController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'mis'])->group(function () {
    Route::get('/mis-faculty-list', [MisController::class, 'misFacultyList'])->name('mis-faculty-list');
    Route::get('/mis-student-list', [MisController::class, 'misStudentList'])->name('mis-student-list');
    Route::get('/recycle-bin', [MisController::class, 'recycleBin'])->name('recycle-bin');
    Route::get('/mis-users', [MisController::class, 'users'])->name('mis-users');
    Route::post('/mis/users', [MisController::class, 'store'])->name('mis-users.store');
    Route::put('/mis/users/{id}', [MisController::class, 'update'])->name('mis-users.update');

    // "Continue with SIS-OCC": school apps that sign people in through the SIS.
    Route::prefix('mis/connected-apps')->name('mis.oauth-apps.')->controller(OAuthAppController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::get('/{client}', 'show')->name('show');
        Route::put('/{client}', 'update')->name('update');
        Route::post('/{client}/secret', 'rotateSecret')->name('secret');
        Route::put('/{client}/status', 'updateStatus')->name('status');
        Route::post('/{client}/maintainers', 'addMaintainer')->name('maintainers.store');
        Route::delete('/{client}/maintainers/{user}', 'removeMaintainer')->name('maintainers.destroy');
    });
});
