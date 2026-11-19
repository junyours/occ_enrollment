<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Things a user has seen once and shouldn't be shown again, on any
        // device: guides (guide:announcements) and "New" labels (tab:classwork).
        Schema::create('user_seen_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('key', 100);
            $table->timestamp('seen_at')->nullable();

            $table->unique(['user_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_seen_items');
    }
};
