<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Grade upload opens and closes on dates the registrar sets, instead of the
 * two on/off switches. A period whose switch is on when this runs opens now
 * with no closing date, so nothing changes for teachers that day. The old
 * switch columns stay (unused) until a later cleanup removes them.
 */
return new class extends Migration
{
    private const PERIODS = ['midterm', 'final'];

    public function up(): void
    {
        Schema::table('school_years', function (Blueprint $table) {
            $table->dateTime('midterm_upload_opens_at')->nullable()->after('allow_upload_final');
            $table->dateTime('midterm_upload_closes_at')->nullable()->after('midterm_upload_opens_at');
            $table->dateTime('final_upload_opens_at')->nullable()->after('midterm_upload_closes_at');
            $table->dateTime('final_upload_closes_at')->nullable()->after('final_upload_opens_at');
        });

        $now = now();

        foreach (self::PERIODS as $period) {
            DB::table('school_years')
                ->where("allow_upload_{$period}", true)
                ->update(["{$period}_upload_opens_at" => $now]);
        }
    }

    public function down(): void
    {
        // Set the switches to whatever the dates say right now.
        $now = now();

        foreach (self::PERIODS as $period) {
            DB::table('school_years')->update(["allow_upload_{$period}" => false]);

            DB::table('school_years')
                ->where("{$period}_upload_opens_at", '<=', $now)
                ->where(fn($query) => $query
                    ->whereNull("{$period}_upload_closes_at")
                    ->orWhere("{$period}_upload_closes_at", '>', $now))
                ->update(["allow_upload_{$period}" => true]);
        }

        Schema::table('school_years', function (Blueprint $table) {
            $table->dropColumn([
                'midterm_upload_opens_at',
                'midterm_upload_closes_at',
                'final_upload_opens_at',
                'final_upload_closes_at',
            ]);
        });
    }
};
