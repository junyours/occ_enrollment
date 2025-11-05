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
        Schema::create('evaluation_questions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('evaluation_session_id')->constrained('evaluation')->onDelete('cascade');
            $table->foreignId('question_id')->constrained('questions'); // for traceability
            $table->foreignId('criteria_id')->constrained('criterias'); // for traceability

            // Snapshot fields
            $table->string('question_text');
            $table->integer('question_position');
            $table->string('criteria_title');
            $table->integer('criteria_position');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_questions');
    }
};
