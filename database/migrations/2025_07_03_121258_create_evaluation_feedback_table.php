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
        Schema::create('evaluation_feedback', function (Blueprint $table) {
            $table->id();

            $table->foreignId('evaluation_session_id')->constrained('evaluation')->onDelete('cascade');
            $table->foreignId('student_subject_id')->constrained('student_subjects')->onDelete('cascade'); // ✅ NEW
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');

            $table->text('strengths');
            $table->text('weaknesses');
            $table->boolean('anonymous')->default(false);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_feedback');
    }
};
