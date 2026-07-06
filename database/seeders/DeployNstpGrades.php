<?php

namespace Database\Seeders;

use App\Models\NstpGradeSubmission;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DeployNstpGrades extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        NstpGradeSubmission::query()->update([
            'midterm_status' => 'deployed',
            'midterm_submitted_at' => now(),
            'midterm_verified_at' => now(),
            'midterm_rejection_message' => 'deployed',
            'midterm_deployed_at' => now(),
            'final_status' => 'deployed',
            'final_submitted_at' => now(),
            'final_verified_at' => now(),
            'final_rejection_message' => 'deployed',
            'final_deployed_at' => now(),
        ]);
    }
}
