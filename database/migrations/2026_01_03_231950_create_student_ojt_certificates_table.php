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
        Schema::create('student_ojt_certificates', function (Blueprint $table) {
            $table->id();

            $table->foreignId('graduation_requirement_id')
                ->constrained('graduation_requirements', 'id', 'soc_grad_req_fk')
                ->cascadeOnDelete();

            $table->string('file_name')->unique();
            $table->string('google_id')->unique();
            $table->timestamp('uploaded_at');

            $table->foreignId('uploader_id')
                ->constrained('users', 'id', 'soc_uploader_fk');

            $table->foreignId('research_coordinator_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'soc_research_fk');

            $table->foreignId('program_head_confirmed_id')
                ->nullable()
                ->constrained('users', 'id', 'soc_ph_fk');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_ojt_certificates');
    }
};
