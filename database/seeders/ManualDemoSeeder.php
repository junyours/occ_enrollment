<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/** Explicit local-only fixtures; intentionally not called by DatabaseSeeder. */
class ManualDemoSeeder extends Seeder
{
    public function run(): void
    {
        ManualDemoUsersSeeder::assertSafeEnvironment();

        $this->call([
            ManualDemoUsersSeeder::class,
            ManualDemoAcademicSeeder::class,
        ]);
    }
}
