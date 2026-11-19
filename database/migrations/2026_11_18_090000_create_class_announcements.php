<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Posts a teacher shares with one class. An unpublished post is a
        // draft only the teacher sees: new posts wait there while their
        // files upload, so students never see one half-attached.
        Schema::create('class_announcements', function (Blueprint $table) {
            $table->id();

            $table->foreignId('year_section_subject_id')
                ->constrained('year_section_subjects')
                ->cascadeOnDelete();

            $table->foreignId('author_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Rich text, cleaned on the server.
            $table->text('body');
            $table->boolean('published')->default(false);

            // UTC: when students could first see it, and when it last
            // changed after that.
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();

            $table->index(['year_section_subject_id', 'posted_at']);
        });

        Schema::table('classwork_files', function (Blueprint $table) {
            $table->foreignId('announcement_id')
                ->nullable()
                ->after('submission_id')
                ->constrained('class_announcements')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('classwork_files', function (Blueprint $table) {
            $table->dropConstrainedForeignId('announcement_id');
        });

        Schema::dropIfExists('class_announcements');
    }
};
