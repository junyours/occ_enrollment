<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('curriculum_term_subjects', function (Blueprint $table) {
            // Drop the foreign key constraint before dropping the column
            $table->dropForeign(['pre_requisite_subject_id']);
            $table->dropColumn('pre_requisite_subject_id');

            // Add the new pre_requisite_name column
            $table->string('pre_requisite_name')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('curriculum_term_subjects', function (Blueprint $table) {
            // Remove the new column
            $table->dropColumn('pre_requisite_name');

            // Re-add the original column and foreign key
            $table->unsignedBigInteger('pre_requisite_subject_id')->nullable();
            $table->foreign('pre_requisite_subject_id')->references('id')->on('subjects')->onDelete('cascade');
        });
    }
};
