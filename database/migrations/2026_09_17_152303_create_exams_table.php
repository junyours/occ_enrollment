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
        Schema::create('exams', function (Blueprint $table) {
            $table->id();

            $table->foreignId('year_section_subject_id')
                ->constrained('year_section_subjects')
                ->cascadeOnDelete();

            $table->enum('period', ['midterm', 'final']);
            $table->string('name');
            $table->unsignedInteger('max_score');
            
            $table->softDeletes();
            $table->timestamps();

            // Only one exam per class and period
            $table->unique(
                ['year_section_subject_id', 'period'],
                'exams_class_period_unique'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
