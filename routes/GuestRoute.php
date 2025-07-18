<?php

use App\Http\Controllers\Announcement\AnnouncementController;
use App\Http\Controllers\SchoolYear\SchoolYearController;
use Illuminate\Support\Facades\Route;

Route::get('/ongoing-enrollment', [SchoolYearController::class, 'viewOngoingEnrollment'])->name('ongoing-enrollment');
Route::get('/announcement', [AnnouncementController::class, 'view'])->name('announcement');
