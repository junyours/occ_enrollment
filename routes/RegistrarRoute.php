<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Registrar\FormNineController;
use App\Http\Controllers\Registrar\TorPhotoController;

Route::middleware(['auth', 'maintenance', 'role:registrar'])->group(function () {
    Route::get('/permanent-record', [FormNineController::class, 'view'])->name('permanent-record');
    Route::get('/permanent-record/student/{id}', [FormNineController::class, 'studentGrades'])->name('permanent-record-student');
    Route::get('/permanent-record/student/{id}/photo', [TorPhotoController::class, 'show'])->whereNumber('id')->name('permanent-record.photo.show');
    Route::post('/permanent-record/student/{id}/photo', [TorPhotoController::class, 'store'])->whereNumber('id')->name('permanent-record.photo.store');
    Route::delete('/permanent-record/student/{id}/photo', [TorPhotoController::class, 'destroy'])->whereNumber('id')->name('permanent-record.photo.destroy');
    Route::post('/permanent-record/add-record', [FormNineController::class, 'addRecord'])->name('permanent-record-add-record');

    // GET route to fetch the info
    Route::get('/permanent-record/get-student-info/{userId}/info', [FormNineController::class, 'getInfo'])->name('permanent-record.get-student-info');
    Route::post('/permanent-record/add-student-info/{userId}', [FormNineController::class, 'addInfo'])->name('permanent-record.add-student-info');

    Route::get('/permanent-record/student-added-records/{id}', [FormNineController::class, 'getAddedRecords'])->name('permanent-record.student-added-records');
    Route::patch('/permanent-record/student-update-record/{id}', [FormNineController::class, 'updateRecord'])->name('permanent-record.update-subject');
    Route::post('/permanent-subject/student-add-subject/{id}', [FormNineController::class, 'addSubject'])->name('permanent-subject.add-subject');
});

