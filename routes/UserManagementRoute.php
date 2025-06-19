<?php

use App\Http\Controllers\User\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'UserManagementPermission'])->group(function () {
    Route::get('/faculty-list', [UserController::class, 'viewFaculty'])->name('faculty-list');
    Route::get('/student-list', [UserController::class, 'viewStudent'])->name('student-list');
    Route::post('/api/get/faculty-list-department', [UserController::class, 'getFacultyListDepartment'])->name('get.faculty.list.department');
    Route::post('/api/get/faculty-list', [UserController::class, 'getFacultyList'])->name('get.faculty.list');

    Route::post('/api/student-info/{id}', [UserController::class, 'studentInfo'])->name('student-info');
    Route::post('/api/faculty-info/{id}', [UserController::class, 'facultyInfo'])->name('faculty-info');

    Route::post('/faculty/add', [UserController::class, 'addFaculty'])->name('faculty.add');
    Route::post('/faculty/edit', [UserController::class, 'editFaculty'])->name('faculty.edit');
});

Route::middleware(['auth', 'UserManagementPermission', 'program_head'])->group(function () {
    Route::patch('/api/set-faculty-active-status', [UserController::class, 'setFacultyActiveStatus'])->name('set.faculty.actice.status');
    Route::patch('/api/set-faculty-role', [UserController::class, 'setFacultyRole'])->name('set.faculty.role');
});

Route::middleware(['auth', 'registrar'])->group(function () {
    Route::post('/api/department-faculties/{id}', [UserController::class, 'departmentFaculties'])->name('department.faculties');
    Route::post('/api/assign-department-head/{deptID}/{facID}', [UserController::class, 'assignDeptHead'])->name('assign.department.head');
    Route::post('/api/students', [UserController::class, 'students'])->name('students');

    Route::post('/student/add', [UserController::class, 'addStudent'])->name('student.add');
    Route::post('/student/edit', [UserController::class, 'editStudent'])->name('student.edit');
});

Route::middleware(['auth', 'program_head'])->group(function () {
    Route::patch('/set-faculty-active-status', [UserController::class, 'updateActiveStatus']);
    Route::patch('/set-faculty-role', [UserController::class, 'updateRole']);
});
