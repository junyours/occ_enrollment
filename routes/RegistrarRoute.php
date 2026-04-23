<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Registrar\FormNineController;

Route::middleware(['auth', 'maintenance', 'registrar'])->group(function () {
    Route::get('/form-9', [FormNineController::class, 'view'])->name('form-9');
    Route::get('/form-9/student/{id}', [FormNineController::class, 'studentGrades'])->name('form-9-student');
});
