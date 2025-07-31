<?php

use App\Http\Controllers\InstructorClasses\ClassController;
use App\Http\Controllers\SchoolYear\SchoolYearController;
use App\Http\Controllers\Mobile\AuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/mobile/user', [AuthController::class, 'user']);

    Route::get('/mobile/logout', [AuthController::class, 'logout']);

    // Student classes
    Route::get('/current-school-year', [SchoolYearController::class, 'getCurrentSchoolYear'])->name('current.school-year');
    Route::post('/student-classes', [ClassController::class, 'getStudentClasses'])->name('student-current-classes');
    Route::get('/enrollment-record', [ClassController::class, 'getStudentEnrollmentRecord'])->name('enrollment-record');
});

Route::middleware('guest')->group(function () {
    Route::post('/mobile/login', [AuthController::class, 'login']);
});
