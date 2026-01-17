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
        Schema::create('nstp_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nstp_component_id')->constrained('nstp_components', 'id')->restrictOnDelete();
            $table->foreignId('school_year_id')->constrained('school_years', 'id')->restrictOnDelete();
            $table->string('section', 20);
            $table->unsignedTinyInteger('max_students')->default(50);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nstp_sections');
    }
};
