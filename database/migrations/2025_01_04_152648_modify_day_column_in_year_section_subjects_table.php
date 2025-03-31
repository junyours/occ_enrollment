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
        Schema::table('year_section_subjects', function (Blueprint $table) {
            // Modify the day column to include "TBA"
            $table->enum('day', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'TBA'])
                ->default('TBA')
                ->change();

            // Make the faculty_id column nullable
            $table->unsignedBigInteger('faculty_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('year_section_subjects', function (Blueprint $table) {
            // Revert the day column to its original state
            $table->enum('day', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
                ->change();

            // Revert the faculty_id column to not nullable
            $table->unsignedBigInteger('faculty_id')->nullable(false)->change();
        });
    }
};
