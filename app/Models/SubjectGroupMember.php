<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubjectGroupMember extends Model
{
    protected $table = 'subject_group_members';

    protected $fillable = [
        'subject_group_id',
        'subject_id',
        'added_by',
    ];

    public function group()
    {
        return $this->belongsTo(SubjectGroup::class, 'subject_group_id');
    }
}
