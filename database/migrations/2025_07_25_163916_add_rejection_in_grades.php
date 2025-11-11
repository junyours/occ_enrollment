<?php

use App\Models\GradeSubmission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Schema::table('grade_submissions', function (Blueprint $table) {
        //     $table->boolean('is_rejected')->default(false)->after('verified_at');
        //     $table->text('rejection_message')->nullable()->after('is_rejected');
        //     $table->dropColumn('is_denied');
        //     $table->dropColumn('denial_message');
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {

    }
};
