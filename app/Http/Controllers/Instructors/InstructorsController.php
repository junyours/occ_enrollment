<?php

namespace App\Http\Controllers\Instructors;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class InstructorsController extends Controller
{
    public function getInstructors()
    {
        return User::select('users.id', 'first_name', 'last_name', 'middle_name')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
            ->where('active', '=', 1)
            ->whereIn('users.user_role', ['faculty', 'program_head', 'registrar', 'evaluator'])
            ->orderBy('last_name', 'ASC')
            ->get();
    }
}
