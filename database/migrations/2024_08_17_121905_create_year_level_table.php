<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\YearLevel;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('year_level', function (Blueprint $table) {
            $table->id();
            $table->string('year_level');
            $table->string('year_level_name');
            $table->timestamps();
        });

        YearLevel::create([
            'year_level' => 1,
            'year_level_name' => 'First Year',
        ]);

        YearLevel::create([
            'year_level' => 2,
            'year_level_name' => 'Second Year',
        ]);

        YearLevel::create([
            'year_level' => 3,
            'year_level_name' => 'Third Year',
        ]);

        YearLevel::create([
            'year_level' => 4,
            'year_level_name' => 'Fourth Year',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('year_level');
    }
};
