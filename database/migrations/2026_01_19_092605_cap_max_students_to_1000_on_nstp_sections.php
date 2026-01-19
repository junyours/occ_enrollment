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
        Schema::table('1000_on_nstp_sections', function (Blueprint $table) {
            Schema::table('nstp_sections', function (Blueprint $table) {
                $table->unsignedSmallInteger('max_students')
                    ->default(50)
                    ->change();
            });

            DB::statement("
            ALTER TABLE nstp_sections
            ADD CONSTRAINT chk_max_students_1000
            CHECK (max_students BETWEEN 1 AND 1000)
        ");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('1000_on_nstp_sections', function (Blueprint $table) {
            //
        });
    }
};
