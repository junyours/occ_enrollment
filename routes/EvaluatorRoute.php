<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Enrollment\EnrollmentCourseSectionController;
use App\Http\Controllers\Enrollment\EnrollmentDashboardController;

// Route::middleware(['auth', 'maintenance', 'evaluator'])->group(function () {

//     Route::middleware(['EnrollmentPrepOngoing'])->group(function () {
//         Route::get('/enrollment/{id}', [EnrollmentCourseSectionController::class, 'view'])->name('enrollment.view');
//         Route::post('/enrollment/{id}', [EnrollmentCourseSectionController::class, 'getEnrollmentCourseSections'])->name('get.enrollment.course.section');

//         Route::get('/enrollment/{id}/class/{yearlevel}', [EnrollmentCourseSectionController::class, 'viewClass'])->name('enrollment.view.class');

//         Route::get('/dashboard', [EnrollmentDashboardController::class, 'view'])->name('dashboard');
//     });
// });
