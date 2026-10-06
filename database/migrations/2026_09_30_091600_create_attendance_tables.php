<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Run ONLY if attendance_sessions and attendance_records do not already exist.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('year_section_subject_id')
                ->constrained('year_section_subjects')->restrictOnDelete();
            $table->date('attendance_date');
            $table->unsignedSmallInteger('session_number')->default(1);
            $table->enum('period', ['midterm', 'final']);
            $table->enum('status', ['open', 'closed', 'cancelled'])->default('open');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(
                ['year_section_subject_id', 'attendance_date', 'session_number'],
                'attendance_class_date_session_unique'
            );
        });
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_session_id')
                ->constrained('attendance_sessions')->restrictOnDelete();
            $table->foreignId('student_subject_id')
                ->constrained('student_subjects')->restrictOnDelete();
            $table->enum('status', ['present', 'absent', 'late', 'excused'])->nullable()->default(null);
            $table->string('remarks')->nullable();
            $table->foreignId('marked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('marked_at')->nullable();
            $table->timestamps();
            $table->unique(['attendance_session_id', 'student_subject_id'], 'attendance_session_student_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('attendance_sessions');
    }
};
