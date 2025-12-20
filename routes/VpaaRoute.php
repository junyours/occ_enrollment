<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\VPAA\VPAAController;

Route::middleware(['auth', 'vpaa'])->group(function () {
    Route::get('/vpaadashboard', [VPAAController::class, 'vpaadashboard'])->name('vdashboard');

    //Faculty List
    Route::get('/faculty', [VPAAController::class, 'facultyList'])->name('vpaa.faculty.index');
    Route::get('/faculty/{id}/subjects', [VPAAController::class, 'showSubjects'])->name('vpaa.faculty.subjects');
    Route::get('/vpaa/faculty/{facultyId}/subject/{studentSubjectId}/evaluation', [VPAAController::class, 'facultyEvaluationResult'])->name('vpaa.faculty.subject.evaluation');

    //Faculty Ranking
    Route::get('ranking', [VPAAController::class, 'facultyRanking'])->name('vpaa.faculty.ranking');

    //Student List
    Route::get('/student', [VPAAController::class, 'studentList'])->name('vpaa.student.index');
    Route::get('/guidance/student/{id}/subjects', [VPAAController::class, 'studentSubjects'])
        ->name('vpaa.student.subjects');


    //aRCHIVES
    Route::get('/vpaa/archive', [VPAAController::class, 'Archive'])->name('vpaa.archive');

    //Faculty Evaluation Result Archives
    Route::get('/archives/', [VPAAController::class, 'evalResult']);
    Route::get('/faculty-list/{schoolYearId}', [VPAAController::class, 'evalfacultyList'])
        ->name('faculty.list');
    Route::get('/faculty-subjects/{facultyId}/{schoolYearId}', [VPAAController::class, 'facultySubjects'])
        ->name('faculty.subjects');
    Route::get(
        '/faculty-evaluation/{facultyId}/{studentSubjectId}/{schoolYearId}',
        [VPAAController::class, 'archiveEvaluationResult']
    )->name('faculty.evaluation');

    //Student Archives
    Route::get('/studarchives/', [VPAAController::class, 'studEval']);
    Route::get('/archives/students/{schoolYearId?}', [VPAAController::class, 'archivestudentList'])
        ->name('archives.students.list');
    Route::get('/archives/students/{studentId}/subjects/{schoolYearId?}', [VPAAController::class, 'archivestudentSubjects'])
        ->name('archives.students.subjects');

    //Faculty Ranking
    Route::get('/rankarchives/', [VPAAController::class, 'rankEval']);
    Route::get('/archives/ranking/{schoolYearId?}', [VPAAController::class, 'archiveRanking'])
        ->name('archives.faculty.rank');
});
