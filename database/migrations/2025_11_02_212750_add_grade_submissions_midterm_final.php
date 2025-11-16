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
        Schema::table('grade_submissions', function (Blueprint $table) {
            // Midterm fields
            $table->enum('midterm_status', ['draft', 'submitted', 'verified', 'rejected', 'deployed'])
                ->default('draft')
                ->after('is_deployed');
            $table->dateTime('midterm_submitted_at')->nullable()
                ->after('midterm_status');
            $table->dateTime('midterm_verified_at')->nullable()
                ->after('midterm_submitted_at');
            $table->text('midterm_rejection_message')->nullable()
                ->after('midterm_verified_at');
            $table->dateTime('midterm_deployed_at')->nullable()
                ->after('midterm_rejection_message');

            // Final fields
            $table->enum('final_status', ['draft', 'submitted', 'verified', 'rejected', 'deployed'])
                ->default('draft')
                ->after('midterm_deployed_at');
            $table->dateTime('final_submitted_at')->nullable()
                ->after('final_status');
            $table->dateTime('final_verified_at')->nullable()
                ->after('final_submitted_at');
            $table->text('final_rejection_message')->nullable()
                ->after('final_verified_at');
            $table->dateTime('final_deployed_at')->nullable()
                ->after('final_rejection_message');
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
