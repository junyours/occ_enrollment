<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentType extends Model
{
    use HasFactory;

    protected $table = 'student_type';
    protected $fillable = [
        'student_type_name',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
