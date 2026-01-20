<?php

use App\Http\Controllers\NstpDirector\ComponentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'NstpDirector'])->group(function () {
    Route::get('/nstp-director/section/{component}', [ComponentController::class, 'viewSections'])->name('nstp-director.component.sections');
    Route::post('/nstp-director/section/{component}', [ComponentController::class, 'getSections'])->name('nstp-director.component.sections');
    Route::post('/nstp-director/add-section/{schoolYearId}', [ComponentController::class, 'addSection'])->name('nstp-director.add-section');

    Route::get('/nstp-director/section/{component}/{section}', [ComponentController::class, 'viewSectionStudents'])->name('nstp-director.component.sections.student-list');
    Route::post('/nstp-director/section/{component}/{section}', [ComponentController::class, 'getSectionSudents'])->name('nstp-director.component.sections.student-list');

    Route::post('/nstp-director/section/component}/{section}/remove-student', [ComponentController::class, 'removeStudent'])->name('nstp-director.component.sections.student-list.remove-student');
    Route::post('/nstp-director/section/component}/{section}/move-student', [ComponentController::class, 'moveStudent'])->name('nstp-director.component.sections.student-list.move-student');

    Route::post('/nstp-director/change-max-students', [ComponentController::class, 'changeMaxStudents'])->name('nstp-director.change-max-students');

    Route::post('/nstp-director/all-rooms/list', [ComponentController::class, 'getAllRooms'])->name('nstp-director.all-rooms');
    Route::post('/nstp-director/all-isntructors/list', [ComponentController::class, 'getAllInstructors'])->name('nstp-director.all-instructors');

    Route::post('/nstp-director/update-section', [ComponentController::class, 'updateSection'])->name('nstp-director.update.class');

    Route::post('/nstp-director/room-schedules', [ComponentController::class, 'getRoomSchedules'])->name('nstp-director.roomSchedules');
    Route::post('/nstp-director/instructor-schedules', [ComponentController::class, 'getInstructorSchedules'])->name('nstp-director.instructorSchedules');

    Route::get('/nstp-director/rooms-schedules', [ComponentController::class, 'viewRoomsSchedules'])->name('nstp-director.rooms-schedules');
    Route::post('/nstp-director/rooms-schedules', [ComponentController::class, 'getRoomsSchedules'])->name('nstp-director.rooms-schedules');
    Route::get('/nstp-director/faculties-schedules', [ComponentController::class, 'viewFacultiesSchedules'])->name('nstp-director.faculties-schedules');
    Route::post('/nstp-director/faculties-schedules', [ComponentController::class, 'getFacultiesSchedules'])->name('nstp-director.faculties-schedules');

    Route::post('/nstp-director/school-year-components-sections', [ComponentController::class, 'getAllComponentSections'])->name('nstp-director.school-year-components-sections');
    Route::post('/nstp-director/remove-section', [ComponentController::class, 'removeSection'])->name('nstp-director.remove-section');
});
