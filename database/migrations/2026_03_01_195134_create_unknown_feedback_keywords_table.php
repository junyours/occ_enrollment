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
        Schema::create('unknown_feedback_keywords', function (Blueprint $table) {
            $table->id();
            $table->string('term')->unique();
            $table->unsignedInteger('count')->default(1);
            $table->text('sample_text')->nullable();
            $table->enum('status',['pending','approved','rejected'])
          ->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unknown_feedback_keywords');
    }
};
