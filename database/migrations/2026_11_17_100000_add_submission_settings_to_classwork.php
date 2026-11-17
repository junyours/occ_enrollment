<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_assignments', function (Blueprint $table) {
            // How students hand in the work: {"type": "files" | "questions"
            // | "links", ...that type's options}. Null means file upload.
            $table->json('submission_settings')->nullable()->after('allow_late');
        });

        Schema::table('class_submissions', function (Blueprint $table) {
            $table->json('links')->nullable()->after('answer');
        });
    }

    public function down(): void
    {
        Schema::table('class_submissions', function (Blueprint $table) {
            $table->dropColumn('links');
        });

        Schema::table('class_assignments', function (Blueprint $table) {
            $table->dropColumn('submission_settings');
        });
    }
};
