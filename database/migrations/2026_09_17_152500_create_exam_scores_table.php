<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('exam_scores', function (Blueprint $table) {
            $table->id();

            $table->foreignId('exam_id')
                ->constrained('exams')
                ->cascadeOnDelete();

            $table->foreignId('student_subject_id')
                ->constrained('student_subjects')
                ->cascadeOnDelete();

            $table->integer('score')->nullable();

            $table->softDeletes();
            $table->timestamps();

            $table->unique(
                ['exam_id', 'student_subject_id'],
                'exam_scores_exam_student_unique'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Schema::dropIfExists('exam_scores');
    }
};
