<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\VPAA\VPAAController;

Route::middleware(['auth', 'vpaa'])->group(function () {
    Route::get('/vpaadashboard', [VPAAController::class, 'vpaadashboard'])->name('vdashboard');

    //Faculty List
    Route::get('/vpaa/faculty', [VPAAController::class, 'facultyList'])->name('vpaa.faculty.index');
    Route::get('/vpaa/faculty/{id}/subjects', [VPAAController::class, 'showSubjects'])->name('vpaa.faculty.subjects');
    Route::get('/vpaa/faculty/{facultyId}/subject/{studentSubjectId}/evaluation', [VPAAController::class, 'facultyEvaluationResult'])->name('vpaa.faculty.subject.evaluation');

    //Faculty Ranking
    Route::get('/vpaaranking', [VPAAController::class, 'facultyRanking'])->name('vpaa.faculty.ranking');

    //Student List
    Route::get('/vpaa/student', [VPAAController::class, 'studentList'])->name('vpaa.student.index');
    Route::get('/vpaa/guidance/student/{id}/subjects', [VPAAController::class, 'studentSubjects'])
        ->name('vpaa.student.subjects');


    //aRCHIVES
    Route::get('/vpaa/archive', [VPAAController::class, 'Archive'])->name('vpaa.archive');

    //Faculty Evaluation Result Archives
    Route::get('/vpaa/archives/', [VPAAController::class, 'evalResult']);
    Route::get('/vpaa/faculty-list/{schoolYearId}', [VPAAController::class, 'evalfacultyList'])
        ->name('vpaa.faculty.list');
    Route::get('/vpaa/faculty-subjects/{facultyId}/{schoolYearId}', [VPAAController::class, 'facultySubjects'])
        ->name('vpaa.faculty.subjects');
    Route::get(
        '/vpaa/faculty-evaluation/{facultyId}/{studentSubjectId}/{schoolYearId}',
        [VPAAController::class, 'archiveEvaluationResult']
    )->name('vpaa.faculty.evaluation');

    //Student Archives
    Route::get('/vpaa/studarchives/', [VPAAController::class, 'studEval']);
    Route::get('/vpaa/archives/students/{schoolYearId?}', [VPAAController::class, 'archivestudentList'])
        ->name('vpaa.archives.students.list');
    Route::get('/vpaa/archives/students/{studentId}/subjects/{schoolYearId?}', [VPAAController::class, 'archivestudentSubjects'])
        ->name('vpaa.archives.students.subjects');

    //Faculty Ranking
    Route::get('/vpaa/rankarchives/', [VPAAController::class, 'rankEval']);
    Route::get('/vpaa/archives/ranking/{schoolYearId?}', [VPAAController::class, 'archiveRanking'])
        ->name('vpaa.archives.faculty.rank');
});
