<?php

namespace Database\Seeders;

use App\Models\EnrolledStudent;
use App\Models\SchoolYear;
use App\Models\User;
use App\Models\YearSection;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ChangeSummerStudentPassword extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $userIds = YearSection::where('school_year_id', 2)
            ->join('enrolled_students', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->where('department_id', 1)
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->whereNull('users.first_login_at') // Only those who have not logged in
            ->pluck('users.id');

        User::whereIn('id', $userIds)
            ->update([
                'password' => Hash::make('password'),
            ]);
    }
}
