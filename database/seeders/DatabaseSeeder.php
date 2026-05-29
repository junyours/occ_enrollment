<?php

namespace Database\Seeders;
use App\Models\User;
use Hash;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            User::create([
                'id' => 5847,
                'user_id_no' => '0000-0-0001',
                'user_role' => 'billing',
                'email' => 'billing@gmail.com',
                'password' => Hash::make('password')
            ])
        ]);
    }
}
