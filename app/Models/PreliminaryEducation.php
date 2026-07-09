<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PreliminaryEducation extends Model
{
    use HasFactory;

    // The table associated with the model (optional if it follows naming conventions)
    protected $table = 'preliminary_educations';

    // Allow mass assignment for these fields
    protected $fillable = [
        'user_id',
        'elementary_name',
        'elementary_address',
        'elementary_year',
        'secondary_name',
        'secondary_address',
        'secondary_year',
    ];

    /**
     * Get the user that owns the education record.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}