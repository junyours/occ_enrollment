<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingPaymentAllocation extends Model
{
    protected $fillable = [
        'billing_payment_id',
        'billing_item_id',
        'amount',
    ];

    public function payment()
    {
        return $this->belongsTo(BillingPayment::class, 'billing_payment_id');
    }

    public function item()
    {
        return $this->belongsTo(BillingItem::class, 'billing_item_id');
    }
}
