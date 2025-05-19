<?php

use App\Http\Controllers\SchoolYear\SchoolYearController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'registrar'])->group(function () {
    Route::get('/school-year', [SchoolYearController::class, 'view'])->name('school-year');

    Route::post('/api/school-year/list', [SchoolYearController::class, 'schoolYears'])->name('school-year.list');

    Route::post('/api/school-year', [SchoolYearController::class, 'addSchoolYear'])->name('add.school-year');
    Route::patch('/api/school-year/{id}', [SchoolYearController::class, 'editSchoolYear'])->name('edit.school-year');
});
