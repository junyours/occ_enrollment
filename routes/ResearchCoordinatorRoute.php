<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Guidance\GuidanceController;

Route::middleware(['auth', 'ResearchCoordinator'])->group(function () {
    
});
