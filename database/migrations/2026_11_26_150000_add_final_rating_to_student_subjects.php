<?php

use App\Services\FinalRating;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The final rating each student got, saved when the class's final grades are
 * deployed (App\Services\FinalRating), so records show the released rating
 * instead of working it out again each time. Fills it in for classes already
 * deployed.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('student_subjects', 'final_rating')) {
            Schema::table('student_subjects', function (Blueprint $table) {
                $table->decimal('final_rating', 3, 1)->nullable()->after('final_grade');
            });
        }

        $deployed = DB::table('grade_submissions')
            ->where('final_status', 'deployed')
            ->pluck('year_section_subjects_id');

        foreach ($deployed->chunk(200) as $classes) {
            DB::table('student_subjects')
                ->whereIn('year_section_subjects_id', $classes->all())
                ->where(fn($q) => $q->whereNotNull('midterm_grade')->orWhereNotNull('final_grade'))
                ->orderBy('id')
                ->select('id', 'midterm_grade', 'final_grade')
                ->chunk(500, function ($rows) {
                    foreach ($rows as $row) {
                        $rating = FinalRating::compute($row->midterm_grade, $row->final_grade);
                        if ($rating !== null) {
                            DB::table('student_subjects')->where('id', $row->id)->update(['final_rating' => $rating]);
                        }
                    }
                });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('student_subjects', 'final_rating')) {
            Schema::table('student_subjects', function (Blueprint $table) {
                $table->dropColumn('final_rating');
            });
        }
    }
};
