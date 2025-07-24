<?php

namespace App\Http\Controllers\Department;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function view()
    {
        return Inertia::render('Department/Department');
    }

    public function list()
    {
        $data = Department::select(
            'department.id',
            'department_name',
            'department_name_abbreviation'
        )
            ->selectRaw('GROUP_CONCAT(DISTINCT
                CASE
                WHEN COALESCE(user_information.first_name, "") != ""
                OR COALESCE(user_information.last_name, "") != ""
                THEN TRIM(CONCAT(COALESCE(user_information.first_name, ""), " ",
                             COALESCE(user_information.middle_name, ""), " ",
                             COALESCE(user_information.last_name, "")))
                ELSE NULL
                END
                SEPARATOR ", ") AS full_name')
            ->leftJoin('faculty', 'department.id', '=', 'faculty.department_id')
            ->leftJoin('users', function ($join) {
                $join->on('faculty.faculty_id', '=', 'users.id')
                    ->where('users.user_role', '=', 'program_head');
            })
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->groupBy('department.id', 'department_name', 'department_name_abbreviation')
            ->orderBy('department.id')
            ->with([
                'Course' => function ($query) {
                    $query->select('id', 'department_id', 'course_name', 'course_name_abbreviation', 'major');
                }
            ])
            ->get();

        return response()->json($data);
    }

    public function addProgram(Request $request)
    {
        Course::create([
            'department_id' => $request->department_id,
            'course_name' => $request->course_name,
            'major' => $request->major,
            'course_name_abbreviation' => $request->course_name_abbreviation,
        ]);
    }

    public function editProgram(Request $request)
    {
        Course::where('id', '=', $request->id)
            ->update([
                'department_id' => $request->department_id,
                'course_name' => $request->course_name,
                'major' => $request->major,
                'course_name_abbreviation' => $request->course_name_abbreviation,
            ]);
    }

    public function addDepartment(Request $request)
    {
        Department::create([
            'department_name' => $request->department_name,
            'department_name_abbreviation' => $request->department_name_abbreviation,
        ]);
    }

    public function getDepartments()
    {
        return Department::all();
    }
}
