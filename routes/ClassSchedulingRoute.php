<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Enrollment\EnrollmentCourseSectionController;
use App\Http\Controllers\Enrollment\EnrollmentDashboardController;

Route::middleware(['auth', 'EnrollmentPrepOngoing', 'program_head'])->group(function () {
    Route::post('api/delete-main-schedule/{id}', [EnrollmentCourseSectionController::class, 'deleteMainSchedule'])->name('delete-main-class');

    Route::post('api/delete-second-schedule/{id}', [EnrollmentCourseSectionController::class, 'deleteSecondSchedule'])->name('delete-second-class');
    Route::post('api/add-second-schedule/{id}', [EnrollmentCourseSectionController::class, 'addSecondSchedule'])->name('add-second-class');
});
