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
        Schema::create('student_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('enrolled_students_id');
            $table->foreign('enrolled_students_id')->references('id')->on('enrolled_students')->onDelete('restrict');
            $table->unsignedBigInteger('year_section_subjects_id');
            $table->foreign('year_section_subjects_id')->references('id')->on('year_section_subjects')->onDelete('restrict');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_subjects');
    }
};
