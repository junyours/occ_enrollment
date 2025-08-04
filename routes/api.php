<?php

use App\Http\Controllers\Mobile\AuthController;
use App\Http\Controllers\Mobile\ClassController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/mobile/user', [AuthController::class, 'user']);

    Route::get('/mobile/current-school-year', [ClassController::class, 'getCurrentSchoolYear']);

    Route::get('/mobile/student-current-department', [ClassController::class, 'getStudentCurrentDepartment']);

    // Student classes
    Route::get('/mobile/current-student-classes', [ClassController::class, 'getStudentCurrentClasses']);
    Route::get('/mobile/enrollment-record', [ClassController::class, 'getStudentEnrollmentRecord']);

    // Faculty classes
    Route::get('/mobile/current-faculty-classes', [ClassController::class, 'getFacultyCurrentClasses']);
    Route::get('/mobile/classes-classroom-students', [ClassController::class, 'getStudents']);

    Route::get('/mobile/logout', [AuthController::class, 'logout']);
});

Route::middleware('guest')->group(function () {
    Route::post('/mobile/login', [AuthController::class, 'login']);
});
