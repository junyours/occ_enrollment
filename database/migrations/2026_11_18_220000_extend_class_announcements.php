<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_announcements', function (Blueprint $table) {
            // Pinned posts stay above the rest, newest pin first.
            $table->timestamp('pinned_at')->nullable()->after('edited_at');

            // UTC. An unposted announcement with a time posts itself then.
            $table->timestamp('scheduled_at')->nullable()->after('pinned_at');

            // Students can comment unless the teacher turns it off.
            $table->boolean('comments_enabled')->default(true)->after('scheduled_at');

            // Finds scheduled posts that are due.
            $table->index(['published', 'scheduled_at']);
        });

        // Class comments under an announcement, plain text.
        Schema::create('class_announcement_comments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('announcement_id')
                ->constrained('class_announcements')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->text('body');
            $table->timestamps();

            $table->index(['announcement_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_announcement_comments');

        Schema::table('class_announcements', function (Blueprint $table) {
            $table->dropIndex(['published', 'scheduled_at']);
            $table->dropColumn(['pinned_at', 'scheduled_at', 'comments_enabled']);
        });
    }
};
