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
        Schema::create('cor_info', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrolled_student_id')->constrained('enrolled_students')->cascadeOnDelete();
            $table->boolean('printed')->default(false);
            $table->dateTime('printed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cor_info');
    }
};
