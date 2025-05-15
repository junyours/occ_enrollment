<?php

use App\Http\Controllers\Department\DepartmentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'registrar'])->group(function () {
    Route::get('/department', [DepartmentController::class, 'view'])->name('department');
});
