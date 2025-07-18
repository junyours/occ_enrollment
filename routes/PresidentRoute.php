<?php

use App\Http\Controllers\President\PresidentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'president'])->group(function () {
    // Route::post('/enrollment-data', [PresidentController::class, 'enrollmentData'])->name('enrollment-data');
});
