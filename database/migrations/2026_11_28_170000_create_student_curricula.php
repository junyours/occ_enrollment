<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The curriculum a student follows in a program, when staff set it by hand
 * (transferees, returnees, students who switch programs, wrong guesses).
 * Without a row here the curriculum is worked out from the student's first
 * term (App\Services\StudentCurricula). One row per student per program.
 *
 * New table only; nothing existing changes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_curricula', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('course')->cascadeOnDelete();
            $table->foreignId('curriculum_id')->constrained('curriculum')->cascadeOnDelete();
            $table->foreignId('set_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['student_id', 'course_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_curricula');
    }
};
