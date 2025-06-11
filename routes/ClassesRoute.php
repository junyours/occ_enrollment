<?php

use App\Http\Controllers\InstructorClasses\ClassController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'ClassesPermission'])->group(function () {
    Route::get('/classes', [ClassController::class, 'view'])->name('classes');
    Route::post('/api/get-faculty-classes', [ClassController::class, 'getFacultyClasses'])->name('get.faculty.classes');

    Route::get('/classes/classroom/{id}', [ClassController::class, 'viewClass'])->name('classes.classroom.yearsection');
    Route::post('/classes/classroom/{id}/students', [ClassController::class, 'getStudents'])->name('class.students');
});

Route::middleware(['auth', 'student'])->group(function () {
    Route::post('/api/get-student-classes', [ClassController::class, 'getStudentClasses'])->name('student.classes');
    Route::get('/enrollment-record', [ClassController::class, 'recordView'])->name('enrollment-record');
    Route::post('/enrollment-record', [ClassController::class, 'getStudentEnrollmentRecord'])->name('enrollment-record');
});
