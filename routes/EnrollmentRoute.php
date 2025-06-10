<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Enrollment\EnrollmentCourseSectionController;
use App\Http\Controllers\Enrollment\EnrollmentDashboardController;

Route::middleware(['auth', 'EnrollmentPrepOngoing', 'EnrollmentPermission'])->group(function () {
    Route::get('/dashboard', [EnrollmentDashboardController::class, 'view'])->name('dashboard');

    Route::get('/enrollment/{id}', [EnrollmentCourseSectionController::class, 'view'])->name('enrollment.view');
    Route::post('/enrollment/{id}', [EnrollmentCourseSectionController::class, 'getEnrollmentCourseSections'])->name('get.enrollment.course.section');

    Route::get('/enrollment/{id}/class/{yearlevel}', [EnrollmentCourseSectionController::class, 'viewClass'])->name('enrollment.view.class');

    Route::get('/enrollment/{id}/students/{yearlevel}', [EnrollmentCourseSectionController::class, 'viewStudents'])->name('enrollment.view.students');
    Route::get('/enrollment/{id}/students/{yearlevel}/subjects', [EnrollmentCourseSectionController::class, 'viewStudentSubjects'])->name('enrollment.view.student.subjects');
    Route::get('/enrollment/{id}/students/{yearlevel}/cor', [EnrollmentCourseSectionController::class, 'viewStudentCor'])->name('enrollment.view.student.cor');
    Route::post('/enrollment/student-info/cor/{courseId}/{section}/{yearlevel}/{studentIdNo}', [EnrollmentCourseSectionController::class, 'getStudentEnrollmentInfo'])->name('enrollment.student.info.cor');

    Route::get('/enrollment/{id}/enroll-student/{yearlevel}', [EnrollmentCourseSectionController::class, 'viewEnrollStudent'])->name('enrollment.view.enroll-student');
    Route::post('/enrollment/{id}/enroll-student/{yearlevel}', [EnrollmentCourseSectionController::class, 'getEnrolledStudentList'])->name('get.enrolled.student.list');
    Route::post('/enrollment/enroll-student/{studID}/{yearSectionId}/{typeID}/{startDate}', [EnrollmentCourseSectionController::class, 'enrollStudent'])->name('enroll-student');

    Route::post('/api/get-enrollment-dashboard-data', [EnrollmentDashboardController::class, 'getEnrollmentDashboardData'])->name('get.enrollment.dashboard.data');

    Route::post('/api/enrollment/get-student-subjects', [EnrollmentCourseSectionController::class, 'getStudentSubjects'])->name('get.student.subjects');
    Route::post('/api/enrollment/add/subject/{schoolYearId}/{studentId}/{classId}', [EnrollmentCourseSectionController::class, 'addSubject'])->name('enrollment.add.subject');
    Route::delete('/api/enrollment/delete/subject/{studentSubjectId}', [EnrollmentCourseSectionController::class, 'deleteSubject'])->name('enrollment.delete.subject');
    Route::post('/api/enrollment/student-info/{schoolYearId}/{studentID}', [EnrollmentCourseSectionController::class, 'studentInfo'])->name('enrollment.student.info');

    Route::post('/api/subjects-classes', [EnrollmentCourseSectionController::class, 'subjectClasses'])->name('subject.classes');
});
