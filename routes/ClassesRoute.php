<?php

use App\Http\Controllers\InstructorClasses\ClassController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'ClassesPermission'])->group(function () {
    Route::get('/classes', [ClassController::class, 'view'])->name('classes');
    Route::post('/api/get-faculty-classes/{schoolYearId}', [ClassController::class, 'getFacultyClasses'])->name('get.faculty.classes');

    Route::get('/classes/classroom/{id}', [ClassController::class, 'viewClass'])->name('classes.classroom.yearsection');
    Route::post('/classes/classroom/{id}/students', [ClassController::class, 'getStudents'])->name('class.students');

    Route::post('/grade-submissions/settings/{id}', [ClassController::class, 'gradeSubmissionSettings']);

    Route::post('/upload-student-grades/{yearSectionSubjectsId}', [ClassController::class, 'updateStudentsGrades'])->name('upload.students.grades');
    Route::patch('/student-grade/midterm/{yearSectionSubjectsId}/{studentId}', [ClassController::class, 'updateStudentMidtermGrade'])->name('student.midterm.grade');
    Route::patch('/student-grade/final/{yearSectionSubjectsId}/{studentId}', [ClassController::class, 'updateStudentFinalGrade'])->name('student.final.grade');

    // Submit all
    Route::post('/submit-student-grades/{yearSectionSubjectsId}', [ClassController::class, 'submitGrade'])->name('grade-submission.submit');

    // MIDTERM and FINAL grade submission
    Route::post('/submit-student-midterm-grades/{yearSectionSubjectsId}', [ClassController::class, 'submitMidtermGrade'])->name('grade-submission.submit-midterm-grade');
    Route::post('/cancel-student-midterm-grades/{yearSectionSubjectsId}', [ClassController::class, 'cancelMidtermSubmission'])->name('grade-submission.cancel-midterm-grade');
    Route::post('/submit-student-final-grades/{yearSectionSubjectsId}', [ClassController::class, 'submitFinalGrade'])->name('grade-submission.submit-final-grade');
    Route::post('/cancel-student-final-grades/{yearSectionSubjectsId}', [ClassController::class, 'cancelFinalSubmission'])->name('grade-submission.cancel-final-grade');

    Route::post('/submit-student-grades/cancel/{yearSectionSubjectsId}', [ClassController::class, 'cancelGrade'])->name('grade-submission.cancel');

    Route::get('/classes/classroom/{id}/students/download', [ClassController::class, 'downloadStudentsExcel'])->name('class.students.download');
});

Route::middleware(['auth', 'maintenance', 'student'])->group(function () {
    Route::post('/enrollment-record', [ClassController::class, 'getStudentEnrollmentRecord'])->name('enrollment-record');
    Route::post('/api/get-student-classes', [ClassController::class, 'getStudentClasses'])->name('student.classes');
});
