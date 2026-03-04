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
        Schema::table('feedback_keywords', function (Blueprint $table) {
            $table->enum('sentiment', [
                'positive',
                'neutral',
                'negative'
            ])
            ->default('neutral')
            ->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feedback_keywords', function (Blueprint $table) {
            $table->dropColumn('sentiment');
        });
    }
};
