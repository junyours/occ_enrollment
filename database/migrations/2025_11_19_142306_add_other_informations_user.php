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
        Schema::table('user_information', function (Blueprint $table) {
            // Add missing columns
            $table->string('suffix')->nullable()->after('middle_name');
            $table->string('nationality')->default('Filipino')->after('civil_status');
            $table->string('religion')->nullable()->after('nationality');
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
