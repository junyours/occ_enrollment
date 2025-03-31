<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Faculty extends Model
{
    use HasFactory;

    protected $table = 'faculty';
    protected $fillable = [
        'faculty_id',
        'department_id',
        'active',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function User()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    public function Department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function Schedules()
    {
        return $this->hasMany(YearSectionSubjects::class, 'room_id');
    }
    
}
