<?php

use App\Http\Controllers\Department\DepartmentController;
use App\Http\Controllers\Room\RoomController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'registrar'])->group(function () {
    Route::get('/rooms', [RoomController::class, 'view'])->name('rooms');
});
