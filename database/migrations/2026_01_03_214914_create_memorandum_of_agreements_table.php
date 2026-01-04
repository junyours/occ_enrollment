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
        Schema::create('memorandum_of_agreements', function (Blueprint $table) {
            $table->id();
            
            $table->string('file_name')->unique();
            $table->string('google_id')->unique();
            $table->timestamp('uploaded_at');
            $table->foreignId('uploader_id')->constrained('users');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('memorandum_of_agreements');
    }
};
