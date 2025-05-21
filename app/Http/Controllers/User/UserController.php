<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class UserController extends Controller
{
    public function viewFaculty()
    {
        return Inertia::render('UserManagement/FacultyList');
    }

    public function viewStudent()
    {
        return Inertia::render('UserManagement/StudentList');
    }

    public function getFacultyListDepartment()
    {
        $userId = Auth::user()->id;
        $departmentId = Faculty::where('faculty_id', '=', $userId)->first()->department_id;

        $data = Faculty::select(
            'users.id',
            'user_id_no',
            'first_name',
            'middle_name',
            'last_name',
            'gender',
            'birthday',
            'contact_number',
            'email_address',
            'present_address',
            'zip_code',
            'email_address',
            'active',
            'user_role'
        )
            ->where('department_id', '=', $departmentId)
            ->join('users', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($data);
    }

    public function getFacultyList()
    {
        $data = Faculty::select(
            'users.id',
            'user_id_no',
            'first_name',
            'middle_name',
            'last_name',
            'gender',
            'birthday',
            'contact_number',
            'email_address',
            'present_address',
            'zip_code',
            'email_address',
            'active',
            'user_role',
            'department_name_abbreviation'
        )
            ->join('users', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('department', 'department.id', '=', 'faculty.department_id')
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($data);
    }

    public function setFacultyActiveStatus(Request $request)
    {
        Faculty::where('faculty_id', '=', $request->id)
            ->update(['active' => $request->active]);
    }

    public function setFacultyRole(Request $request)
    {
        User::findOrFail($request->id)
            ->update(['user_role' => $request->role]);
    }

    public function departmentFaculties($id)
    {
        $data = Faculty::where('department_id', '=', $id)
            ->select('users.id', 'first_name', 'middle_name', 'last_name', 'user_role')
            ->join('users', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($data, 200);
    }

    public function assignDeptHead($deptID, $facID)
    {
        User::where('user_role', '=', 'program_head')
            ->where('department_id', '=', $deptID)
            ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
            ->update(['user_role' => 'faculty']);

        User::where('id', '=', $facID)
            ->update(['user_role' => 'program_head']);

        return response()->json(['message' => 'success']);
    }

    public function students()
    {
        $data = User::select(
            'users.id',
            'user_id_no',
            'email_address',
            'contact_number',
            'user_information.first_name',
            'user_information.middle_name',
            'user_information.last_name',
        )
            ->leftJoin('user_information', 'user_information.user_id', '=', 'users.id')
            ->where('users.user_role', '=', 'student')
            ->get();

        return response()->json($data, 200);
    }
}
