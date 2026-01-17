<?php

use App\Http\Controllers\NstpDirector\ComponentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'NstpDirector'])->group(function () {
    Route::get('/nstp-director/section/{component}', [ComponentController::class, 'viewSections'])->name('nstp-director.component.sections');
    Route::post('/nstp-director/section/{component}', [ComponentController::class, 'getSections'])->name('nstp-director.component.sections');
    Route::post('/nstp-director/add-section/{schoolYearId}', [ComponentController::class, 'addSection'])->name('nstp-director.add-section');

    Route::post('/nstp-director/all-rooms/list', [ComponentController::class, 'getAllRooms'])->name('nstp-director.all-rooms');
    Route::post('/nstp-director/all-isntructors/list', [ComponentController::class, 'getAllInstructors'])->name('nstp-director.all-instructors');

    Route::post('/nstp-director/update-section', [ComponentController::class, 'updateSection'])->name('gened-coordinator.update.class');

    Route::post('/nstp-director/room-schedules', [ComponentController::class, 'getRoomSchedules'])->name('nstp-director.roomSchedules');
    Route::post('/nstp-director/instructor-schedules', [ComponentController::class, 'getInstructorSchedules'])->name('nstp-director.instructorSchedules');
});
