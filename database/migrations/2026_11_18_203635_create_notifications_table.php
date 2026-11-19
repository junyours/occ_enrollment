<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('type');

            $table->string('notifiable_type');
            $table->unsignedBigInteger('notifiable_id');

            $table->string('category', 30)->default('system');

            $table->nullableMorphs('subject');

            $table->json('data');

            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(
                ['notifiable_type', 'notifiable_id', 'read_at', 'category'],
                'notifications_recipient_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};