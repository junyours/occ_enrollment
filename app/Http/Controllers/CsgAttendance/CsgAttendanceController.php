<?php

namespace App\Http\Controllers\CsgAttendance;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

use App\Models\Department;
use App\Models\SchoolYear;
use App\Models\UserInformation;
use App\Models\YearLevel;
use App\Models\YearSection;

class CsgAttendanceController extends Controller
{
    public function csgAttendanceLogin(Request $request)
    {
        $user = User::where('user_id_no', $request->user_id_no)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 422);
        }

        if (!in_array($user->user_role, ['student'])) {
            return response()->json(['message' => 'Access to this portal is restricted to students only.'], 403);
        }

        $token = $user->createToken('csg-attendance-token')->plainTextToken;

        $accessToken = $user->tokens()->latest('id')->first();
        $accessToken->expires_at = now()->addMonth();
        $accessToken->save();

        return response()->json([
            'token' => $token
        ]);
    }

    public function csgAttendanceUser(Request $request)
    {
        $user_id = $request->user()->id;

        $user = User::select(
            "users.id",
            "users.user_id_no",
            "users.user_role",
            "users.email",
            "user_information.first_name",
            "user_information.last_name",
            "user_information.middle_name",
            "user_information.gender",
            "user_information.birthday",
            "user_information.contact_number",
            "user_information.present_address",
            "user_information.zip_code"
        )
            ->join("user_information", "user_information.user_id", "=", "users.id")
            ->where("users.id", $user_id)
            ->first();

        return response()->json($user);
    }

    public function getSchoolStructure(Request $request)
    {
        $schoolYearIds = $request->input('school_year_id', []);
        $semesterIds = $request->input('semester_id', []);
        $departmentIds = $request->input('department_id', []);
        $courseIds = $request->input('course_id', []);
        $yearLevelIds = $request->input('year_level_id', []);

        $schoolYearsQuery = SchoolYear::with('semester');
        if (!empty($semesterIds)) {
            $schoolYearsQuery->whereIn('semester_id', $semesterIds);
        }
        if (!empty($schoolYearIds)) {
            $schoolYearsQuery->whereIn('id', $schoolYearIds);
        }
        $schoolYears = $schoolYearsQuery->get();

        $yearSectionsQuery = YearSection::query();
        if (!empty($schoolYearIds)) {
            $yearSectionsQuery->whereIn('school_year_id', $schoolYearIds);
        }
        if (!empty($courseIds)) {
            $yearSectionsQuery->whereIn('course_id', $courseIds);
        }
        if (!empty($yearLevelIds)) {
            $yearSectionsQuery->whereIn('year_level_id', $yearLevelIds);
        }
        $yearSections = $yearSectionsQuery->get();

        $departmentIdsAvailable = $yearSections->pluck('course.department_id')->unique();
        $departmentsQuery = Department::with([
            'courses' => function ($q) use ($yearSections) {
                $courseIdsInSections = $yearSections->pluck('course_id')->unique();
                $q->whereIn('id', $courseIdsInSections);
            }
        ]);
        if (!empty($departmentIds)) {
            $departmentsQuery->whereIn('id', $departmentIds);
        } else {
            $departmentsQuery->whereIn('id', $departmentIdsAvailable);
        }
        $departments = $departmentsQuery->get();


        $yearLevelIdsAvailable = $yearSections->pluck('year_level_id')->unique();
        $yearLevelsQuery = YearLevel::query();
        if (!empty($yearLevelIds)) {
            $yearLevelsQuery->whereIn('id', $yearLevelIds);
        } else {
            $yearLevelsQuery->whereIn('id', $yearLevelIdsAvailable);
        }
        $yearLevels = $yearLevelsQuery->get();

        return response()->json([
            'school_years' => $schoolYears,
            'departments' => $departments,
            'year_levels' => $yearLevels,
            'year_sections' => $yearSections,
        ]);
    }

    public function getStudentEnrollment(Request $request)
    {
        $userIdNos = $request->input('user_id_no');

        if (empty($userIdNos)) {

            $query = UserInformation::query();

            if (
                $request->filled('school_year_id') ||
                $request->filled('semester_id') ||
                $request->filled('department_id') ||
                $request->filled('course_id') ||
                $request->filled('year_level_id') ||
                $request->filled('year_section_id')
            ) {
                $query->whereHas('enrolledStudents', function ($q) use ($request) {
                    $q->whereHas('yearSection', function ($ys) use ($request) {
                        if ($request->filled('school_year_id')) {
                            $ys->whereIn('school_year_id', (array) $request->input('school_year_id'));
                        }
                        if ($request->filled('course_id')) {
                            $ys->whereIn('course_id', (array) $request->input('course_id'));
                        }
                        if ($request->filled('year_level_id')) {
                            $ys->whereIn('year_level_id', (array) $request->input('year_level_id'));
                        }
                        if ($request->filled('year_section_id')) {
                            $ys->whereIn('id', (array) $request->input('year_section_id'));
                        }

                        $ys->whereHas('schoolYear', function ($sy) use ($request) {
                            if ($request->filled('semester_id')) {
                                $sy->whereIn('semester_id', (array) $request->input('semester_id'));
                            }
                            if ($request->filled('school_year_id')) {
                                $sy->whereIn('id', (array) $request->input('school_year_id'));
                            }
                        });

                        $ys->whereHas('course', function ($c) use ($request) {
                            if ($request->filled('department_id')) {
                                $c->whereIn('department_id', (array) $request->input('department_id'));
                            }
                        });
                    });
                });
            }

            $userIds = $query->distinct()->pluck('user_id_no');

            return response()->json([
                'user_id_no' => $userIds,
            ]);
        }


        if (!is_array($userIdNos)) {
            return response()->json(['message' => 'user_id_no must be an array'], 400);
        }

        $students = UserInformation::with([
            'enrolledStudents.yearSection.course.department',
            'enrolledStudents.yearSection.yearLevel',
            'enrolledStudents.yearSection.schoolYear.semester'
        ])
            ->whereIn('user_id_no', $userIdNos)
            ->get();

        return response()->json($students);
    }
}
