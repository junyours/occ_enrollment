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
        Schema::create('profile_email_changes', function (Blueprint $table) {
            $table->char('owner_key', 64)->primary();
            $table->uuid('request_id')->nullable()->unique();
            $table->string('old_email', 254)->nullable();
            $table->string('new_email', 254)->nullable();
            $table->string('code_hash')->nullable();
            $table->char('password_fingerprint', 64)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('reauthenticated_until')->nullable();
            $table->timestamp('resend_available_at')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('send_window_started_at')->nullable();
            $table->unsignedTinyInteger('send_count')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
