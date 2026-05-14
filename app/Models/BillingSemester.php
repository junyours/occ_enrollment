<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingSemester extends Model
{
    protected $table = 'billing_semesters';

    protected $fillable = [
        'semester',
    ];
}
