<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProfileController;

Route::middleware(['auth', 'student'])->group(function () {

    Route::middleware(['EnrollmentPrepOngoing'])->group(function () {

    });
});
