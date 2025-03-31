<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentPreEnollmentListSubject extends Model
{
    use HasFactory;

    protected $table = 'student_pre_enrollment_list_subjects';
    protected $fillable = [
        'pre_enrollment_id',
        'subject_id',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
