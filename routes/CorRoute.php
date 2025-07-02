<?php

use App\Http\Controllers\CorController;
use Illuminate\Support\Facades\Route;

Route::get('/api/signature/registrar', [CorController::class, 'registrarSignature'])->name('registrar.signature');
Route::get('/api/signature/billing-assessment', [CorController::class, 'billingAssessmentSignature'])->name('biling-assessment.signature');
