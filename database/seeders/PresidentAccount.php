<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Foundation\Auth\User;
use Illuminate\Support\Facades\Hash;

class PresidentAccount extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'user_id_no' => 'PRESIDENT',
            'password' => Hash::make('PresAccount123'),
            'user_role' => 'president',
            'password_change' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
