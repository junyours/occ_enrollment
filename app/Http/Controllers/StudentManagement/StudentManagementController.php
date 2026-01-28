<?php

namespace App\Http\Controllers\StudentManagement;

use App\Http\Controllers\Controller;
use App\Models\EnrolledStudent;
use App\Models\FesStudentGrade;
use App\Models\User;
use Illuminate\Http\Request;

class StudentManagementController extends Controller
{
    public function getStudentGrades(Request $request)
    {
        $student = User::where('users.id', $request->student_id)
            ->select('users.id', 'user_id_no', 'first_name', 'last_name', 'middle_name')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->first();

        $record = EnrolledStudent::select(
            'enrolled_students.id',
            'year_level_name',
            'section',
            'semester_name',
            'start_year',
            'end_year'
        )
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('year_level', 'year_level.id', '=', 'year_section.year_level_id')
            ->join('school_years', 'school_years.id', '=', 'year_section.school_year_id')
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->where('student_id', '=', $student->id)
            ->with([
                'Subjects' => function ($query) {

                    $query->select([
                        'student_subjects.id',
                        'enrolled_students_id',
                        'first_name',
                        'last_name',
                        'middle_name',
                        'subject_code',
                        'descriptive_title',
                        'midterm_grade',
                        'final_grade',
                        'student_subjects.year_section_subjects_id',
                    ])
                        ->join('year_section_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->leftJoin('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->get();
                }
            ])
            ->orderBy('id', 'DESC')
            ->get();

        $fes = FesStudentGrade::where('id_no', $student->user_id_no)
            ->select(
                'id_no as user_id_no',
                'subject as descriptive_title',
                'year_level as year_level_name',
                'school_year',
                'semester as semester_name',
                'midterm as midterm_grade',
                'final as final_grade',
            )
            ->get();

        if (!$record || !$fes) {
            return response()->json([
                'error' => 'No record found.',
            ], 404);
        }

        $formattedFesGrades = $fes->groupBy(function ($item) {
            // Grouping by unique combinations of year, school year, and semester
            return $item->year_level_name . $item->school_year . $item->semester_name;
        })->map(function ($group) {
            $first = $group->first();

            // Split "2023-2024" into [2023, 2024]
            $years = explode('-', $first->school_year);

            return [
                "id" => null, // Provide an ID if available
                "year_level_name" => $first->year_level_name,
                "section" => "N/A", // Not present in your source data
                "semester_name" => $first->semester_name,
                "start_year" => isset($years[0]) ? (int)$years[0] : null,
                "end_year" => isset($years[1]) ? (int)$years[1] : null,
                "subjects" => $group->map(function ($subject) {
                    return [
                        "id" => null,
                        "enrolled_students_id" => null,
                        "first_name" => null, // Add these if you have student context
                        "last_name" => null,
                        "middle_name" => null,
                        "subject_code" => null, // Not in source query
                        "descriptive_title" => $subject->descriptive_title,
                        "midterm_grade" => $subject->midterm_grade,
                        "final_grade" => $subject->final_grade,
                        "year_section_subjects_id" => null
                    ];
                })->values()
            ];
        })->values();

        // Combine the original record collection with the newly formatted FES grades
        $mergedRecords = $record->concat($formattedFesGrades);

        // 1. Merge the collections
        $mergedRecords = $record->concat($formattedFesGrades);

        // 2. Define semester weights
        $semesterOrder = [
            'First'  => 1,
            'Second' => 2,
            'Summer' => 3
        ];

        // 3. Sort Ascending
        $sortedRecords = $mergedRecords->sort(function ($a, $b) use ($semesterOrder) {
            // Ensure we are working with arrays
            $a = is_array($a) ? $a : $a->toArray();
            $b = is_array($b) ? $b : $b->toArray();

            // Compare Start Year (Ascending: 2023 comes before 2024)
            if ($a['start_year'] !== $b['start_year']) {
                return $a['start_year'] <=> $b['start_year'];
            }

            // If years are the same, compare Semester weight (1 -> 2 -> 3)
            $weightA = $semesterOrder[$a['semester_name']] ?? 99;
            $weightB = $semesterOrder[$b['semester_name']] ?? 99;

            return $weightA <=> $weightB;
        })->values();

        return response()->json(['records' => $sortedRecords, 'student' => $student], 200);
    }
}
