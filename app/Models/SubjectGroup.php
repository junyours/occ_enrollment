<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Subject codes confirmed to be the same subject. See App\Services\SubjectGroups. */
class SubjectGroup extends Model
{
    protected $table = 'subject_groups';

    protected $fillable = [
        'name',
        'created_by',
        'updated_by',
    ];

    public function members()
    {
        return $this->hasMany(SubjectGroupMember::class, 'subject_group_id');
    }
}
