<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_otps', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->uuid('request_id')->nullable();
            $table->string('email', 254)->nullable();
            $table->string('code_hash')->nullable();
            $table->char('password_fingerprint', 64)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('resend_available_at')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('send_window_started_at')->nullable();
            $table->unsignedTinyInteger('send_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_otps');
    }
};
