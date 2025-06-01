<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Add the email column to the users table
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->after('user_id_no');
        });

        // Step 2: Copy email_address from user_information to users
        DB::statement('
            UPDATE users
            JOIN user_information ON users.id = user_information.user_id
            SET users.email = user_information.email_address
        ');
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }
};
