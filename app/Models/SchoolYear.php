<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    use HasFactory;

    // Grading periods whose grade upload opens and closes on dates.
    public const GRADE_PERIODS = ['midterm', 'final'];

    protected $table = 'school_years';
    protected $fillable = [
        'semester_id',
        'start_year',
        'end_year',
        'start_date',
        'end_date',
        'is_current',
        'allow_enrollment',
        'allowed_enrollment_roles',
        'evaluating',
        'midterm_upload_opens_at',
        'midterm_upload_closes_at',
        'final_upload_opens_at',
        'final_upload_closes_at',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'midterm_upload_opens_at' => 'datetime',
        'midterm_upload_closes_at' => 'datetime',
        'final_upload_opens_at' => 'datetime',
        'final_upload_closes_at' => 'datetime',
    ];

    public function Semester()
    {
        return $this->belongsTo(Semester::class, 'semester_id');
    }

    public function YearSection()
    {
        return $this->hasMany(YearSection::class, 'school_year_id');
    }

    public function evaluations()
    {
        return $this->hasMany(Evaluation::class);
    }

    /**
     * Where a period's grade upload stands: not_set (no opening time yet),
     * scheduled, open, or closed. Open has no end when no closing time is set.
     */
    public function gradeUploadStatus(string $period, ?CarbonInterface $now = null): string
    {
        $now ??= now();
        $opens = $this->getAttribute("{$period}_upload_opens_at");
        $closes = $this->getAttribute("{$period}_upload_closes_at");

        return match (true) {
            $opens === null => 'not_set',
            $now->lt($opens) => 'scheduled',
            $closes !== null && $now->gte($closes) => 'closed',
            default => 'open',
        };
    }

    /** Each period's status and times (ISO 8601, school time zone). */
    public function gradeUploadWindows(?CarbonInterface $now = null): array
    {
        $windows = [];

        foreach (self::GRADE_PERIODS as $period) {
            $windows[$period] = [
                'status' => $this->gradeUploadStatus($period, $now),
                'opens_at' => $this->getAttribute("{$period}_upload_opens_at")?->toIso8601String(),
                'closes_at' => $this->getAttribute("{$period}_upload_closes_at")?->toIso8601String(),
            ];
        }

        return $windows;
    }
}
