<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ScheduleContoller;

Route::middleware(['auth', 'maintenance', 'role:academic_dean'])->group(function () {
    Route::get('/faculty-schedules', [ScheduleContoller::class, 'viewFacultySchedules'])->name('schedules.view-faculty-schedules');
    Route::post('/faculty-schedules', [ScheduleContoller::class, 'getFacultySchedules'])->name('schedules.get-faculty-schedules');

    Route::get('/room-schedules', [ScheduleContoller::class, 'viewRoomSchedules'])->name('schedules.view-room-schedules');
    Route::post('/room-schedules', [ScheduleContoller::class, 'getRoomSchedules'])->name('schedules.get-room-schedules');
});
