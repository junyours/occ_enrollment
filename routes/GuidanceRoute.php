<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Guidance\GuidanceController;

Route::middleware(['auth', 'Guidance'])->group(function () {
    Route::get('/guidance/dashboard', [GuidanceController::class, 'index'])->name('guidance.dashboard');


    // Criteria Routes
    Route::get('/guidance/criteria', [GuidanceController::class, 'criteria'])->name('guidance.criteria');
    Route::get('/criteria/create', [GuidanceController::class, 'create'])->name('criteria.create');
    Route::post('/criteria', [GuidanceController::class, 'store'])->name('criteria.store');
    Route::post('/criteria/save', [GuidanceController::class, 'save'])->name('criteria.save');
    Route::delete('/criteria/{id}', [GuidanceController::class, 'destroy'])->name('criteria.destroy');
    Route::put('/criteria/{id}', [GuidanceController::class, 'criteria_update'])->name('criteria.update');


    // Questionnaire Routes
    Route::get('/guidance/questionnaire', [GuidanceController::class, 'quesCri'])->name('guidance.questionnaire');
    // Route::get('/guidance/evaluation-qc', [GuidanceController::class, 'quesCri'])->name('guidance.qc');
    Route::post('/criteria/{id}/questions', [GuidanceController::class, 'storeQuestions'])->name('questions.store');
    Route::get('/guidance/questionnaireform', [GuidanceController::class, 'questionnaireForm'])->name('guidance.questionnaireform');
    Route::post('/questionnaire/save-order', [GuidanceController::class, 'saveOrder']);
    Route::delete('/questions/{id}', [GuidanceController::class, 'softDeleteQuestion'])->name('questions.softDelete');
    Route::post('/questions/{id}/restore', [GuidanceController::class, 'restoreQuestion'])->name('questions.restore');
    Route::put('/questions/{id}', [GuidanceController::class, 'updateQuestion']);

    // Evaluation Routes
    Route::get('/guidance/evaluation', [GuidanceController::class, 'evaluation'])->name('guidance.evaluation');
    Route::post('/evaluation', [GuidanceController::class, 'eval_store'])->name('evaluation.store');
    Route::put('/evaluations/{evaluation}', [GuidanceController::class, 'eval_update'])->name('evaluation.update');
    Route::delete('/evaluation/{evaluation}', [GuidanceController::class, 'eval_destroy'])->name('evaluation.destroy');

    // Faculty Routes
    //  Route::get('/faculty', [GuidanceController::class, 'facultyList'])->name('faculty.list');
    //  Route::get('/faculty/{id}/subjects', [GuidanceController::class, 'facultySubject'])->name('faculty.subjects');
    Route::get('/faculty', [GuidanceController::class, 'facultyList'])->name('guidance.faculty.index');
    Route::get('/faculty/{id}/subjects', [GuidanceController::class, 'showSubjects'])->name('guidance.faculty.subjects');
    Route::get('/guidance/faculty/{facultyId}/subject/{studentSubjectId}/evaluation', [GuidanceController::class, 'facultyEvaluationResult'])->name('guidance.faculty.subject.evaluation');
    Route::get('/faculty/evaluation/{faculty_id}/{subject_id}/{evaluation_id}/respondents', [GuidanceController::class, 'viewEvaluationRespondents'])
        ->name('faculty.evaluation.respondents');
    Route::get('ranking', [GuidanceController::class, 'facultyRanking'])->name('guidance.faculty.ranking');
    Route::get('/faculty/top5/certificate/{facultyId}', [GuidanceController::class, 'generateCertificate'])->name('faculty.certificate');


    //Student List Routes
    Route::get('/student', [GuidanceController::class, 'studentList'])->name('guidance.student.index');
    Route::get('/guidance/student/{id}/subjects', [GuidanceController::class, 'studentSubjects'])
        ->name('guidance.student.subjects');


    //ARchives
    Route::get('/guidance/archive', [GuidanceController::class, 'Archive'])->name('guidance.archive');

    //Faculty Evaluation Result Archives
    Route::get('/archives/', [GuidanceController::class, 'evalResult']);
    Route::get('/faculty-list/{schoolYearId}', [GuidanceController::class, 'evalfacultyList'])
        ->name('faculty.list');
    Route::get('/faculty-subjects/{facultyId}/{schoolYearId}', [GuidanceController::class, 'facultySubjects'])
        ->name('faculty.subjects');
    Route::get(
        '/faculty-evaluation/{facultyId}/{studentSubjectId}/{schoolYearId}',
        [GuidanceController::class, 'archiveEvaluationResult']
    )->name('faculty.evaluation');


    //Student Archives
    Route::get('/studarchives/', [GuidanceController::class, 'studEval']);
    // Student list for archives (optional schoolYearId)
    Route::get('/archives/students/{schoolYearId?}', [GuidanceController::class, 'archivestudentList'])
        ->name('archives.students.list');

    // Fetch subjects for a specific student in archives (optional schoolYearId)
    Route::get('/archives/students/{studentId}/subjects/{schoolYearId?}', [GuidanceController::class, 'archivestudentSubjects'])
        ->name('archives.students.subjects');

    //Faculty Rabking
    Route::get('/rankarchives/', [GuidanceController::class, 'rankEval']);
    Route::get('/archives/ranking/{schoolYearId?}', [GuidanceController::class, 'archiveRanking'])
        ->name('archives.facuulty.rank');

    //Trash
    Route::get('/guidance/trash', [GuidanceController::class, 'Trash'])->name('guidance.trash');
    Route::post('/trash/restore', [GuidanceController::class, 'restore'])->name('trash.restore');
    Route::delete('/trash/delete/{type}/{id}', [GuidanceController::class, 'delete'])->name('trash.delete');
    Route::post('/trash/restore-all', [GuidanceController::class, 'restoreAll']);
    Route::delete('/trash/delete-all', [GuidanceController::class, 'deleteAll']);
});

Route::middleware(['auth', 'student'])->group(function () {
    // Student Evaluation Questions
    Route::get('/student_evalaution', [GuidanceController::class, 'stud_questionnaire'])->name('student.evaluation');
    Route::get('/student_eval_question', [GuidanceController::class, 'stud_eval_questionnaire'])->name('student.eval_question');
    Route::get('/student_eval_question/{id}', [GuidanceController::class, 'stud_eval_questionnaire'])
        ->name('student.eval_question');
    Route::get('/student/evaluation/preview/{evaluationId}/{studentSubjectId}', [GuidanceController::class, 'previewEvaluation'])->name('student.eval_question_preview');
    Route::post('/student/evaluation/submit', [GuidanceController::class, 'submit'])
        ->name('student.evaluation.submit');
    Route::get('/student/evaluation/draft/{evaluation}/{studentSubject}', [GuidanceController::class, 'loadDraft']);
    Route::post('/draft/save', [GuidanceController::class, 'saveDraft'])->name('student.evaluation.draft.save');
    Route::delete('/draft/{evaluation}/{studentSubject}', [GuidanceController::class, 'deleteDraft']);
});



Route::middleware(['auth', 'program_head'])->group(function () {
    Route::get('/faculty-result/', [GuidanceController::class, 'phFacultyReport'])->name('ph.faculty.report');
    Route::get('/program-head/faculty-list/{schoolYearId}', [GuidanceController::class, 'facultyReport'])
        ->name('ph.faculty.list');
    Route::get('/program-head/faculty-subjects/{facultyId}/{schoolYearId}', [GuidanceController::class, 'phfacultySubjects'])
        ->name('ph.faculty.subjects');
    Route::get(
        '/program-head/faculty-evaluation/{facultyId}/{studentSubjectId}/{schoolYearId}',
        [GuidanceController::class, 'phEvaluationResult']
    )->name('ph.faculty.evaluation');
});
