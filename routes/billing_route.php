<?php

use App\Http\Controllers\Billing\DashboardController;
use App\Http\Controllers\Billing\ReportController;
use App\Http\Controllers\Billing\SchoolYearController;
use App\Http\Controllers\Billing\SemesterController;
use App\Http\Controllers\Billing\StudentBalanceController;
use App\Http\Controllers\Billing\TypeController;
use Illuminate\Support\Facades\Route;

// Web
Route::middleware(['auth', 'billing'])->group(function () {
  Route::get('/billing/dashboard', [DashboardController::class, 'dashboard'])->name('billing.dashboard');

  Route::get('/billing/student/balances', [StudentBalanceController::class, 'studentBalance'])->name('billing.student.balance');
  Route::get('/billing/add/student/balances', [StudentBalanceController::class, 'addStudentBalance'])->name('billing.add.student.balance');

  Route::get('/billing/school-years', [SchoolYearController::class, 'schoolYear'])->name('billing.school.year');

  Route::get('/billing/semesters', [SemesterController::class, 'semester'])->name('billing.semester');

  Route::get('/billing/types', [TypeController::class, 'type'])->name('billing.type');

  Route::get('/billing/transaction-history', [ReportController::class, 'transactionHistory'])->name('billing.transaction.history');
});

// Api's
Route::middleware(['auth', 'billing'])->group(function () {
  Route::get('/api/billing/get/students', [StudentBalanceController::class, 'getStudent']);
  Route::post('/api/billing/account/initialize', [StudentBalanceController::class, 'initializeAccount']);
  Route::post('/api/billing/items/auto-save', [StudentBalanceController::class, 'autoSaveItems']);
  Route::delete('/api/billing/items/{id}', [StudentBalanceController::class, 'removeBillingItem']);
  Route::get('/api/billing/student-balances', [StudentBalanceController::class, 'studentBalances']);
  Route::get('/api/billing/student-balances/{studentId}', [StudentBalanceController::class, 'studentBalanceDetails']);
  Route::post('/api/billing/pay-type', [StudentBalanceController::class, 'payType']);
  Route::post('/api/billing/pay-single', [StudentBalanceController::class, 'paySingle']);
  Route::post('/api/billing/pay-all', [StudentBalanceController::class, 'payAll']);

  Route::get('/api/billing/get/school-years', [SchoolYearController::class, 'getSchoolYear']);
  Route::post('/api/billing/add/school-years', [SchoolYearController::class, 'addSchoolYear']);
  Route::post('/api/billing/update/school-years/{id}', [SchoolYearController::class, 'updateSchoolYear']);

  Route::get('/api/billing/get/semesters', [SemesterController::class, 'getSemester']);
  Route::post('/api/billing/add/semesters', [SemesterController::class, 'addSemester']);
  Route::post('/api/billing/update/semesters/{id}', [SemesterController::class, 'updateSemester']);

  Route::get('/api/billing/get/types', [TypeController::class, 'getType']);
  Route::post('/api/billing/add/types', [TypeController::class, 'addType']);
  Route::post('/api/billing/update/types/{id}', [TypeController::class, 'updateType']);

  Route::get('/api/billing/get/transaction-history', [ReportController::class, 'getTransactionHistory']);
});