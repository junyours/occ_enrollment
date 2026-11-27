<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Curriculum prerequisites.
 *
 * - pre_requisite_subjects.required_term_subject_id: the earlier subject in the
 *   SAME curriculum that must be passed first. It points at the curriculum entry
 *   (not subjects.id) because revising a subject creates a new subjects row and
 *   repoints the entry; the link must survive that.
 * - curriculum_term_subjects.required_year_level_id: optional year standing,
 *   e.g. "3rd Year Standing".
 *
 * Both are additive; pre_requisite_subjects was empty when this was written.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pre_requisite_subjects', function (Blueprint $table) {
            $table->unsignedBigInteger('required_term_subject_id')->nullable()->after('curriculum_term_subjects_id');
            $table->foreign('required_term_subject_id')
                ->references('id')->on('curriculum_term_subjects')
                ->cascadeOnDelete();
            $table->unique(['curriculum_term_subjects_id', 'required_term_subject_id'], 'prereq_entry_required_unique');
        });

        Schema::table('curriculum_term_subjects', function (Blueprint $table) {
            $table->unsignedBigInteger('required_year_level_id')->nullable()->after('subject_id');
            $table->foreign('required_year_level_id')
                ->references('id')->on('year_level')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('curriculum_term_subjects', function (Blueprint $table) {
            $table->dropForeign(['required_year_level_id']);
            $table->dropColumn('required_year_level_id');
        });

        Schema::table('pre_requisite_subjects', function (Blueprint $table) {
            $table->dropUnique('prereq_entry_required_unique');
            $table->dropForeign(['required_term_subject_id']);
            $table->dropColumn('required_term_subject_id');
        });
    }
};
