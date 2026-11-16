<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classwork_topics', function (Blueprint $table) {
            $table->id();

            $table->foreignId('year_section_subject_id')
                ->constrained('year_section_subjects')
                ->cascadeOnDelete();

            $table->string('name', 120);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(
                ['year_section_subject_id', 'name'],
                'classwork_topic_name_unique'
            );
        });

        foreach (['class_materials', 'class_assignments'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('topic_id')
                    ->nullable()
                    ->constrained('classwork_topics')
                    ->nullOnDelete();
            });
        }

        Schema::create('assignment_material', function (Blueprint $table) {
            $table->foreignId('assignment_id')
                ->constrained('class_assignments')
                ->cascadeOnDelete();

            $table->foreignId('material_id')
                ->constrained('class_materials')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->primary(['assignment_id', 'material_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_material');

        foreach (['class_assignments', 'class_materials'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('topic_id');
            });
        }

        Schema::dropIfExists('classwork_topics');
    }
};
