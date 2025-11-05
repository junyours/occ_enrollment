<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
   Schema::table('criterias', function (Blueprint $table) {
            $table->integer('position')->default(0)->after('suggestion');
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->integer('position')->default(0)->after('text');
        });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('criteria_and_questions', function (Blueprint $table) {
            //
        });
    }
};
