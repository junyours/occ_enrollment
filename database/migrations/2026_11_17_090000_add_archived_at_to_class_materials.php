<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_materials', function (Blueprint $table) {
            // Archived materials are hidden from students and listed
            // separately for the teacher; they can be restored.
            $table->timestamp('archived_at')->nullable()->after('published');
            $table->index(['year_section_subject_id', 'archived_at']);
        });
    }

    public function down(): void
    {
        Schema::table('class_materials', function (Blueprint $table) {
            $table->dropIndex(['year_section_subject_id', 'archived_at']);
            $table->dropColumn('archived_at');
        });
    }
};
