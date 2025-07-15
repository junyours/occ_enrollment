<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MISAndSuperAdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'user_id_no' => 'MIS001',
            'password' => Hash::make('password123'),
            'user_role' => 'mis',
            'password_change' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
