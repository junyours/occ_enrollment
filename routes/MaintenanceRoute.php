<?php

use App\Http\Controllers\Maintenance\MaintenanceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'can-manage-maintenance'])->group(function () {
    Route::get('/maintenance-settings', [MaintenanceController::class, 'edit'])->name('maintenance-settings');
    Route::patch('/maintenance', [MaintenanceController::class, 'updateMode'])->name('maintenance');
    Route::patch('/maintenance/roles', [MaintenanceController::class, 'updateRoles'])->name('maintenance.roles');
});


Route::middleware(['auth'])->group(function () {
    Route::get('/maintenance', [MaintenanceController::class, 'maintenance'])->name('maintenance-settings');
});
