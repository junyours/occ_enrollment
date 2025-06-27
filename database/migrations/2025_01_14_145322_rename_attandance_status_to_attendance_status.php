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
        Schema::table('student_attendance', function (Blueprint $table) {
            // Add the new column with the correct name
            $table->enum('attendance_status', ['Present', 'Absent', 'Late', 'Excused'])
                ->default('Present')
                ->after('attendance_date');

            // Drop the incorrectly named column
            // $table->dropColumn('attandance_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {

    }
};
