<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingReceipt extends Model
{
    protected $table = 'billing_receipts';

    protected $fillable = [
        'billing_payment_id',
        'or_number',
    ];
}
