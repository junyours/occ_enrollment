<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\BillingAccount;
use App\Models\BillingItem;
use App\Models\BillingPayment;
use App\Models\BillingPaymentAllocation;
use App\Models\BillingPeriod;
use App\Models\User;
use DB;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentBalanceController extends Controller
{
    public function studentBalance()
    {
        return Inertia::render('billing/student-balance');
    }

    public function addStudentBalance()
    {
        return Inertia::render('billing/add-student-balance');
    }

    public function getStudent(Request $request)
    {
        $search = $request->search;

        $students = User::select(
            "users.id",
            "users.user_id_no",
            "user_information.first_name",
            "user_information.last_name",
            "user_information.middle_name"
        )
            ->where('users.user_role', 'student')
            ->join("user_information", "user_information.user_id", "=", "users.id")
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where("users.user_id_no", "like", "%{$search}%")
                        ->orWhere("user_information.first_name", "like", "%{$search}%")
                        ->orWhere("user_information.last_name", "like", "%{$search}%")
                        ->orWhere("user_information.middle_name", "like", "%{$search}%")
                        ->orWhereRaw(
                            "CONCAT(user_information.first_name, ' ', user_information.last_name) LIKE ?",
                            ["%{$search}%"]
                        )
                        ->orWhereRaw(
                            "CONCAT(user_information.first_name, ' ', user_information.middle_name, ' ', user_information.last_name) LIKE ?",
                            ["%{$search}%"]
                        );
                });
            })
            ->paginate(50);

        return response()->json($students);
    }

    public function initializeAccount(Request $request)
    {
        $period = BillingPeriod::firstOrCreate([
            'billing_school_year_id' => $request->school_year_id,
            'billing_semester_id' => $request->semester_id,
        ]);

        $account = BillingAccount::firstOrCreate(
            [
                'student_id' => $request->student_id,
                'billing_period_id' => $period->id,
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | LOAD ITEMS WITH PAYMENTS
        |--------------------------------------------------------------------------
        */

        $items = BillingItem::with([
            'allocations'
        ])
            ->where('billing_account_id', $account->id)
            ->get();

        /*
        |--------------------------------------------------------------------------
        | FORMAT ITEMS
        |--------------------------------------------------------------------------
        */

        $items->transform(function ($item) {

            $paid = $item->allocations->sum('amount');

            $remaining = max($item->balance - $paid, 0);

            $status =
                $remaining <= 0
                ? 'paid'
                : ($paid > 0 ? 'partial' : 'unpaid');

            return [
                'id' => $item->id,
                'billing_type_id' => $item->billing_type_id,
                'balance' => $item->balance,
                'paid' => $paid,
                'remaining' => $remaining,
                'status' => $status,

                /*
                |--------------------------------------------------------------------------
                | DISABLE EDIT WHEN PARTIAL OR PAID
                |--------------------------------------------------------------------------
                */

                'locked' => $paid > 0,
            ];
        });

        return response()->json([
            'account' => $account,
            'items' => $items,
        ]);
    }

    public function autoSaveItems(Request $request)
    {
        $request->validate([
            'billing_account_id' => 'required|exists:billing_accounts,id',
            'items' => 'required|array',
        ]);

        $savedIds = [];

        foreach ($request->items as $item) {

            if (
                empty($item['type_id']) &&
                empty($item['balance'])
            ) {
                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | UPDATE EXISTING ITEM
            |--------------------------------------------------------------------------
            */

            if (!empty($item['id'])) {

                $billingItem = BillingItem::with('allocations')
                    ->find($item['id']);

                if ($billingItem) {

                    /*
                    |--------------------------------------------------------------------------
                    | PREVENT EDIT IF WITH PAYMENT
                    |--------------------------------------------------------------------------
                    */

                    $paid = $billingItem->allocations->sum('amount');

                    if ($paid > 0) {

                        $savedIds[] = $billingItem->id;

                        continue;
                    }

                    $billingItem->update([
                        'billing_type_id' => $item['type_id'],
                        'balance' => $item['balance'],
                    ]);

                    $savedIds[] = $billingItem->id;
                }
            }

            /*
            |--------------------------------------------------------------------------
            | CREATE NEW ITEM
            |--------------------------------------------------------------------------
            */ else {

                $billingItem = BillingItem::create([
                    'billing_account_id' => $request->billing_account_id,
                    'billing_type_id' => $item['type_id'],
                    'balance' => $item['balance'],
                ]);

                $savedIds[] = $billingItem->id;
            }
        }

        $items = BillingItem::with('allocations')
            ->whereIn('id', $savedIds)
            ->get()
            ->map(function ($item) {

                $paid = $item->allocations->sum('amount');

                $remaining = max($item->balance - $paid, 0);

                return [
                    'id' => $item->id,
                    'billing_type_id' => $item->billing_type_id,
                    'balance' => $item->balance,
                    'paid' => $paid,
                    'remaining' => $remaining,
                    'status' =>
                        $remaining <= 0
                        ? 'paid'
                        : ($paid > 0 ? 'partial' : 'unpaid'),

                    'locked' => $paid > 0,
                ];
            });

        return response()->json([
            'success' => true,
            'items' => $items,
        ]);
    }

    public function removeBillingItem($id)
    {
        $item = BillingItem::with('allocations')
            ->findOrFail($id);

        /*
        |--------------------------------------------------------------------------
        | PREVENT DELETE IF WITH PAYMENT
        |--------------------------------------------------------------------------
        */

        $paid = $item->allocations->sum('amount');

        if ($paid > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete partially paid or paid item.',
            ], 422);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Billing item removed.',
        ]);
    }

    public function studentBalances(Request $request)
    {
        $search = $request->input('search');

        $students = User::query()
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->select(
                'users.id',
                'users.user_id_no',
                'user_information.first_name',
                'user_information.middle_name',
                'user_information.last_name'
            )
            ->where('users.user_role', 'student')
            ->when($search, function ($q) use ($search) {
                $q->where(function ($q) use ($search) {
                    $q->where('users.user_id_no', 'like', "%{$search}%")
                        ->orWhereRaw(
                            "CONCAT(user_information.first_name, ' ', user_information.last_name) LIKE ?",
                            ["%{$search}%"]
                        );
                });
            })
            ->whereHas('billingAccounts.items')
            ->with([
                'billingAccounts.items.allocations'
            ])
            ->paginate(10)
            ->through(function ($student) {

                $total = 0;
                $paid = 0;

                foreach ($student->billingAccounts as $account) {

                    foreach ($account->items as $item) {

                        $itemPaid = $item->allocations->sum('amount');

                        $remaining = max($item->balance - $itemPaid, 0);

                        $total += (float) $item->balance;
                        $paid += $itemPaid;

                        $item->paid = $itemPaid;
                        $item->remaining = $remaining;

                        $item->status =
                            $remaining <= 0
                            ? 'paid'
                            : ($itemPaid > 0 ? 'partial' : 'unpaid');
                    }
                }

                $studentRemaining = max($total - $paid, 0);

                $paymentStatus =
                    $studentRemaining <= 0
                    ? 'paid'
                    : ($paid > 0 ? 'partial' : 'unpaid');

                return [
                    'id' => $student->id,
                    'user_id_no' => $student->user_id_no,
                    'student_name' =>
                        $student->first_name . ' ' . $student->last_name,
                    'total_balance' => $total,
                    'total_paid' => $paid,
                    'remaining_balance' => $studentRemaining,
                    'payment_status' => $paymentStatus,
                ];
            });

        return response()->json($students);
    }

    public function studentBalanceDetails($studentId)
    {
        $student = User::join('user_information', 'users.id', '=', 'user_information.user_id')
            ->select(
                'users.id',
                'users.user_id_no',
                'user_information.first_name',
                'user_information.last_name'
            )
            ->where('users.id', $studentId)
            ->firstOrFail();

        $accounts = BillingAccount::where('student_id', $studentId)
            ->with([
                'period.schoolYear',
                'period.semester',
                'items.type',
                'items.allocations'
            ])
            ->get();

        $accounts->transform(function ($account) {

            foreach ($account->items as $item) {

                $paid = $item->allocations->sum('amount');

                $remaining = max($item->balance - $paid, 0);

                $item->paid = $paid;
                $item->remaining = $remaining;

                $item->status =
                    $remaining <= 0
                    ? 'paid'
                    : ($paid > 0 ? 'partial' : 'unpaid');
            }

            return $account;
        });

        $groupedSchoolYears = $accounts
            ->groupBy(function ($account) {
                return $account->period->schoolYear->id;
            })
            ->map(function ($schoolYearAccounts) {

                $firstAccount = $schoolYearAccounts->first();

                return [
                    'school_year_id' =>
                        $firstAccount->period->schoolYear->id,

                    'school_year_name' =>
                        $firstAccount->period->schoolYear->school_year_name,

                    'semesters' => $schoolYearAccounts->map(function ($account) {

                        return [
                            'account_id' => $account->id,

                            'semester_name' =>
                                $account->period->semester->semester_name,

                            'items' => $account->items->values(),
                        ];
                    })->values(),
                ];
            })
            ->values();

        return response()->json([
            'student' => [
                'id' => $student->id,
                'user_id_no' => $student->user_id_no,
                'student_name' =>
                    $student->first_name . ' ' . $student->last_name,
            ],

            'school_years' => $groupedSchoolYears,
        ]);
    }

    public function payType(Request $request)
    {
        $request->validate([
            'billing_item_id' => 'required|exists:billing_items,id',
            'amount' => 'required|numeric|min:1',
            'or_number' => 'required|unique:billing_payments,or_number',
        ]);

        return DB::transaction(function () use ($request) {

            $item = BillingItem::with('allocations')
                ->findOrFail($request->billing_item_id);

            $paid = $item->allocations->sum('amount');

            $remaining = $item->balance - $paid;

            if ($remaining <= 0) {
                return response()->json([
                    'message' => 'Already fully paid'
                ], 400);
            }

            $payAmount = min($remaining, $request->amount);

            $payment = BillingPayment::create([
                'or_number' => $request->or_number,
                'total_amount' => $payAmount,
            ]);

            BillingPaymentAllocation::create([
                'billing_payment_id' => $payment->id,
                'billing_account_id' => $item->billing_account_id,
                'billing_item_id' => $item->id,
                'amount' => $payAmount,
            ]);

            return response()->json([
                'message' => 'Payment successful',
                'paid' => $payAmount,
                'remaining' => $remaining - $payAmount,
            ]);
        });
    }

    public function paySingle(Request $request)
    {
        $request->validate([
            'billing_account_id' => 'required|exists:billing_accounts,id',
            'amount' => 'required|numeric|min:1',
            'or_number' => 'required|unique:billing_payments,or_number',
        ]);

        return DB::transaction(function () use ($request) {

            $account = BillingAccount::with('items.allocations')
                ->findOrFail($request->billing_account_id);

            $payment = BillingPayment::create([
                'or_number' => $request->or_number,
                'total_amount' => $request->amount,
            ]);

            $remaining = (float) $request->amount;

            foreach ($account->items as $item) {

                if ($remaining <= 0)
                    break;

                $paid = $item->allocations->sum('amount');

                $balance = $item->balance - $paid;

                if ($balance <= 0)
                    continue;

                $pay = min($balance, $remaining);

                BillingPaymentAllocation::create([
                    'billing_payment_id' => $payment->id,
                    'billing_account_id' => $account->id,
                    'billing_item_id' => $item->id,
                    'amount' => $pay,
                ]);

                $remaining -= $pay;
            }

            return response()->json([
                'message' => 'Payment successful',
            ]);
        });
    }

    public function payAll(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:users,id',
            'or_number' => 'required|unique:billing_payments,or_number',
        ]);

        return DB::transaction(function () use ($request) {

            $items = BillingItem::whereHas('account', function ($q) use ($request) {
                $q->where('student_id', $request->student_id);
            })
                ->with('allocations')
                ->get();

            $payment = BillingPayment::create([
                'or_number' => $request->or_number,
                'total_amount' => 0,
            ]);

            $total = 0;

            foreach ($items as $item) {

                $paid = $item->allocations->sum('amount');

                $remaining = $item->balance - $paid;

                if ($remaining <= 0)
                    continue;

                $total += $remaining;

                BillingPaymentAllocation::create([
                    'billing_payment_id' => $payment->id,
                    'billing_account_id' => $item->billing_account_id,
                    'billing_item_id' => $item->id,
                    'amount' => $remaining,
                ]);
            }

            $payment->update([
                'total_amount' => $total,
            ]);

            return response()->json([
                'message' => 'Full payment completed',
                'total_paid' => $total,
            ]);
        });
    }
}