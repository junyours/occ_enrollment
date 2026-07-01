<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Registrar\FormNineController;

Route::middleware(['auth', 'maintenance', 'role:registrar'])->group(function () {
    Route::get('/permanent-record', [FormNineController::class, 'view'])->name('permanent-record');
    Route::get('/permanent-record/student/{id}', [FormNineController::class, 'studentGrades'])->name('permanent-record-student');
    Route::post('/permanent-record/add-record', [FormNineController::class, 'addRecord'])->name('permanent-record-add-record');
});
