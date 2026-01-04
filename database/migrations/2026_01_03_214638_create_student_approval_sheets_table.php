<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('student_approval_sheets', function (Blueprint $table) {
            $table->id();

            $table->foreignId('approval_sheet_id')
                ->nullable()
                ->constrained('approval_sheets')
                ->cascadeOnDelete();

            $table->foreignId('graduation_requirement_id')
                ->constrained('graduation_requirements')
                ->cascadeOnDelete();

            $table->foreignId('librarian_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'sas_librarian_fk');

            $table->foreignId('research_coordinator_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'sas_research_fk');

            $table->foreignId('ojt_coordinator_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'sas_ojt_fk');

            $table->foreignId('program_head_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'sas_ph_fk');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_approval_sheets');
    }
};
