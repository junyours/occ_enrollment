<?php

use App\Http\Controllers\Department\DepartmentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'maintenance', 'registrar'])->group(function () {
    Route::get('/department', [DepartmentController::class, 'view'])->name('department');

    Route::post('/department/course', [DepartmentController::class, 'list'])->name('department.course');

    Route::post('/department/add-program', [DepartmentController::class, 'addProgram'])->name('department.add.program');
    Route::post('/department/add-department', [DepartmentController::class, 'addDepartment'])->name('department.add.department');
});

Route::middleware(['auth'])->group(function () {
    Route::post('/api/departments', [DepartmentController::class, 'getDepartments'])->name('departments');
});
