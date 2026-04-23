<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\EnrolledStudent;
use App\Models\StudentGrade;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use function Laravel\Prompts\select;

class FormNineController extends Controller
{
    public function view()
    {
        return Inertia::render('FormNine/Index');
    }

    public function studentGrades($id)
    {
        $info =  User::where('id', $id)
            ->with([
                'Information' => function ($query) {
                    $query->select('id', 'user_id', 'first_name', 'middle_name', 'last_name', 'gender', 'birthday', 'civil_status', 'contact_number', 'present_address as address');
                },
                'Parent',
            ])
            ->select('id', 'user_id_no')
            ->first();

        // 1. Get and transform current enrollment records
        $enrollmentRecord = EnrolledStudent::where('student_id', $id)
            ->with([
                'Subjects.YearSectionSubjects.Subject',
                'YearSection',
                'YearSection.SchoolYear.Semester',
                'YearSection.Course',
            ])
            ->select('enrolled_students.id', 'student_id', 'year_section_id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->whereNot('year_section.school_year_id', '=', 1)
            ->get();

        $transformedData = $enrollmentRecord->map(function ($record) {
            // Safely extract School Year and Semester
            $schoolYear = $record->YearSection?->SchoolYear;
            $semesterName = $schoolYear?->Semester?->semester_name ?? 'N/A';
            $schoolYearString = $schoolYear ? "{$schoolYear->start_year}-{$schoolYear->end_year}" : 'N/A';

            // Extract Program/Course Name
            $programName = $record->YearSection?->Course?->course_name ?? 'N/A';

            // Map the nested subjects and calculate the average grade
            $subjects = $record->Subjects->map(function ($enrolledSubject) {
                $subjectDetails = $enrolledSubject->YearSectionSubjects?->Subject;

                $midterm = $enrolledSubject->midterm_grade;
                $final = $enrolledSubject->final_grade;
                $finalComputedGrade = null;

                // Only calculate if both grades exist
                if (!is_null($midterm) && !is_null($final)) {
                    $average = ($midterm + $final) / 2;

                    if ($average >= 3.0 && $average <= 3.09) {
                        $averageFormat = 3.0;
                    } elseif ($average >= 4.0) {
                        $averageFormat = 5.0;
                    } else {
                        $averageFormat = $average;
                    }

                    $finalComputedGrade = number_format($averageFormat, 1);
                }

                return [
                    'subject_code'      => $subjectDetails?->subject_code,
                    'descriptive_title' => $subjectDetails?->descriptive_title,
                    'grade'             => $finalComputedGrade,
                    'credit_units'      => $subjectDetails?->credit_units,
                ];
            })->values()->toArray();

            // Return the new flattened structure
            return [
                'semester'   => $semesterName,
                'schoolyear' => $schoolYearString,
                'program'    => $programName,
                'school'     => 'Opol Community College',
                'subjects'   => $subjects,
            ];
        })->values()->toArray(); // Convert this collection to a clean array


        // 2. Get and transform old grading records
        $oldData = StudentGrade::where('id_no', $info->user_id_no)->get();

        $transformedOldData = $oldData->groupBy(function ($grade) {
            // Group the flat records by a unique combination of year, semester, and program
            return $grade->school_year . '|' . $grade->semester . '|' . $grade->program;
        })->map(function ($group) {
            // Extract the common data from the first item in the group
            $firstItem = $group->first();

            // Map the individual subjects for this specific group
            $subjects = $group->map(function ($item) {
                return [
                    'subject_code'      => $item->subject_code,
                    'descriptive_title' => $item->subject,
                    'grade'             => $item->grade,
                    'credit_units'      => $item->units,
                ];
            })->values()->toArray();

            // Return the structured format
            return [
                'semester'   => ucfirst($firstItem->semester),
                'schoolyear' => $firstItem->school_year,
                'program'    => $firstItem->program . ($firstItem->major ? " MAJOR IN {$firstItem->major}" : ''),
                'school'     => 'Opol Community College',
                'subjects'   => $subjects,
            ];
        })->values()->toArray(); // Convert to a clean array

        // 3. Merge the old data and the current enrollment data together
        $combinedData = array_merge($transformedOldData, $transformedData);

        return response()->json([
            'info' => $info,
            'enrollmentRecord' => $combinedData,
            'SIS' => $enrollmentRecord,
            'OLD' => $oldData
        ]);
    }
}
