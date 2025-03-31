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
        Schema::create('curriculum_term_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('curriculum_term_id');
            $table->foreign('curriculum_term_id')->references('id')->on('curriculum_term')->onDelete('cascade');
            $table->unsignedBigInteger('subject_id');
            $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
            $table->unsignedBigInteger('pre_requisite_subject_id')->nullable();
            $table->foreign('pre_requisite_subject_id')->references('id')->on('subjects')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('curriculum_term_subjects');
    }
};
