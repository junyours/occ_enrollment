<?php

use App\Http\Controllers\Curriculum\CurriculumController;
use App\Http\Controllers\Enrollment\ClassScheduling\EnrollmentClassSchedulingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Enrollment\EnrollmentCourseSectionController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\Maintenance\MaintenanceController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index']);

Route::middleware(['auth', 'maintenance', 'EnrollmentPrepOngoing', 'program_head'])->group(function () {
    Route::post('api/add/new/section/{schoolYearId}', [EnrollmentCourseSectionController::class, 'addNewSection'])->name('add.new.section');

    Route::get('/enrollment/{id}/class/{yearlevel}', [EnrollmentCourseSectionController::class, 'viewClass'])->name('enrollment.view.class');
    Route::post('/api/enrollment/update-main-class', [EnrollmentClassSchedulingController::class, 'enrollmentUpdateMainClass'])->name('enrollment.update.main.class');
    Route::post('/api/enrollment/update-second-class', [EnrollmentClassSchedulingController::class, 'enrollmentUpdateSecondClass'])->name('enrollment.update.second.class');

    Route::get('/rooms-schedules', [EnrollmentClassSchedulingController::class, 'viewRoomSchedules'])->name('enrollment.room-schedules');

    Route::get('/faculties-schedules', [EnrollmentClassSchedulingController::class, 'viewFacultySchedules'])->name('enrollment.faculties-schedules');

    Route::get('/subjects-schedules', [EnrollmentClassSchedulingController::class, 'viewSubjectSchedules'])->name('enrollment.subjects-schedules');
});

Route::middleware(['auth', 'maintenance', 'EnrollmentPrepOngoing'])->group(function () {
    Route::post('/api/enrollment/get-classes', [EnrollmentClassSchedulingController::class, 'enrollmentGetClasses'])->name('enrollment.get.classes');
});

Route::post('/api/delete/curr-subject/{id}', [CurriculumController::class, 'deleteCurrSubject'])->name('delete.curr.subject');


require __DIR__ . '/auth.php';
require __DIR__ . '/ClassesRoute.php';
require __DIR__ . '/ClassSchedulingRoute.php';
require __DIR__ . '/DepartmentRoute.php';
require __DIR__ . '/EnrollmentRoute.php';
require __DIR__ . '/MaintenanceRoute.php';
require __DIR__ . '/PresidentRoute.php';
require __DIR__ . '/ProfileRoute.php';
require __DIR__ . '/ProgramHeadRoute.php';
require __DIR__ . '/RegistrarRoute.php';
require __DIR__ . '/SchoolyearManagementRoute.php';
require __DIR__ . '/SchoolYearRoute.php';
require __DIR__ . '/SuperAdminRoute.php';
require __DIR__ . '/UserManagementRoute.php';
require __DIR__ . '/RoomsRoute.php';
require __DIR__ . '/CorRoute.php';
