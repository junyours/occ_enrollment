<?php

use App\Http\Controllers\Enrollment\EnrollmentCourseSectionController;

use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/get/enrollment/course/section/{id}', [EnrollmentCourseSectionController::class, 'getEnrollmentCourseSections'])->name('get.enrollment.course.section');
    Route::post('/enrollment', [EnrollmentCourseSectionController::class, 'addNewSection'])->name('add.new.section');
});