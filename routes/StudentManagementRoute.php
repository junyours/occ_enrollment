<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\StudentManagement\StudentManagementController;

Route::middleware(['auth', 'maintenance', 'StudentManagementPermission'])->group(function () {
    Route::post('/student-grades', [StudentManagementController::class, 'getStudentGrades'])->name('student-grades');
});
