<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ApprovalSheet extends Model
{
    use HasFactory;

    protected $table = 'approval_sheets';

    protected $fillable = [
        'title',
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

    public function studentApprovalSheets()
    {
        return $this->hasMany(StudentApprovalSheet::class, 'approval_sheet_id');
    }
}
