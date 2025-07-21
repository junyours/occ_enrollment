<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AnnouncementAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'user_id_no' => 'ANN-ADMIN-001',
            'password' => Hash::make('password'),
            'user_role' => 'announcement_admin',
            'password_change' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
