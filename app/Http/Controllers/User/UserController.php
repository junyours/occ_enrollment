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

    public function getFacultyList()
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
}
