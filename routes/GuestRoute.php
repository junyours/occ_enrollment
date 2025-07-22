<?php

use App\Http\Controllers\Announcement\AnnouncementController;
use App\Http\Controllers\SchoolYear\SchoolYearController;
use Illuminate\Support\Facades\Route;

Route::get('/ongoing-enrollment', [SchoolYearController::class, 'viewOngoingEnrollment'])->name('ongoing-enrollment');
Route::get('/announcement', [AnnouncementController::class, 'view'])->name('announcement');

Route::middleware(['auth'])->group(function () {
    Route::post('/announcement/upload', [AnnouncementController::class, 'upload']);
    Route::post('/announcement/update', [AnnouncementController::class, 'update']);
    Route::post('/announcement/delete', [AnnouncementController::class, 'delete']);
});
