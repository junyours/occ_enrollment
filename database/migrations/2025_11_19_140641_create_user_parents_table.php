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
        Schema::create('user_parents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->unique();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // Father Information
            $table->string('father_first_name')->nullable();
            $table->string('father_last_name')->nullable();
            $table->string('father_middle_name')->nullable();
            $table->string('father_suffix')->nullable();
            $table->string('father_contact_number')->nullable();

            // Mother Information
            $table->string('mother_first_name')->nullable();
            $table->string('mother_maiden_last_name')->nullable();
            $table->string('mother_middle_name')->nullable();
            $table->string('mother_suffix')->nullable();
            $table->string('mother_contact_number')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_parents_');
    }
};
