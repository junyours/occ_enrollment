<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingPayment extends Model
{
    protected $table = 'billing_payments';

    protected $fillable = [
        'billing_student_balance_id',
        'reference_number',
        'amount',
    ];
}
