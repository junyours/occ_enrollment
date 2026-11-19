<?php

use App\Http\Controllers\SeenItemController;
use Illuminate\Support\Facades\Route;

// Guides and "New" labels the signed-in user has seen (see SeenItemController).
Route::middleware(['auth', 'throttle:60,1'])
    ->post('seen-items', [SeenItemController::class, 'store'])
    ->name('seen-items.store');
