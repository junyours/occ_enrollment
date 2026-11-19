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

        Route::delete('files/{fileId}', 'deleteFile')
            ->whereNumber('fileId')
            ->name('files.destroy');

        Route::get('announcements', 'announcements')
            ->name('announcements');

        Route::post('announcements', 'storeAnnouncement')
            ->name('announcements.store');

        Route::get('announcements/targets', 'announcementTargets')
            ->name('announcements.targets');

        Route::get('announcements/unread', 'unreadAnnouncements')
            ->name('announcements.unread');

        Route::post('announcements/read', 'readAnnouncements')
            ->name('announcements.read');

        Route::get('announcements/{id}/seen', 'announcementSeen')
            ->whereNumber('id')
            ->name('announcements.seen');

        Route::get('announcements/{id}/comments', 'announcementComments')
            ->whereNumber('id')
            ->name('announcements.comments');

        Route::post('announcements/{id}/comments', 'storeAnnouncementComment')
            ->whereNumber('id')
            ->name('announcements.comments.store');

        Route::delete('announcements/{id}/comments/{commentId}', 'destroyAnnouncementComment')
            ->whereNumber(['id', 'commentId'])
            ->name('announcements.comments.destroy');

        Route::patch('announcements/{id}', 'updateAnnouncement')
            ->whereNumber('id')
            ->name('announcements.update');

        Route::delete('announcements/{id}', 'destroyAnnouncement')
            ->whereNumber('id')
            ->name('announcements.destroy');

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
                ['materials', 'assignments', 'submissions', 'announcements']
            )
            ->whereNumber('id');

        Route::post('{kind}/{id}/files', 'upload')
            ->whereIn(
                'kind',
                ['materials', 'assignments', 'submissions', 'announcements']
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
