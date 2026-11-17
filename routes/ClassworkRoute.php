<?php

use App\Http\Controllers\ClassworkController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')
    ->prefix('classes/{classId}/classwork')
    ->where(['classId' => '[0-9]+'])
    ->name('classwork.')
    ->controller(ClassworkController::class)
    ->group(function () {
        Route::get('assessments', 'assessments')
            ->name('assessments');

        Route::post('assessments', 'storeAssessment')
            ->name('assessments.store');

        Route::get('grading-categories', 'gradingCategories')
            ->name('grading-categories');

        Route::get('files/{fileId}', 'download')
            ->whereNumber('fileId')
            ->name('download');

        Route::get(
            'assignments/{id}/submissions',
            'submissions'
        )->whereNumber('id');

        Route::get(
            'assignments/{id}/mine',
            'mine'
        )->whereNumber('id');

        Route::post(
            'assignments/{id}/draft',
            'draft'
        )->whereNumber('id');

        Route::post(
            'assignments/{id}/submit',
            'submit'
        )->whereNumber('id');

        Route::put(
            'assignments/{id}/submissions/{submissionId}/grade',
            'grade'
        )->whereNumber(['id', 'submissionId']);

        Route::get('{kind}/{id}/files', 'files')
            ->whereIn(
                'kind',
                ['materials', 'assignments', 'submissions']
            )
            ->whereNumber('id');

        Route::post('{kind}/{id}/files', 'upload')
            ->whereIn(
                'kind',
                ['materials', 'assignments', 'submissions']
            )
            ->whereNumber('id');

        Route::get('{kind}', 'index')
            ->whereIn('kind', ['materials', 'assignments']);

        Route::post('{kind}', 'save')
            ->whereIn('kind', ['materials', 'assignments']);

        Route::patch('{kind}/{id}', 'save')
            ->whereIn('kind', ['materials', 'assignments'])
            ->whereNumber('id');

        Route::post('materials/{id}/archive', 'archive')
            ->whereNumber('id')
            ->name('materials.archive');

        Route::delete('materials/{id}', 'destroyMaterial')
            ->whereNumber('id')
            ->name('materials.destroy');
    });
