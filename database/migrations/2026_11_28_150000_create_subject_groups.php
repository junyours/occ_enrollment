<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Same subject" groups: subject codes that are the same subject under different codes
 * (GENED01 = USELF101 = GenEd1), confirmed by a program head. A pass under one code
 * counts for the others. Subjects with the exact same code and title are always the
 * same and need no group.
 *
 * - subject_group_members.subject_id is unique: a subject is in at most one group.
 * - subject_group_dismissals remembers suggestions marked "not the same" (by title),
 *   with the subjects they covered, so a new subject with that title brings it back.
 *
 * New tables only; nothing existing changes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subject_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('subject_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_group_id')->constrained('subject_groups')->cascadeOnDelete();
            $table->foreignId('subject_id')->unique()->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('subject_group_dismissals', function (Blueprint $table) {
            $table->id();
            $table->string('title_key')->unique();
            $table->json('subject_ids');
            $table->foreignId('dismissed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subject_group_dismissals');
        Schema::dropIfExists('subject_group_members');
        Schema::dropIfExists('subject_groups');
    }
};
