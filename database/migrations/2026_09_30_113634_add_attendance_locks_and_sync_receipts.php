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
            $table->timestamp('locked_at')->nullable();

            $table->foreignId('locked_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
        });

        // The old Close action was reversible.
        // Only the new explicit Lock action creates a permanent lock.
        DB::table('attendance_sessions')
            ->where('status', 'closed')
            ->update(['status' => 'open']);

        Schema::create('attendance_sync_receipts', function (Blueprint $table) {
            $table->uuid('request_id')->primary();

            $table->foreignId('attendance_session_id')
                ->constrained('attendance_sessions')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->char('payload_hash', 64);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        // Schema::dropIfExists('attendance_sync_receipts');

        // Schema::table('attendance_sessions', function (Blueprint $table) {
        //     $table->dropConstrainedForeignId('locked_by');
        //     $table->dropColumn('locked_at');
        // });
    }
};
