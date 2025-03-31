<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FacultyRole extends Model
{
    use HasFactory;

    protected $table = 'faculty_role';
    protected $fillable = [
        'faculty_id_no',
        'department_id',
        'faculty_role',
    ];
    
    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
