<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MemorandumOfAgreement extends Model
{
    use HasFactory;

    protected $table = 'memorandum_of_agreements';

    protected $fillable = [
        'file_name',
        'google_id',
        'uploaded_at',
        'uploader_id',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
    ];


    protected $hidden = [
        'created_at',
        'updated_at'
    ];
    
    // Relations
    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }

    public function studentMOAs()
    {
        return $this->hasMany(StudentMemorandumOfAgreement::class, 'memorandum_of_agreement_id');
    }
}
