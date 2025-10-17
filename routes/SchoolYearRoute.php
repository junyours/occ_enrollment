<?php

use App\Http\Controllers\SchoolYear\SchoolYearController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'registrar'])->group(function () {
    Route::get('/school-year', [SchoolYearController::class, 'view'])->name('school-year');

    Route::post('/api/school-year', [SchoolYearController::class, 'addSchoolYear'])->name('add.school-year');
    Route::patch('/api/school-year/{id}', [SchoolYearController::class, 'editSchoolYear'])->name('edit.school-year');
    Route::post('/enrollment-record/{schoolYearId}', [SchoolYearController::class, 'recordStudentList'])->name('enrollment-record.students');
    Route::post('/promotional-report/{schoolYearId}', [SchoolYearController::class, 'promotionalReportStudentList'])->name('promotional-report.students');

    Route::get('/subjects-report', [SchoolYearController::class, 'subjectsReport'])->name('subjects-report');
    Route::get('/faculties-report', [SchoolYearController::class, 'facultiesReport'])->name('faculties-report');
    Route::post('/faculties-subjects/{schoolYearId}', [SchoolYearController::class, 'getFacultiesSubjects'])->name('faculties-subjects');

    Route::get('/download/faculties-subjects/{schoolYearId}', [SchoolYearController::class, 'downloadFacultiesSubjects'])->name('subjects.faculties-download');
    Route::get('/download/enrollment-record/{schoolYearId}', [SchoolYearController::class, 'downloadStudentsSubjects'])->name('subjects.students-download');
    Route::get('/download/promotional-report/{schoolYearId}', [SchoolYearController::class, 'downloadStudentsSubjectsGrades'])->name('subjects.grades.students-download');

    Route::post('/enrollment-record/get-student-subjects/{schoolYearId}/{studentId}', [SchoolYearController::class, 'getStudentSubjects'])->name('enrollment-record.student.subjects');
    Route::post('/enrollment-record/get-student-subjects-grades/{schoolYearId}/{studentId}', [SchoolYearController::class, 'getStudentSubjectsGrades'])->name('enrollment-record.student.subjects.grades');

    Route::patch('/school-year/is_current/{schoolYearId}', [SchoolYearController::class, 'updateIsCurrent']);
    Route::patch('/school-year/allow_enrollment/{schoolYearId}', [SchoolYearController::class, 'updateAllowEnrollment']);
    Route::patch('/school-year/evaluating/{schoolYearId}', [SchoolYearController::class, 'updateEvaluating']);
    Route::patch('/school-year/allow_upload_midterm/{schoolYearId}', [SchoolYearController::class, 'updateAllowUploadMidterm']);
    Route::patch('/school-year/allow_upload_final/{schoolYearId}', [SchoolYearController::class, 'updateAllowUploadFinal']);
});

Route::middleware(['auth', 'maintenance', 'SchoolYearPermission'])->group(function () {
    Route::get('/school-year', [SchoolYearController::class, 'view'])->name('school-year');
    Route::post('/school-year/{id}', [SchoolYearController::class, 'getSchoolYear'])->name('get.school-year');
    Route::post('/api/school-year/list', [SchoolYearController::class, 'schoolYears'])->name('school-year.list');

    Route::get('/school-year/{schoolyear}/{semester}', [SchoolYearController::class, 'viewSchoolYear'])->name('school-year.view');

    Route::get('/school-year/{schoolyear}/{semester}/rooms-schedules', [SchoolYearController::class, 'roomsSchedules'])->name('school-year.rooms-schedules.view');
    Route::get('/school-year/{schoolyear}/{semester}/faculties-schedules', [SchoolYearController::class, 'facultiesSchedules'])->name('school-year.faculties-schedules.view');
    Route::get('/school-year/{schoolyear}/{semester}/subjects-schedules', [SchoolYearController::class, 'subjectsSchedules'])->name('school-year.subjects-schedules.view');
    Route::get('/school-year/{schoolyear}/{semester}/subjects-list', [SchoolYearController::class, 'subjectsList'])->name('school-year.subjects-list.view');

    Route::get('/school-year/{schoolyear}/{semester}/{courseId}', [SchoolYearController::class, 'viewCourse'])->name('school-year.course.view');

    Route::get('/school-year/{schoolyear}/{semester}/{hashedCourseId}/class/{yearlevel}', [SchoolYearController::class, 'viewClass'])->name('school-year.view.class');
    Route::get('/school-year/{schoolyear}/{semester}/{hashedCourseId}/students/{yearlevel}', [SchoolYearController::class, 'viewStudents'])->name('school-year.view.students');
    Route::get('/school-year/{schoolyear}/{semester}/{hashedCourseId}/students/{yearlevel}/subjects', [SchoolYearController::class, 'viewStudentSubjects'])->name('school-year.view.student.subjects');
    Route::get('/school-year/{schoolyear}/{semester}/{hashedCourseId}/students/{yearlevel}/cor', [SchoolYearController::class, 'viewStudentCor'])->name('school-year.view.student.cor');

    Route::get('/promotional-report', [SchoolYearController::class, 'promotionalReport'])->name('promotional-report');
});

Route::middleware(['auth', 'maintenance'])->group(function () {
    Route::get('/enrollment-record', [SchoolYearController::class, 'enrollmentRecordView'])->name('enrollment-record');
});

Route::post('/enrollment-data', [SchoolYearController::class, 'enrollmentData'])->name('enrollment-data');
