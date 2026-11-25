<?php

use App\Http\Controllers\Mobile\AuthController;
use App\Http\Controllers\Mobile\ClassController;
use App\Http\Controllers\CsgAttendance\CsgAttendanceController;
use App\Http\Controllers\InstructorDashboardController;
use App\Http\Controllers\StudentAttendanceController;
use App\Http\Controllers\OAuth\UserInfoController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/mobile/user', [AuthController::class, 'user']);

    Route::get('/mobile/current-school-year', [ClassController::class, 'getCurrentSchoolYear']);

    // Student classes
    Route::get('/mobile/current-student-classes', [ClassController::class, 'getStudentCurrentClasses']);
    Route::get('/mobile/enrollment-record', [ClassController::class, 'getStudentEnrollmentRecord']);
    // The signed-in student's own attendance in one class (same data as the web).
    Route::get('/mobile/classes/{classId}/attendance', [StudentAttendanceController::class, 'show'])
        ->whereNumber('classId');

    // Faculty classes
    Route::get('/mobile/current-faculty-classes', [ClassController::class, 'getFacultyCurrentClasses']);
    Route::get('/mobile/classes-classroom-students', [ClassController::class, 'getStudents']);
    // The teacher's dashboard (same data as the web page).
    Route::get('/mobile/instructor/dashboard', [InstructorDashboardController::class, 'mobile']);
    Route::post('/mobile/instructor/students/{studentSubjectId}/absence-notice', [InstructorDashboardController::class, 'notifyAbsences'])
        ->whereNumber('studentSubjectId');

    Route::post('/mobile/change-password', [AuthController::class, 'changePassword']);

    Route::get('/mobile/logout', [AuthController::class, 'logout']);
});

// CSG-ATTENDANCE
Route::middleware(['auth:sanctum', 'csg-attendance'])->group(function () {
    Route::get('/csg-attendance/user', [CsgAttendanceController::class, 'csgAttendanceUser']);
    Route::get('/school-structure', [CsgAttendanceController::class, 'getSchoolStructure']);
    Route::get('/student-enrollment', [CsgAttendanceController::class, 'getStudentEnrollment']);
});

// "Continue with SIS-OCC": who signed in, for the app holding the Bearer token.
Route::middleware(['auth:api', 'throttle:120,1'])
    ->get('/oauth/me', UserInfoController::class)
    ->name('oauth.me');

// Limit password guessing (limiters defined in AppServiceProvider).
Route::middleware('guest')->group(function () {
    Route::post('/mobile/login', [AuthController::class, 'login'])->middleware('throttle:mobile-login');
    Route::post('/csg-attendance/login', [CsgAttendanceController::class, 'csgAttendanceLogin'])->middleware('throttle:csg-login');
});
