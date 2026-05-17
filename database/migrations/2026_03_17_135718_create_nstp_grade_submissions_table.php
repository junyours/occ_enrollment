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
        Schema::create('nstp_grade_submissions', function (Blueprint $table) {
            $table->id();

            // Foreign key
            $table->foreignId('nstp_section_id')
                ->constrained('nstp_sections')
                ->unique()
                ->restrictOnDelete();

            // Midterm fields
            $table->enum('midterm_status', ['draft', 'submitted', 'verified', 'rejected', 'deployed'])->default('draft');
            $table->dateTime('midterm_submitted_at')->nullable();
            $table->dateTime('midterm_verified_at')->nullable();
            $table->text('midterm_rejection_message')->nullable();
            $table->dateTime('midterm_deployed_at')->nullable();

            // Final fields
            $table->enum('final_status', ['draft', 'submitted', 'verified', 'rejected', 'deployed'])->default('draft');
            $table->dateTime('final_submitted_at')->nullable();
            $table->dateTime('final_verified_at')->nullable();
            $table->text('final_rejection_message')->nullable();
            $table->dateTime('final_deployed_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nstp_grade_submissions');
    }
};
