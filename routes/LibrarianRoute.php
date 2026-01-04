<?php

use App\Http\Controllers\Librarian\ApprovalSheetController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'Librarian'])->group(function () {
    Route::get('approval-sheets', [ApprovalSheetController::class, 'list'])->name('approval-sheets');
    Route::post('approval-sheets', [ApprovalSheetController::class, 'searchList'])->name('approval-sheets.list');

    Route::get('approval-sheets/upload', [ApprovalSheetController::class, 'upload'])->name('approval-sheets.upload');
    Route::post('approval-sheets/upload', [ApprovalSheetController::class, 'uploadPdf'])->name('approval-sheets.upload');

    Route::post('search-enrolled-students', [ApprovalSheetController::class, 'searchEnrolledStudents'])->name('search-enrolled-students');

    Route::post('approval-sheets/store', [ApprovalSheetController::class, 'storeApprovalSheet'])->name('approval-sheets.store');
});
