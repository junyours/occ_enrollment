<?php

use App\Http\Controllers\Curriculum\CurriculumController;
use App\Http\Controllers\Enrollment\ClassScheduling\EnrollmentClassSchedulingController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Enrollment\EnrollmentCourseSectionController;
use App\Http\Controllers\Enrollment\EnrollmentDashboardController;
use App\Http\Controllers\Instructors\InstructorsController;
use App\Http\Controllers\Room\RoomController;

Route::middleware(['auth', 'maintenance', 'program_head'])->group(function () {
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
});
