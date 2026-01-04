<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GraduationRequirement extends Model
{
    use HasFactory;

    protected $table = 'graduation_requirements';

    protected $fillable = [
        'enrolled_student_id',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    // Relations
    public function enrolledStudent()
    {
        return $this->belongsTo(EnrolledStudent::class, 'enrolled_student_id');
    }

    public function studentApprovalSheets()
    {
        return $this->hasOne(StudentApprovalSheet::class, 'graduation_requirement_id');
    }

    public function studentMOAs()
    {
        return $this->hasOne(StudentMemorandumOfAgreement::class, 'graduation_requirement_id');
    }

    public function studentOjtCertificates()
    {
        return $this->hasOne(StudentOjtCertificate::class, 'graduation_requirement_id');
    }
}
