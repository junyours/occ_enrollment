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
        Schema::create('feedback_analyses', function (Blueprint $table) {
            $table->id();

            $table->foreignId('evaluation_feedback_id')
                ->constrained('evaluation_feedback')
                ->onDelete('cascade');

            $table->foreignId('feedback_category_id')
                ->constrained()
                ->onDelete('cascade');

            $table->enum('type', ['strength', 'weakness']);
            $table->integer('match_count')->default(1);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('feedback_analyses');
    }
};
