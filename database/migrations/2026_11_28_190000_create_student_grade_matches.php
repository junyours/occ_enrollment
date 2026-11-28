<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Grades matched to curriculum subjects by hand, for one student (the curriculum view on
 * Student Grades): a transferee's "COLLEGE ALGEBRA" credited as MATH101, a substitute for a
 * dropped subject, or a grade that shouldn't count at all (subject_id null).
 *
 * One row per grade record (source_type + source_id: a class in this system, an old imported
 * grade, an FES grade or an academic record subject). A program head's match is approved at
 * once; the registrar's and evaluators' wait for a program head of the program (course_id).
 *
 * New table only; nothing existing changes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_grade_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('course')->cascadeOnDelete();
            $table->string('source_type', 20);
            $table->unsignedBigInteger('source_id');
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->cascadeOnDelete();
            $table->string('status', 10)->default('pending');
            $table->text('note')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'source_type', 'source_id']);
            $table->index(['course_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_grade_matches');
    }
};
