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
        Schema::create('academic_record_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_record_id')->constrained('academic_records')->cascadeOnDelete();
            $table->string('subject_code');
            $table->string('descriptive_title');
            $table->string('grade')->nullable();
            $table->string('re_exam')->nullable();
            $table->decimal('units', 4, 1)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 
    }
};
