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
        Schema::create('nstp_section_schedules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('nstp_section_id')
                ->constrained('nstp_sections')
                ->unique()
                ->restrictOnDelete();

            $table->foreignId('faculty_id')
                ->nullable()
                ->constrained('users')
                ->restrictOnDelete();

            $table->foreignId('room_id')
                ->nullable()
                ->constrained('rooms')
                ->restrictOnDelete();

            $table->string('day', 20)->nullable();
            $table->string('start_time', 5)->nullable();
            $table->string('end_time', 5)->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nstp_section_schedules');
    }
};
