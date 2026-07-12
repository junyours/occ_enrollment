<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Registrar\FormNineController;

Route::middleware(['auth', 'maintenance', 'role:registrar'])->group(function () {
    Route::get('/permanent-record', [FormNineController::class, 'view'])->name('permanent-record');
    Route::get('/permanent-record/student/{id}', [FormNineController::class, 'studentGrades'])->name('permanent-record-student');
    Route::post('/permanent-record/add-record', [FormNineController::class, 'addRecord'])->name('permanent-record-add-record');

    // GET route to fetch the info
    Route::get('/permanent-record/get-student-info/{userId}/info', [FormNineController::class, 'getInfo'])->name('permanent-record.get-student-info');
    Route::post('/permanent-record/add-student-info/{userId}', [FormNineController::class, 'addInfo'])->name('permanent-record.add-student-info');

    Route::get('/permanent-record/student-added-records/{id}', [FormNineController::class, 'getAddedRecords'])->name('permanent-record.student-added-records');
    Route::patch('/permanent-record/student-added-records/{id}', [FormNineController::class, 'getAddedRecords'])->name('permanent-record.student-added-records');
});
