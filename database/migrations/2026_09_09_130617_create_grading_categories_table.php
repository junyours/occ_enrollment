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
        Schema::create('grading_categories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('year_section_subject_id')
                ->constrained('year_section_subjects')
                ->cascadeOnDelete();

            $table->enum('period', ['midterm', 'final']);

            $table->string('name');
            $table->integer('weight')->default(0);
            $table->unsignedInteger('sort_order')->default(0);

            $table->softDeletes();
            $table->timestamps();

            $table->index(['year_section_subject_id', 'period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Schema::dropIfExists('grading_categories');
    }
};
