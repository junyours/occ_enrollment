<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingType extends Model
{
    protected $fillable = [
        'type_name'
    ];

    public function items()
    {
        return $this->hasMany(BillingItem::class);
    }
}
