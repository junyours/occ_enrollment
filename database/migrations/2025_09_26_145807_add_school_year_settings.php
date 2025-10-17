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
        Schema::table('school_years', function (Blueprint $table) {
            $table->boolean('allow_enrollment')
                ->default(false)
                ->after('is_current');

            $table->json('allowed_enrollment_roles')
                ->nullable()
                ->after('allow_enrollment');

            $table->boolean('evaluating')
                ->default(false)
                ->after('allowed_enrollment_roles');

            $table->boolean('allow_upload_midterm')
                ->default(false)
                ->after('evaluating');

            $table->boolean('allow_upload_final')
                ->default(false)
                ->after('allow_upload_midterm');
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
