<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamp('roster_initialized_at')->nullable();
        });

        // Existing meetings already have their original roster, even if empty.
        DB::table('attendance_sessions')->update([
            'roster_initialized_at' => DB::raw('COALESCE(created_at, CURRENT_TIMESTAMP)'),
        ]);

        Schema::table('attendance_records', function (Blueprint $table) {
            // Actual arrival time in the school's local timezone; never auto-filled.
            $table->time('time_in')->nullable();
        });
    }

    public function down(): void
    {
        // Schema::table('attendance_records', function (Blueprint $table) {
        //     $table->dropColumn('time_in');
        // });
        // Schema::table('attendance_sessions', function (Blueprint $table) {
        //     $table->dropColumn(['lock_version', 'roster_initialized_at']);
        // });
    }
};
