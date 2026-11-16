<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('class_materials', function (Blueprint $table) {
            $table->id();

            $table->foreignId('year_section_subject_id')
                ->constrained('year_section_subjects')
                ->cascadeOnDelete();

            $table->string('title');
            $table->text('description')->nullable();
            $table->boolean('published')->default(false);
            $table->timestamps();
        });

        Schema::create('class_assignments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('year_section_subject_id')
                ->constrained('year_section_subjects')
                ->cascadeOnDelete();

            // One assignment per assessment.
            // Name, category and maximum come from the assessment.
            $table->foreignId('assessment_id')
                ->unique()
                ->constrained('assessments')
                ->restrictOnDelete();

            $table->text('instructions')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->boolean('allow_late')->default(true);
            $table->boolean('published')->default(false);
            $table->timestamps();
        });

        Schema::create('class_submissions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('assignment_id')
                ->constrained('class_assignments')
                ->cascadeOnDelete();

            $table->foreignId('student_subject_id')
                ->constrained('student_subjects')
                ->restrictOnDelete();

            $table->text('answer')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->text('feedback')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            // Scores live only in assessment_scores.
            $table->timestamps();

            $table->unique(
                ['assignment_id', 'student_subject_id'],
                'class_submission_student_unique'
            );
        });

        Schema::create('classwork_files', function (Blueprint $table) {
            $table->id();

            // The controller sets exactly one owner.
            $table->foreignId('material_id')
                ->nullable()
                ->constrained('class_materials')
                ->cascadeOnDelete();

            $table->foreignId('assignment_id')
                ->nullable()
                ->constrained('class_assignments')
                ->cascadeOnDelete();

            $table->foreignId('submission_id')
                ->nullable()
                ->constrained('class_submissions')
                ->cascadeOnDelete();

            $table->string('drive_file_id')->unique();
            $table->string('name');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classwork_files');
        Schema::dropIfExists('class_submissions');
        Schema::dropIfExists('class_assignments');
        Schema::dropIfExists('class_materials');
    }
};
