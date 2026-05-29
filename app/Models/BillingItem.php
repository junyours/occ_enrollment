<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingItem extends Model
{
    protected $fillable = [
        'billing_account_id',
        'billing_type_id',
        'balance',
    ];

    public function account()
    {
        return $this->belongsTo(BillingAccount::class, 'billing_account_id');
    }

    public function type()
    {
        return $this->belongsTo(BillingType::class, 'billing_type_id');
    }

    public function allocations()
    {
        return $this->hasMany(BillingPaymentAllocation::class);
    }

    public function payments()
    {
        return $this->belongsToMany(
            BillingPayment::class,
            'billing_payment_allocations',
            'billing_item_id',
            'billing_payment_id'
        )->withPivot('amount');
    }
}