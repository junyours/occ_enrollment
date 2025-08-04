<?php

use App\Http\Controllers\Mobile\AuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/mobile/user', [AuthController::class, 'user']);

    Route::get('/mobile/current-school-year', [\App\Http\Controllers\Mobile\ClassController::class, 'getCurrentSchoolYear']);

    // Student classes
    Route::post('/mobile/current-student-classes', [\App\Http\Controllers\Mobile\ClassController::class, 'getStudentCurrentClasses']);
    Route::get('/mobile/enrollment-record', [App\Http\Controllers\InstructorClasses\ClassController::class, 'getStudentEnrollmentRecord']);

    // Faculty classes
    Route::post('/mobile/current-faculty-classes', [\App\Http\Controllers\Mobile\ClassController::class, 'getFacultyCurrentClasses']);

    Route::get('/mobile/logout', [AuthController::class, 'logout']);
});

Route::middleware('guest')->group(function () {
    Route::post('/mobile/login', [AuthController::class, 'login']);
});
