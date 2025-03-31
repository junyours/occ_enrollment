<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\StudentType;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('student_type', function (Blueprint $table) {
            $table->id();
            $table->string('student_type_name');
            $table->timestamps();
        });
        StudentType::create(['student_type_name' => 'Freshman']);
        StudentType::create(['student_type_name' => 'Transferee']);
        StudentType::create(['student_type_name' => 'Old']);
        StudentType::create(['student_type_name' => 'Returnee']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_type');
    }
};
