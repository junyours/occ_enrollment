<?php

use App\Http\Controllers\User\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'UserManagementPermission'])->group(function () {
    Route::get('/faculty-list', [UserController::class, 'viewFaculty'])->name('faculty-list');
    Route::get('/student-list', [UserController::class, 'viewStudent'])->name('student-list');
    Route::post('/api/get/faculty-list', [UserController::class, 'getFacultyList'])->name('api/get.faculty.list');
});

Route::middleware(['auth', 'UserManagementPermission', 'program_head'])->group(function () {
    Route::patch('/api/set-faculty-active-status', [UserController::class, 'setFacultyActiveStatus'])->name('set.faculty.actice.status');
    Route::patch('/api/set-faculty-role', [UserController::class, 'setFacultyRole'])->name('set.faculty.role');
});
