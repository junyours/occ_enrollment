<?php

use App\Http\Controllers\Mobile\AuthController;
use App\Http\Controllers\Mobile\ClassController;
use App\Http\Controllers\CsgAttendance\CsgAttendanceController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/mobile/user', [AuthController::class, 'user']);
    Route::get('/csg-attendance/user', [CsgAttendanceController::class, 'csgAttendanceUser']);

    Route::get('/mobile/current-school-year', [ClassController::class, 'getCurrentSchoolYear']);

    // Student classes
    Route::get('/mobile/current-student-classes', [ClassController::class, 'getStudentCurrentClasses']);
    Route::get('/mobile/enrollment-record', [ClassController::class, 'getStudentEnrollmentRecord']);

    // Faculty classes
    Route::get('/mobile/current-faculty-classes', [ClassController::class, 'getFacultyCurrentClasses']);
    Route::get('/mobile/classes-classroom-students', [ClassController::class, 'getStudents']);

    Route::post('/mobile/change-password', [AuthController::class, 'changePassword']);

    Route::get('/mobile/logout', [AuthController::class, 'logout']);
});

// CSG-ATTENDANCE
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/csg-attendance/user', [CsgAttendanceController::class, 'csgAttendanceUser']);
    Route::get('/school-structure', [CsgAttendanceController::class, 'getSchoolStructure']);
    Route::get('/student-enrollment', [CsgAttendanceController::class, 'getStudentEnrollment']);
});

Route::middleware('guest')->group(function () {
    Route::post('/mobile/login', [AuthController::class, 'login']);
    Route::post('/csg-attendance/login', [CsgAttendanceController::class, 'csgAttendanceLogin']);
});
