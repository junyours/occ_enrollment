<?php

use App\Models\YearSectionSubjects;
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
        Schema::create('grade_submissions', function (Blueprint $table) {
            $table->id();

            // Foreign key
            $table->unsignedBigInteger('year_section_subjects_id');
            $table->foreign('year_section_subjects_id')
                ->references('id')
                ->on('year_section_subjects')
                ->onDelete('restrict');

            // Submission info
            $table->dateTime('submitted_at')->nullable();
            $table->boolean('is_submitted')->default(false);

            // Verification
            $table->boolean('is_verified')->default(false);
            $table->dateTime('verified_at')->nullable();

            // Denial
            $table->boolean('is_rejected')->default(false);
            $table->text('rejection_message')->nullable();

            // Deployment
            $table->dateTime('deployed_at')->nullable();
            $table->boolean('is_deployed')->default(false);

            $table->timestamps(); // created_at, updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grade_submissions');
    }
};
