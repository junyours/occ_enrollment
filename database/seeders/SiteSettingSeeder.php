<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SiteSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (SiteSetting::first()) {
            return;
        }

        SiteSetting::updateOrCreate(
            ['id' => 1],
            [
                'maintenance_mode' => false,
                'blocked_roles' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
