<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Registrar\FormNineController;

Route::middleware(['auth', 'maintenance', 'registrar'])->group(function () {
    Route::get('/permanent-record', [FormNineController::class, 'view'])->name('permanent-record');
    Route::get('/permanent-record/student/{id}', [FormNineController::class, 'studentGrades'])->name('permanent-record-student');
});
