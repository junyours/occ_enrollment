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
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('billing_fee_types');
        Schema::dropIfExists('billing_payments');
        Schema::dropIfExists('billing_receipts');
        Schema::dropIfExists('billing_school_years');
        Schema::dropIfExists('billing_semesters');
        Schema::dropIfExists('billing_student_balances');

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
