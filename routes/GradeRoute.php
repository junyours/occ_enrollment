<?php

use App\Http\Controllers\GradeController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'program_head'])->group(function () {
    Route::get('/submitted-grades', [GradeController::class, 'viewSubmittedGrades'])->name('submitted-grades');
    Route::post('/faculty-list/submitted-grades', [GradeController::class, 'getFacultyListSubmittedGrades'])->name('faculty-list.submitted-grades');
    Route::get('/submitted-grades/{schoolYear}/{semester}/{facultyId}', [GradeController::class, 'viewFacultySubjects'])->name('faculty.subjects');
    Route::get('/submitted-grades/{schoolYear}/{semester}/{facultyId}/{yearSectionSubjectsId}', [GradeController::class, 'viewSubjectStudents'])->name('faculty.subject.students');
    Route::post('/submitted-grades/subject-students', [GradeController::class, 'viewFacultySubjectStudents'])->name('faculty.subjects.students');

    // Route::post('/submitted-grades/verify/{yearSectionSubjectsId}', [GradeController::class, 'verifyGrades'])->name('verify.grades');

    // verify grades
    Route::post('/submitted-grades/verify-midterm/{yearSectionSubjectsId}', [GradeController::class, 'verifyMidtermGrades'])->name('verify.grades.midterm');
    Route::post('/submitted-grades/verify-final/{yearSectionSubjectsId}', [GradeController::class, 'verifyFinalGrades'])->name('verify.grades.final');

    // reject grades
    Route::post('/submitted-grades/reject-midterm/{yearSectionSubjectsId}', [GradeController::class, 'rejectMidtermGrades'])->name('reject.grades-midterm');
    Route::post('/submitted-grades/reject-final/{yearSectionSubjectsId}', [GradeController::class, 'rejectFinalGrades'])->name('reject.grades-final');
    Route::post('/verified-grades/unreject-midterm/{yearSectionSubjectsId}', [GradeController::class, 'unrejectMidtermGrades'])->name('unreject.grades-midterm');
    Route::post('/verified-grades/unreject-final/{yearSectionSubjectsId}', [GradeController::class, 'unrejectFinalGrades'])->name('unreject.grades-final');

    // unverify grades
    // Route::post('/verify-student-grades/cancel/{yearSectionSubjectsId}', [GradeController::class, 'cancelVerifyGrade'])->name('grade-verification.cancel');
    Route::post('/verify-student-grades/unverify-midterm/{yearSectionSubjectsId}', [GradeController::class, 'unverifyMidtermGrade'])->name('grade-verification.unverify-midterm');
    Route::post('/verify-student-grades/unverify-final/{yearSectionSubjectsId}', [GradeController::class, 'unverifyFinalGrade'])->name('grade-verification.unverify-final');
});

Route::middleware(['auth', 'maintenance', 'registrar'])->group(function () {
    Route::get('/verified-grades', [GradeController::class, 'viewVerifiedGrades'])->name('verified-grades');
    Route::post('/faculty-list/verified-grades', [GradeController::class, 'getFacultyListVerifiedGrades'])->name(name: 'faculty-list.verified-grades');
    Route::get('/verified-grades/{schoolYear}/{semester}/{facultyId}', [GradeController::class, 'viewFacultyVerifiedSubjects'])->name('verified.faculty.subjects');
    Route::get('/verified-grades/{schoolYear}/{semester}/{facultyId}/{yearSectionSubjectsId}', [GradeController::class, 'viewVerifiedSubjectStudents'])->name('verified.faculty.subject.students');
    Route::post('/verified-grades/subject-students', [GradeController::class, 'viewFacultyVerifiedSubjectStudents'])->name('faculty.verified.subjects.students');

    // Deploying grades
    Route::post('/verified-grades/deploy/{yearSectionSubjectsId}', [GradeController::class, 'deployGrades'])->name('deploy.grades');
    Route::post('/verified-grades/deploy/midterm-grades/{yearSectionSubjectsId}', [GradeController::class, 'deployMidtermGrades'])->name('deploy.midterm-grades');
    Route::post('/verified-grades/deploy/final-grades/{yearSectionSubjectsId}', [GradeController::class, 'deployFinalGrades'])->name('deploy.final-grades');

    Route::post('/verified-grades/undeploy/midterm-grades/{yearSectionSubjectsId}', [GradeController::class, 'undeployMidtermGrades'])->name('undeploy.midterm-grades');
    Route::post('/verified-grades/undeploy/final-grades/{yearSectionSubjectsId}', [GradeController::class, 'undeployFinalGrades'])->name('undeploy.final-grades');
});

Route::middleware(['auth', 'maintenance'])->group(function () {
    Route::post('/program-head-name/{yearSectionSubjectsId}', [GradeController::class, 'programHeadName'])->name('program-head-name');
});

Route::middleware(['auth', 'ClassesPermission'])->group(function () {
    Route::get('/subjects-list', [GradeController::class, 'gradesSubjectsList'])->name('subjects-list');
    Route::post('/instructor-subjects', [GradeController::class, 'instructorSubjects'])->name('instructor-subjects');

    Route::get('/subjects-list/{id}', [GradeController::class, 'instructorSubjectsViewSubject'])->name('instructor-subjects.view-subject');
    
    Route::get('/requests', [GradeController::class, 'gradesInstructorRequests'])->name('requests');

});
