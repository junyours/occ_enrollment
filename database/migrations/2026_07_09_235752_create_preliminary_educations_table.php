<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('preliminary_educations', function (Blueprint $table) {
            $table->id();

            // Foreign key to the users table
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // Elementary details
            $table->string('elementary_name')->nullable();
            $table->string('elementary_address')->nullable();
            $table->integer('elementary_year')->nullable(); // Using integer for YYYY

            // Secondary details
            $table->string('secondary_name')->nullable();
            $table->string('secondary_address')->nullable();
            $table->integer('secondary_year')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        // 
    }
};
