<?php

use App\Http\Controllers\GenedCoordinator\CourseController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'GenedCoordinator'])->group(function () {
    Route::get('/gened-coordinator/sections/{hashedCourseID}', [CourseController::class, 'viewSections'])->name('gened-coordinator.sections');
    Route::post('/gened-coordinator/sections/{hashedCourseID}', [CourseController::class, 'getSections'])->name('gened-coordinator.sections');

    Route::get('/gened-coordinator/sections/{hashedCourseID}/class/{yearLevel}', [CourseController::class, 'openClass'])->name('gened-coordinator.class');
    Route::post('/gened-coordinator/sections/{hashedCourseID}/class/{yearLevel}', [CourseController::class, 'getSubjects'])->name('gened-coordinator.class');

    Route::post('/gened-coordinator/all-rooms', [CourseController::class, 'getAllRooms'])->name('gened-coordinator.all-rooms');
    Route::post('/gened-coordinator/all-isntructors', [CourseController::class, 'getAllInstructors'])->name('gened-coordinator.all-instructors');

    Route::post('/gened-coordinator/room-schedules', [CourseController::class, 'getRoomSchedules'])->name('gened-coordinator.roomSchedules');
    Route::post('/gened-coordinator/instructor-schedules', [CourseController::class, 'getInstructorSchedules'])->name('gened-coordinator.instructorSchedules');
   
    Route::post('/gened-coordinator/update-class', [CourseController::class, 'updateClass'])->name('gened-coordinator.update.class');
});
