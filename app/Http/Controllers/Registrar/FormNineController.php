<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\AcademicRecord;
use App\Models\EnrolledStudent;
use App\Models\PreliminaryEducation;
use App\Models\StudentGrade;
use App\Models\User;
use App\Models\UserInformation;
use App\Models\UserParents;
use App\Models\UserPresentAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $info = User::where('id', $id)
            ->with([
                'Information' => function ($query) {
                    $query->select('id', 'user_id', 'first_name', 'middle_name', 'last_name', 'gender', 'birthday', 'civil_status', 'contact_number', 'present_address as address', 'place_of_birth');
                },
                'Parent',
                'preliminaryEducation'
            ])
            ->select('id', 'user_id_no')
            ->first();

        // 1. Get and transform current enrollment records (Existing)
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
            $schoolYear = $record->YearSection?->SchoolYear;
            $semesterName = $schoolYear?->Semester?->semester_name ?? 'N/A';
            $schoolYearString = $schoolYear ? "{$schoolYear->start_year}-{$schoolYear->end_year}" : 'N/A';
            $programName = $record->YearSection?->Course?->course_name . ($record->YearSection?->Course->major ? " MAJOR IN {$record->YearSection?->Course->major}" : '') ?? 'N/A';

            $subjects = $record->Subjects->map(function ($enrolledSubject) {
                $subjectDetails = $enrolledSubject->YearSectionSubjects?->Subject;
                $midterm = $enrolledSubject->midterm_grade;
                $final = $enrolledSubject->final_grade;
                $finalComputedGrade = null;

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

            return [
                'semester'   => $semesterName,
                'schoolyear' => $schoolYearString,
                'program'    => $programName,
                'school'     => 'Opol Community College',
                'subjects'   => $subjects,
            ];
        })->values()->toArray();

        // 2. Get and transform old grading records (Existing)
        $oldData = StudentGrade::where('id_no', $info->user_id_no)->get();

        $transformedOldData = $oldData->groupBy(function ($grade) {
            return $grade->school_year . '|' . $grade->semester . '|' . $grade->program;
        })->map(function ($group) {
            $firstItem = $group->first();
            $subjects = $group->map(function ($item) {
                return [
                    'subject_code'      => $item->subject_code,
                    'descriptive_title' => $item->subject,
                    'grade'             => $item->grade,
                    'credit_units'      => $item->units,
                ];
            })->values()->toArray();

            return [
                'semester'   => ucfirst($firstItem->semester),
                'schoolyear' => $firstItem->school_year,
                'program'    => $firstItem->program . ($firstItem->major ? " MAJOR IN {$firstItem->major}" : ''),
                'school'     => 'Opol Community College',
                'subjects'   => $subjects,
            ];
        })->values()->toArray();

        // 3. Get and transform the NEW Academic Records
        // Make sure to import App\Models\AcademicRecord at the top of your controller
        $academicRecords = \App\Models\AcademicRecord::where('student_id', $id)
            ->with('subjects') // Eager load the subjects relationship
            ->get();

        $transformedAcademicRecords = $academicRecords->map(function ($record) {
            // Format the semester to match existing outputs (e.g., 'First', 'Second', 'Summer')
            $formattedSemester = ucfirst($record->semester);

            $subjects = $record->subjects->map(function ($subject) {
                return [
                    'subject_code'      => $subject->subject_code,
                    'descriptive_title' => $subject->descriptive_title,
                    'grade'             => $subject->grade,
                    'credit_units'      => $subject->units, // Note: your schema called it 'units', but we output 'credit_units' to match the other arrays
                ];
            })->values()->toArray();

            return [
                'semester'   => $formattedSemester,
                'schoolyear' => $record->school_year,
                'program'    => $record->program . ($record->major ? " MAJOR IN {$record->major}" : ''),
                'school'     => $record->school_name,
                'subjects'   => $subjects,
            ];
        })->values()->toArray();


        // 4. Merge ALL data together: Old Data + Enrollment Data + Academic Records
        $combinedData = array_merge($transformedOldData, $transformedData, $transformedAcademicRecords);

        // 5. Sort chronologically by School Year, then by Semester
        $sortedCombinedData = collect($combinedData)->sort(function ($a, $b) {
            // Define standard weights for semesters to ensure correct chronological order
            $semesterWeights = [
                'First'  => 1,
                '1st' => 1,
                'Second' => 2,
                '2nd' => 2,
                'Summer' => 3
            ];

            // 1. Compare School Years (e.g., "2022-2023" vs "2023-2024")
            $yearComparison = strcmp($a['schoolyear'], $b['schoolyear']);

            // 2. If the School Years are exactly the same, compare the Semesters
            if ($yearComparison === 0) {
                // Standardize strings so 'first' or 'First' or '1st' resolve correctly
                $semA = $semesterWeights[ucfirst(strtolower($a['semester']))] ?? 4;
                $semB = $semesterWeights[ucfirst(strtolower($b['semester']))] ?? 4;

                return $semA <=> $semB;
            }

            return $yearComparison;
        })->values()->toArray(); // Reset array keys after sorting

        return response()->json([
            'info'             => $info,
            'enrollmentRecord' => $sortedCombinedData, // Use the new sorted array here
            'SIS'              => $enrollmentRecord,
            'OLD'              => $oldData,
            'ACADEMIC_RECORDS' => $academicRecords
        ]);
    }

    public function addRecord(Request $request)
    {
        // 1. Validate the incoming payload
        $validated = $request->validate([
            'student_id' => 'required|integer|exists:users,id', // Make sure the student exists
            'recordType' => 'required|in:old,transferee',
            'school'     => 'required|string|max:255',
            'schoolYear' => 'required|string|max:20',
            'semester'   => 'required|in:first,second,summer',
            'program'    => 'required|string|max:255',
            'major'      => 'nullable|string|max:255',

            // Validate the nested subjects array
            'subjects'             => 'required|array|min:1',
            'subjects.*.code'      => 'required|string|max:50',
            'subjects.*.title'     => 'required|string|max:255',
            'subjects.*.grade'     => 'required|string|max:10',
            'subjects.*.units'     => 'required|numeric',
            'subjects.*.re_exam'   => 'nullable|string|max:10',
        ]);

        // 2. Wrap database operations in a transaction
        DB::transaction(function () use ($validated) {

            // Map frontend keys to the parent database columns
            $record = AcademicRecord::create([
                'student_id'  => $validated['student_id'],
                'record_type' => $validated['recordType'],
                'school_name' => $validated['school'],
                'school_year' => $validated['schoolYear'],
                'semester'    => $validated['semester'],
                'program'     => $validated['program'],
                'major'       => $validated['major'] ?? null,
            ]);

            // Map frontend subject keys to the child database columns
            $subjectsData = collect($validated['subjects'])->map(function ($subject) {
                return [
                    'subject_code'      => $subject['code'],
                    'descriptive_title' => $subject['title'],
                    'grade'             => $subject['grade'],
                    're_exam'           => $subject['re_exam'] ?? null,
                    'units'             => $subject['units'],
                ];
            });

            // 3. Save the associated subjects using the relationship
            $record->subjects()->createMany($subjectsData);
        });

        // 4. Return the response back to Inertia
        return back()->with('success', 'Academic record and subjects added successfully.');
    }

    public function addInfo(Request $request, $userId)
    {
        // Optional but recommended: Validate the incoming request here
        /*
        $request->validate([
            'gender' => 'required|string',
            'regionCode' => 'required|string',
            // ... other validations
        ]);
        */

        DB::beginTransaction();

        try {
            // 1. Format the combined Present Address
            // array_filter removes empty values (e.g., if 'street' was left blank)
            $addressParts = array_filter([
                $request->street,
                $request->barangay,
                $request->city,
                $request->province,
            ]);

            // Joins the available parts with a comma and space
            $combinedAddress = implode(', ', $addressParts);

            // 2. Save User Information
            UserInformation::updateOrCreate(
                ['user_id' => $userId],
                [
                    'gender' => $request->gender,
                    'civil_status' => $request->civil_status,
                    'birthday' => $request->birthday,
                    'contact_number' => $request->contact_number,
                    'present_address' => $combinedAddress,
                    'zip_code' => $request->zipCode,
                    'place_of_birth' => $request->place_of_birth,
                    // Note: first_name, last_name, etc., should be handled here if passed in the form, 
                    // otherwise they remain unchanged if they already exist.
                ]
            );

            // 3. Save Detailed Present Address
            UserPresentAddress::updateOrCreate(
                ['user_id' => $userId],
                [
                    'street' => $request->street,
                    'barangay' => $request->barangay,
                    'barangay_code' => $request->barangayCode,
                    'city' => $request->city,
                    'city_code' => $request->cityCode,
                    'province' => $request->province,
                    'province_code' => $request->provinceCode,
                    'region' => $request->region,
                    'region_code' => $request->regionCode,
                    'zip_code' => $request->zipCode,
                ]
            );

            // 4. Save Parents Information
            UserParents::updateOrCreate(
                ['user_id' => $userId],
                $request->only([
                    'father_first_name',
                    'father_last_name',
                    'father_middle_name',
                    'father_suffix',
                    // father_contact_number is in your model, ensure you add it to your React form if needed
                    'mother_first_name',
                    'mother_maiden_last_name',
                    'mother_middle_name',
                    'mother_suffix',
                    // mother_contact_number is in your model as well
                ])
            );

            // 5. Save Preliminary Education
            PreliminaryEducation::updateOrCreate(
                ['user_id' => $userId],
                $request->only([
                    'elementary_name',
                    'elementary_address',
                    'elementary_year',
                    'secondary_name',
                    'secondary_address',
                    'secondary_year',
                ])
            );

            // Commit the transaction if everything is successful
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Student information added successfully.'
            ], 200);
        } catch (\Exception $e) {
            // Rollback all database changes if an error occurs
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to save student information.',
                'error' => $e->getMessage() // You can remove this in production for security
            ], 500);
        }
    }

    public function getInfo($userId)
    {
        // 'with' eagerly loads the relationships we defined in the User model
        $student = User::with([
            'information',
            'presentAddress',
            'parents',
            'preliminaryEducation'
        ])->find($userId);

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found.'
            ], 404);
        }

        // Return the data structured exactly how the React component expects to read it
        return response()->json([
            'success' => true,
            'data' => [
                'information' => $student->information,
                'address'     => $student->presentAddress,
                'parents'     => $student->parents,
                'education'   => $student->preliminaryEducation,
            ]
        ], 200);
    }
}
