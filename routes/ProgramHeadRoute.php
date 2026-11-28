<?php

use App\Http\Controllers\Curriculum\CurriculumController;
use App\Http\Controllers\Curriculum\SubjectGroupController;
use App\Http\Controllers\Enrollment\ClassScheduling\EnrollmentClassSchedulingController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Enrollment\EnrollmentCourseSectionController;
use App\Http\Controllers\Enrollment\EnrollmentDashboardController;
use App\Http\Controllers\Instructors\InstructorsController;
use App\Http\Controllers\Room\RoomController;

Route::middleware(['auth', 'maintenance', 'program_head'])->group(function () {
    Route::get('/curriculum-subjects/search', [CurriculumController::class, 'searchSubjects'])->name('curr.subjects.search');
    Route::get('/curriculum', [CurriculumController::class, 'view'])->name('curriculum');
    Route::post('/curriculum', [CurriculumController::class, 'getCoursesCurriculum'])->name('courses.curriculum.list');
    Route::get('/curriculum/{courseId}/{schoolYear}', [CurriculumController::class, 'CurriculumInfoView'])->name('curriculum.info.view');
    Route::post('/curriculum/{courseId}/{schoolYear}', [CurriculumController::class, 'getCurriculumInfo'])->name('curriculum.info');
    Route::post('/get-course-active-curriculum', [CurriculumController::class, 'getCourseActiveCurriculum']);
    Route::post('/set-curriculum-term-active', [CurriculumController::class, 'setCurriculumTermActive']);

    Route::post('/api/addSemester', [CurriculumController::class, 'addSemester'])->name('add.semester');

    Route::post('/api/get-own-department-rooms', [RoomController::class, 'getOwnDepartmentRooms'])->name('get.own.department.rooms');
    Route::post('/api/get-instructors', [InstructorsController::class, 'getInstructors'])->name('get.instructors');

    Route::post('/curriculum/schoolyear', [CurriculumController::class, 'addSchoolYear'])->name('curr.schoolyear');
    Route::post('/curriculum/subject', [CurriculumController::class, 'addSubject'])->name('curr.addsubject');
    Route::post('/curriculum/subject/edit/subject', [CurriculumController::class, 'editSubject'])->name('curr.editsubject');
    Route::post('/curriculum/unit-limits', [CurriculumController::class, 'setUnitLimits'])->name('curr.unit-limits');
    Route::get('/curriculum-export/{courseId}/{schoolYear}/{format}', [CurriculumController::class, 'exportCurriculum'])
        ->where('format', 'pdf|xlsx')
        ->name('curr.export');
    // Not under /curriculum/{courseId}/…: that would collide with /curriculum/{courseId}/{schoolYear}.
    Route::get('/curriculum-compare/{courseId}', [CurriculumController::class, 'compareView'])->name('curr.compare');
    Route::post('/curriculum-compare/{courseId}', [CurriculumController::class, 'compareData'])->name('curr.compare.data');
    // Three segments on purpose: two would be caught by POST /curriculum/{courseId}/{schoolYear} above.
    Route::post('/curriculum/subject/edit/prerequisites', [CurriculumController::class, 'setPrerequisites'])->name('curr.subject.prerequisites');
    // Same subjects: codes confirmed to be the same subject (not under /curriculum/, see above).
    Route::get('/curriculum-same-subjects', [SubjectGroupController::class, 'view'])->name('curr.subject-groups');
    Route::post('/curriculum-same-subjects', [SubjectGroupController::class, 'data'])->name('curr.subject-groups.data');
    Route::post('/curriculum-same-subjects/create', [SubjectGroupController::class, 'create'])->name('curr.subject-groups.create');
    Route::post('/curriculum-same-subjects/dismiss', [SubjectGroupController::class, 'dismiss'])->name('curr.subject-groups.dismiss');
    Route::post('/curriculum-same-subjects/restore', [SubjectGroupController::class, 'restore'])->name('curr.subject-groups.restore');
    Route::post('/curriculum-same-subjects/{group}/add', [SubjectGroupController::class, 'addMembers'])->whereNumber('group')->name('curr.subject-groups.add');
    Route::post('/curriculum-same-subjects/{group}/remove', [SubjectGroupController::class, 'removeMember'])->whereNumber('group')->name('curr.subject-groups.remove');
    Route::post('/curriculum-same-subjects/{group}/rename', [SubjectGroupController::class, 'rename'])->whereNumber('group')->name('curr.subject-groups.rename');
    Route::post('/curriculum-same-subjects/{group}/delete', [SubjectGroupController::class, 'destroy'])->whereNumber('group')->name('curr.subject-groups.delete');
    Route::post('/api/delete/curr-subject/{id}', [CurriculumController::class, 'deleteCurrSubject'])->name('delete.curr.subject');
});
