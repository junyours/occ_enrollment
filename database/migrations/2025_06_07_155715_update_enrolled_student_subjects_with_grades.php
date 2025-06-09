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
        Schema::table('enrolled_students', function (Blueprint $table) {
            $table->boolean('evaluated')->nullable()->default(0);
        });

        Schema::table('student_subjects', function (Blueprint $table) {
            $table->boolean('dropped')->nullable()->default(0);
            $table->float('midterm_grade')->nullable();
            $table->float('final_grade')->nullable();
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
