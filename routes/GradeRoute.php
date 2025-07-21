<?php

use App\Http\Controllers\GradeController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'program_head'])->group(function () {
    Route::get('/submitted-grades', [GradeController::class, 'viewSubmittedGrades'])->name('submitted-grades');
    Route::post('/faculty-list/submitted-grades', [GradeController::class, 'getFacultyListSubmittedGrades'])->name('faculty-list.submitted-grades');
    Route::get('/submitted-grades/{schoolYear}/{semester}/{facultyId}', [GradeController::class, 'viewFacultySubjects'])->name('faculty.subjects');
    Route::get('/submitted-grades/{schoolYear}/{semester}/{facultyId}/{yearSectionSubjectsId}', [GradeController::class, 'viewSubjectStudents'])->name('faculty.subject.students');
    Route::post('/submitted-grades/subject-students', [GradeController::class, 'viewFacultySubjectStudents'])->name('faculty.subjects.students');
    Route::post('/submitted-grades/verify/{yearSectionSubjectsId}', [GradeController::class, 'verifyGrades'])->name('verify.grades');
});

Route::middleware(['auth', 'maintenance', 'registrar'])->group(function () {
    Route::get('/verified-grades', [GradeController::class, 'viewVerifiedGrades'])->name('verified-grades');
    Route::post('/faculty-list/verified-grades', [GradeController::class, 'getFacultyListVerifiedGrades'])->name(name: 'faculty-list.submitted-grades');
    Route::get('/verified-grades/{schoolYear}/{semester}/{facultyId}', [GradeController::class, 'viewFacultyVerifiedSubjects'])->name('verified.faculty.subjects');
    Route::get('/verified-grades/{schoolYear}/{semester}/{facultyId}/{yearSectionSubjectsId}', [GradeController::class, 'viewVerifiedSubjectStudents'])->name('verified.faculty.subject.students');
    Route::post('/submitted-grades/subject-students', [GradeController::class, 'viewFacultyVerifiedSubjectStudents'])->name('faculty.verified.subjects.students');
    Route::post('/submitted-grades/deploy/{yearSectionSubjectsId}', [GradeController::class, 'deployGrades'])->name('deploy.grades');
});
