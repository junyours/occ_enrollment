<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\BillingSchoolYear;
use App\Models\BillingSemester;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function dashboard()
    {
        return Inertia::render('billing/dashboard');
    }

    public function studentBalance()
    {
        return Inertia::render('billing/student-balance');
    }

    public function addStudentBalance()
    {
        return Inertia::render('billing/add-student-balance');
    }

    public function getStudent(Request $request)
    {
        $search = $request->search;

        $students = User::select(
            "users.id",
            "users.user_id_no",
            "user_information.first_name",
            "user_information.last_name",
            "user_information.middle_name"
        )
            ->where('users.user_role', 'student')
            ->join("user_information", "user_information.user_id", "=", "users.id")
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where("users.user_id_no", "like", "%{$search}%")
                        ->orWhere("user_information.first_name", "like", "%{$search}%")
                        ->orWhere("user_information.last_name", "like", "%{$search}%")
                        ->orWhere("user_information.middle_name", "like", "%{$search}%")
                        ->orWhereRaw(
                            "CONCAT(user_information.first_name, ' ', user_information.last_name) LIKE ?",
                            ["%{$search}%"]
                        )
                        ->orWhereRaw(
                            "CONCAT(user_information.first_name, ' ', user_information.middle_name, ' ', user_information.last_name) LIKE ?",
                            ["%{$search}%"]
                        );
                });
            })
            ->paginate(50);

        return response()->json($students);
    }

    public function schoolYear()
    {
        return Inertia::render('billing/school-year');
    }

    public function getSchoolYear()
    {
        $school_years = BillingSchoolYear::select('id', 'school_year')
            ->paginate(50);

        return response()->json($school_years);
    }

    public function addSchoolYear(Request $request)
    {
        $request->validate([
            'school_year' => ['required']
        ]);

        BillingSchoolYear::create([
            'school_year' => $request->school_year
        ]);
    }

    public function updateSchoolYear(Request $request, $id)
    {
        $school_year = BillingSchoolYear::findOrFail($id);

        $request->validate([
            'school_year' => ['required']
        ]);

        $school_year->update([
            'school_year' => $request->school_year
        ]);
    }

    public function semester()
    {
        return Inertia::render('billing/semester');
    }

    public function getSemester()
    {
        $semesters = BillingSemester::select('id', 'semester')
            ->paginate(50);

        return response()->json($semesters);
    }

    public function addSemester(Request $request)
    {
        $request->validate([
            'semester' => ['required']
        ]);

        BillingSemester::create([
            'semester' => $request->semester
        ]);
    }

    public function updateSemester(Request $request, $id)
    {
        $semester = BillingSemester::findOrFail($id);

        $request->validate([
            'semester' => ['required']
        ]);

        $semester->update([
            'semester' => $request->semester
        ]);
    }
}
