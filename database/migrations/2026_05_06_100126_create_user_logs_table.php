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
        Schema::create('user_logs', function (Blueprint $table) {
            $table->id();
            // Links to your users table
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('method');
            $table->string('endpoint');
            $table->string('ip_address')->nullable();
            $table->integer('status_code');
            // JSON column is perfect for flexible payload data
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_logs');
    }
};
