<?php

use App\Http\Controllers\Billing\BillingController;
use Illuminate\Support\Facades\Route;

// Web
Route::middleware(['auth', 'billing'])->group(function () {
  Route::get('/billing/dashboard', [BillingController::class, 'dashboard'])->name('billing.dashboard');

  Route::get('/billing/student-balances', [BillingController::class, 'studentBalance'])->name('billing.student-balances');
  Route::get('/billing/student-balances/add', [BillingController::class, 'addStudentBalance'])->name('billing.student-balances.add');

  Route::get('/billing/school-year', [BillingController::class, 'schoolYear'])->name('billing.school-year');
  Route::get('/billing/semester', [BillingController::class, 'semester'])->name('billing.semester');
});

// Api's
Route::middleware(['auth', 'billing'])->group(function () {
  Route::get('/api/billing/get-student', [BillingController::class, 'getStudent']);

  Route::get('/api/billing/get-school-year', [BillingController::class, 'getSchoolYear']);
  Route::post('/api/billing/add/school-year', [BillingController::class, 'addSchoolYear']);
  Route::post('/api/billing/update/school-year', [BillingController::class, 'updateSchoolYear']);

  Route::get('/api/billing/get-semester', [BillingController::class, 'getSemester']);
  Route::post('/api/billing/add/semester', [BillingController::class, 'addSemester']);
  Route::post('/api/billing/update/semester', [BillingController::class, 'updateSemester']);
});