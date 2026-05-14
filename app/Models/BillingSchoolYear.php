<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingSchoolYear extends Model
{
    protected $table = 'billing_school_years';

    protected $fillable = [
        'school_year',
    ];
}
