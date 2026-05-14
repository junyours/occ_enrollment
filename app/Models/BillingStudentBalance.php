<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingStudentBalance extends Model
{
    protected $table = 'billing_student_balances';

    protected $fillable = [
        'student_id',
        'billing_school_year_id',
        'billing_semester_id',
        'billing_fee_type_id',
        'balance',
    ];
}
