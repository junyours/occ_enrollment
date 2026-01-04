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
        Schema::create('student_memorandum_of_agreements', function (Blueprint $table) {
            $table->id();

            $table->foreignId('memorandum_of_agreement_id')
                ->nullable()
                ->constrained('memorandum_of_agreements', 'id', 'smoa_moa_fk')
                ->cascadeOnDelete();

            $table->foreignId('graduation_requirement_id')
                ->constrained('graduation_requirements', 'id', 'smoa_grad_req_fk')
                ->cascadeOnDelete();

            $table->foreignId('librarian_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'smoa_lib_fk');

            $table->foreignId('research_coordinator_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'smoa_research_fk');

            $table->foreignId('ojt_coordinator_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'smoa_ojt_fk');

            $table->foreignId('program_head_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'smoa_ph_fk');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_memorandum_of_agreements');
    }
};
