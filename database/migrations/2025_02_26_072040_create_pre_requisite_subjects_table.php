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
        Schema::create('pre_requisite_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('curriculum_term_subjects_id')->nullable();
            $table->foreign('curriculum_term_subjects_id')->references('id')->on('curriculum_term_subjects')->onDelete('cascade');
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pre_requisite_subjects');
    }
};
