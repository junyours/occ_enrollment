<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingPayment extends Model
{
    protected $fillable = [
        'or_number',
        'total_amount',
    ];

    public function allocations()
    {
        return $this->hasMany(BillingPaymentAllocation::class);
    }

    public function items()
    {
        return $this->belongsToMany(
            BillingItem::class,
            'billing_payment_allocations',
            'billing_payment_id',
            'billing_item_id'
        )->withPivot('amount');
    }
}
