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
        Schema::create('nstp_grade_edit_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('year_section_subjects_id');

            $table->foreignId('nstp_section_id')
                ->constrained('nstp_sections')
                ->restrictOnDelete();

            $table->enum('period', ['midterm', 'final']);
            $table->enum('status', ['pending', 'rejected', 'approved', 'submitted']);

            $table->dateTime('request_date');
            $table->dateTime('rejection_date')->nullable();
            $table->dateTime('approval_date')->nullable();
            $table->dateTime('submission_date')->nullable();

            $table->text('rejection_message')->nullable();

            $table->json('changes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nstp_grade_edit_requests');
    }
};
