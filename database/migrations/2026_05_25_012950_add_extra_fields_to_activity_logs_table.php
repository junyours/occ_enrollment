<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {

            // Optional secondary target
            $table->string('target_type')->nullable()->after('subject_id');
            $table->unsignedBigInteger('target_id')->nullable()->after('target_type');

            // Structured metadata
            $table->json('properties')->nullable()->after('description');

            // user_agent can exceed 255 chars
            $table->text('user_agent')->nullable()->change();

            // Additional indexes
            $table->index(['target_type', 'target_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        //   
    }
};
