<?php

use App\Http\Controllers\SchoolYear\SchoolYearController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'registrar'])->group(function () {
    Route::get('/school-year', [SchoolYearController::class, 'view'])->name('school-year');

    Route::post('/api/school-year', [SchoolYearController::class, 'addSchoolYear'])->name('add.school-year');
    Route::patch('/api/school-year/{id}', [SchoolYearController::class, 'editSchoolYear'])->name('edit.school-year');
});

Route::middleware(['auth', 'SchoolYearPermission'])->group(function () {
    Route::get('/school-year', [SchoolYearController::class, 'view'])->name('school-year');
    Route::post('/api/school-year/list', [SchoolYearController::class, 'schoolYears'])->name('school-year.list');

    Route::get('/school-year/{schoolyear}/{semester}', [SchoolYearController::class, 'viewSchoolYear'])->name('school-year.view');
    Route::get('/school-year/{schoolyear}/{semester}/{courseId}', [SchoolYearController::class, 'viewCourse'])->name('school-year.course.view');

    Route::get('/school-year/{schoolyear}/{semester}/{hashedCourseId}/class/{yearlevel}', [SchoolYearController::class, 'viewClass'])->name('school-year.view.class');
    Route::get('/school-year/{schoolyear}/{semester}/{hashedCourseId}/students/{yearlevel}', [SchoolYearController::class, 'viewStudents'])->name('school-year.view.students');
    Route::get('/school-year/{schoolyear}/{semester}/{hashedCourseId}/students/{yearlevel}/subjects', [SchoolYearController::class, 'viewStudentSubjects'])->name('school-year.view.student.subjects');
    Route::get('/school-year/{schoolyear}/{semester}/{hashedCourseId}/students/{yearlevel}/cor', [SchoolYearController::class, 'viewStudentCor'])->name('school-year.view.student.cor');
});
