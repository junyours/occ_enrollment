<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Unit-load checks on the curriculum page.
 *
 * - course.max_semester_units / max_summer_units: the program's load limits. Null means the
 *   default (26 per regular semester, 9 in summer); they only produce warnings, never blocks.
 * - curriculum.required_total_units: the total from the approved curriculum, optional.
 *
 * All additive and nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course', function (Blueprint $table) {
            $table->unsignedTinyInteger('max_semester_units')->nullable();
            $table->unsignedTinyInteger('max_summer_units')->nullable();
        });

        Schema::table('curriculum', function (Blueprint $table) {
            $table->unsignedSmallInteger('required_total_units')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('curriculum', function (Blueprint $table) {
            $table->dropColumn('required_total_units');
        });

        Schema::table('course', function (Blueprint $table) {
            $table->dropColumn(['max_semester_units', 'max_summer_units']);
        });
    }
};
