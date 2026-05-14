<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingFeeType extends Model
{
    protected $table = 'billing_fee_types';

    protected $fillable = [
        'fee_type',
    ];
}
