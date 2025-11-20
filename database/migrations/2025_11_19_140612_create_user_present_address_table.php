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
        Schema::create('user_present_address', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->unique();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            $table->string('street')->nullable();
            
            $table->string('barangay');
            $table->string('barangay_code');

            $table->string('city');
            $table->string('city_code');

            $table->string('province');
            $table->string('province_code');

            $table->string('region');
            $table->string('region_code');
            
            $table->string('zip_code');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_present_address');
    }
};
