<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StudentMemorandumOfAgreement extends Model
{
    use HasFactory;

    protected $table = 'student_memorandum_of_agreements';

    protected $fillable = [
        'memorandum_of_agreement_id',
        'graduation_requirement_id',
        'librarian_confirmed_id',
        'research_coordinator_confirmed_id',
        'ojt_coordinator_confirmed_id',
        'program_head_confirmed_id',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
    
    // Relations
    public function memorandumOfAgreement()
    {
        return $this->belongsTo(MemorandumOfAgreement::class, 'memorandum_of_agreement_id');
    }

    public function graduationRequirement()
    {
        return $this->belongsTo(GraduationRequirement::class, 'graduation_requirement_id');
    }

    public function librarianConfirmed()
    {
        return $this->belongsTo(User::class, 'librarian_confirmed_id');
    }

    public function researchCoordinatorConfirmed()
    {
        return $this->belongsTo(User::class, 'research_coordinator_confirmed_id');
    }

    public function ojtCoordinatorConfirmed()
    {
        return $this->belongsTo(User::class, 'ojt_coordinator_confirmed_id');
    }

    public function programHeadConfirmed()
    {
        return $this->belongsTo(User::class, 'program_head_confirmed_id');
    }
}
