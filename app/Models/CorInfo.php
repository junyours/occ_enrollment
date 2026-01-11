<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CorInfo extends Model
{
    protected $table = 'cor_info';

    protected $fillable = [
        'enrolled_student_id',
        'printed',
        'printed_at',
    ];
}
