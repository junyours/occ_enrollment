<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ScheduleContoller;
use App\Http\Controllers\AcademicDean\GradeSubmissionController;

Route::middleware(['auth', 'maintenance', 'role:academic_dean'])->group(function () {
    Route::get('/academic-dean/grade-submissions', [GradeSubmissionController::class, 'index'])->name('academic-dean.grade-submissions.index');
    Route::get('/academic-dean/grade-submissions/data', [GradeSubmissionController::class, 'data'])->name('academic-dean.grade-submissions.data');
    Route::get('/academic-dean/grade-submissions/users/{user}/subjects', [GradeSubmissionController::class, 'subjects'])
        ->whereNumber('user')->name('academic-dean.grade-submissions.subjects');

    Route::get('/faculty-schedules', [ScheduleContoller::class, 'viewFacultySchedules'])->name('schedules.view-faculty-schedules');
    Route::post('/faculty-schedules', [ScheduleContoller::class, 'getFacultySchedules'])->name('schedules.get-faculty-schedules');

    Route::get('/room-schedules', [ScheduleContoller::class, 'viewRoomSchedules'])->name('schedules.view-room-schedules');
    Route::post('/room-schedules', [ScheduleContoller::class, 'getRoomSchedules'])->name('schedules.get-room-schedules');
});
