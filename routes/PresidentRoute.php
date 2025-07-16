<?php

use App\Http\Controllers\President\PresidentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'president'])->group(function () {
    Route::get('/ongoing-enrollment', [PresidentController::class, 'ongoingEnrollment'])->name('ongoing-enrollment');
    Route::post('/president/enrollment-data', [PresidentController::class, 'enrollmentData'])->name('president.enrollment-data');
});
