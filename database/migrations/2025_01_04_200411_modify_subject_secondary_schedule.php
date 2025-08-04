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
        Schema::table('subject_secondary_schedule', function (Blueprint $table) {
            // Modify the day column to include "TBA"
            $table->enum('day', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'TBA'])
                ->default('TBA')
                ->change();

            // Make the room_id column nullable
            $table->unsignedBigInteger('room_id')->nullable()->change();

            // Add the faculty_id column and make it nullable
            $table->unsignedBigInteger('faculty_id')->nullable()->after('year_section_subjects_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Schema::table('subject_secondary_schedule', function (Blueprint $table) {
        //     // Revert the day column to its original state
        //     $table->enum('day', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
        //         ->change();

        //     // Revert the room_id column to not nullable
        //     $table->unsignedBigInteger('room_id')->nullable(false)->change();

        //     // Drop the faculty_id column
        //     $table->dropColumn('faculty_id');
        // });
    }
};
