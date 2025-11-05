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
          DB::statement("ALTER TABLE users MODIFY user_role ENUM('faculty', 'student', 'program_head', 'evaluator', 'registrar', 'guidance') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY user_role ENUM('faculty', 'student', 'program_head', 'evaluator', 'registrar') NOT NULL");
    }
};
