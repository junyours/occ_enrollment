<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StudentOjtCertificate extends Model
{
    use HasFactory;

    protected $table = 'student_ojt_certificates';

    protected $fillable = [
        'graduation_requirement_id',
        'file_name',
        'google_id',
        'uploaded_at',
        'uploader_id',
        'research_coordinator_confirmed_id',
        'program_head_confirmed_id',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    // Relations
    public function graduationRequirement()
    {
        return $this->belongsTo(GraduationRequirement::class, 'graduation_requirement_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }

    public function researchCoordinatorConfirmed()
    {
        return $this->belongsTo(User::class, 'research_coordinator_confirmed_id');
    }

    public function programHeadConfirmed()
    {
        return $this->belongsTo(User::class, 'program_head_confirmed_id');
    }
}
