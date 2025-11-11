<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evaluation', function (Blueprint $table) {
            $table->unique('school_year_id', 'unique_school_year_in_evaluation');
        });
    }

    public function down(): void
    {
        // Schema::table('evaluation', function (Blueprint $table) {
        //     $table->dropUnique('unique_school_year_in_evaluation');
        // });
    }
};
