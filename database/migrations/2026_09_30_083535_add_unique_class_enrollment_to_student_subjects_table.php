<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicate = DB::table('student_subjects')
            ->select('enrolled_students_id', 'year_section_subjects_id')
            ->selectRaw('COUNT(*) AS total')
            ->groupBy('enrolled_students_id', 'year_section_subjects_id')
            ->havingRaw('COUNT(*) > 1')
            ->first();

        if ($duplicate) {
            throw new RuntimeException(
                "Enrollment {$duplicate->enrolled_students_id} has " .
                "{$duplicate->total} records for class " .
                "{$duplicate->year_section_subjects_id}. " .
                'Resolve the duplicates and their linked grades before migrating.'
            );
        }

        Schema::table('student_subjects', function (Blueprint $table) {
            $table->unique(
                ['enrolled_students_id', 'year_section_subjects_id'],
                'student_subject_enrollment_class_unique'
            );
        });
    }

    public function down(): void
    {
        // Schema::table('student_subjects', function (Blueprint $table) {
        //     $table->dropUnique('student_subject_enrollment_class_unique');
        // });
    }
};