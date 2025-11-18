<?php

use App\Http\Controllers\Mis\MisController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'mis'])->group(function () {
    Route::get('/mis-faculty-list', [MisController::class, 'misFacultyList'])->name('mis-faculty-list');
    Route::get('/mis-student-list', [MisController::class, 'misStudentList'])->name('mis-student-list');
    Route::get('/recycle-bin', [MisController::class, 'recycleBin'])->name('recycle-bin');
    Route::get('/mis-users', [MisController::class, 'users'])->name('mis-users');
    Route::post('/mis/users', [MisController::class, 'store'])->name('mis-users.store');
    Route::put('/mis/users/{id}', [MisController::class, 'update'])->name('mis-users.update');
});
