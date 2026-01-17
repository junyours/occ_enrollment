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
        Schema::create('student_subject_nstp_schedule', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_subject_id')->constrained('student_subjects', 'id')->restrictOnDelete();
            $table->foreignId('nstp_section_schedule_id')->constrained('nstp_section_schedules', 'id')->restrictOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_subject_nstp_schedule');
    }
};
