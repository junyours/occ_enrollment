<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_assignments', function (Blueprint $table) {
            $table->string('title')->nullable();
            $table->string('body_format', 10)->default('text');
        });

        Schema::table('class_materials', function (Blueprint $table) {
            $table->string('body_format', 10)->default('text');
        });

        DB::table('class_assignments')
            ->select('id', 'assessment_id')
            ->whereNull('title')
            ->chunkById(200, function ($assignments) {
                $names = DB::table('assessments')
                    ->whereIn('id', $assignments->pluck('assessment_id'))
                    ->pluck('name', 'id');

                foreach ($assignments as $assignment) {
                    DB::table('class_assignments')
                        ->where('id', $assignment->id)
                        ->update([
                            'title' => $names[$assignment->assessment_id]
                                ?? 'Assignment ' . $assignment->id,
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('class_materials', function (Blueprint $table) {
            $table->dropColumn('body_format');
        });

        Schema::table('class_assignments', function (Blueprint $table) {
            $table->dropColumn(['title', 'body_format']);
        });
    }
};
