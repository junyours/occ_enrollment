<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            DB::statement("ALTER TABLE users MODIFY user_role ENUM(
                'faculty',
                'student',
                'program_head',
                'evaluator',
                'registrar',
                'mis',
                'super_admin',
                'president',
                'announcement_admin',
                'guidance',
                'librarian',
                'ojt_coordinator',
                'research_coordinator',
                'vpaa',
                'gened_coordinator',
                'nstp_director') NOT NULL");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
