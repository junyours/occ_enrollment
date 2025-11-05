<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Guidance\GuidanceController;

Route::middleware(['auth', 'Guidance'])->group(function () {
    Route::get('/guidance/dashboard', [GuidanceController::class, 'index'])->name('guidance.dashboard');

    // Criteria Routes
    Route::get('/guidance/criteria', [GuidanceController::class, 'criteria'])->name('guidance.criteria');
    Route::get('/criteria/create', [GuidanceController::class, 'create'])->name('criteria.create');
    Route::post('/criteria', [GuidanceController::class, 'store'])->name('criteria.store');
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

    //Student List Routes
    Route::get('/student', [GuidanceController::class, 'studentList'])->name('guidance.student.index');
    Route::get('/guidance/student/{id}/subjects', [GuidanceController::class, 'studentSubjects'])
    ->name('guidance.student.subjects');


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

