<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\BillingPayment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function transactionHistory()
    {
        return Inertia::render('billing/transaction-history');
    }

    public function getTransactionHistory(Request $request)
    {
        $search = $request->input('search');

        $payments = BillingPayment::query()
            ->with([
                'allocations.item.account.student.information'
            ])
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('or_number', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(50)
            ->through(function ($payment) {
                return [
                    'id' => $payment->id,
                    'or_number' => $payment->or_number,
                    'amount_paid' => $payment->total_amount,
                    'created_at' => $payment->created_at
                        ->format('F d, Y h:i A'),
                ];
            });

        return response()->json($payments);
    }
}
