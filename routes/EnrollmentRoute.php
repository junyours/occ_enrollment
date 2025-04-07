<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Enrollment\EnrollmentCourseSectionController;
use App\Http\Controllers\Enrollment\EnrollmentDashboardController;

Route::middleware(['auth', 'EnrollmentPrepOngoing', 'EnrollmentPermission'])->group(function () {
    Route::get('/dashboard', [EnrollmentDashboardController::class, 'view'])->name('dashboard');

    Route::get('/enrollment/{id}', [EnrollmentCourseSectionController::class, 'view'])->name('enrollment.view');
    Route::post('/enrollment/{id}', [EnrollmentCourseSectionController::class, 'getEnrollmentCourseSections'])->name('get.enrollment.course.section');

    Route::get('/enrollment/{id}/class/{yearlevel}', [EnrollmentCourseSectionController::class, 'viewClass'])->name('enrollment.view.class');

    Route::get('/enrollment/{id}/students/{yearlevel}', [EnrollmentCourseSectionController::class, 'viewStudents'])->name('enrollment.view.students');
    Route::get('/enrollment/{id}/students/{yearlevel}/subjects', [EnrollmentCourseSectionController::class, 'viewStudentSubjects'])->name('enrollment.view.student.subjects');
    Route::get('/enrollment/{id}/students/{yearlevel}/subjects', [EnrollmentCourseSectionController::class, 'viewStudentSubjects'])->name('enrollment.view.student.subjects');

    Route::get('/enrollment/{id}/enroll-student/{yearlevel}', [EnrollmentCourseSectionController::class, 'enrollStudent'])->name('enrollment.view.enroll-student');
    Route::post('/enrollment/{id}/enroll-student/{yearlevel}', [EnrollmentCourseSectionController::class, 'getEnrolledStudentList'])->name('get.enrolled.student.list');

    Route::post('/api/get-enrollment-dashboard-data', [EnrollmentDashboardController::class, 'getEnrollmentDashboardData'])->name('get.enrollment.dashboard.data');
});

Route::post('/api/get-student-subjects', [EnrollmentCourseSectionController::class, 'getStudentSubjects'])->name('get.student.subjects');
