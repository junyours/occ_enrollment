<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Mail\FacultyCredentialsMail;
use App\Mail\StudentCredentialsMail;
use App\Models\Faculty;
use App\Models\SchoolYear;
use App\Models\User;
use App\Models\UserInformation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
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
            ->orderBy('user_id_no', 'desc')
            ->get();

        return response()->json($data, 200);
    }

    public function addStudent(Request $request)
    {
        $studentExist = UserInformation::where('first_name', '=', $request->first_name)
            ->where('last_name', '=', $request->last_name)
            ->first();

        if ($studentExist) {
            return back()->withErrors([
                'student' => 'Student already exists.',
            ]);
        }

        $userId = User::select('user_id_no')
            ->where('user_role', '=', 'student')
            ->orderBy('user_id_no', 'desc')
            ->first();

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $lastFive = substr($userId->user_id_no, -5);      // "04567"
        $studLastFiveDigits = str_pad(((int) $lastFive + 1), 5, '0', STR_PAD_LEFT);

        $studentID = $schoolYear->start_year . '-' . $schoolYear->semester_id . '-' . $studLastFiveDigits;

        $password = $this->generateRandomPassword();

        $user = User::create([
            'user_id_no' => $studentID,
            'password' => Hash::make($password),
            'user_role' => 'student',
        ]);

        UserInformation::create([
            'user_id' => $user->id,
            'first_name' => strtoupper($request->first_name),
            'last_name' => strtoupper($request->last_name),
            'middle_name' => strtoupper($request->middle_name),
            'gender' => $request->gender,
            'birthday' => $request->birthday,
            'contact_number' => $request->contact_number,
            'email_address' => $request->email_address,
            'present_address' => strtoupper($request->present_address),
            'zip_code' => $request->zip_code,
        ]);

        $student = [
            "first_name" => ucwords(strtolower($request->first_name)),
            "middle_name" => ucwords(strtolower($request->middle_name)),
            "last_name" => ucwords(strtolower($request->last_name)),
            "user_id_no" => $studentID
        ];

        if ($request->email_address) {
            Mail::to($request->email_address)->send(new StudentCredentialsMail($student, $password));
        }
    }

    public function addFaculty(Request $request){
        $facultyExist = UserInformation::where('first_name', '=', $request->first_name)
            ->where('last_name', '=', $request->last_name)
            ->first();

        if ($facultyExist) {
            return back()->withErrors([
                'faculty' => 'Faculty already exists.',
            ]);
        }

        $yearLastTwoDigits = date('y');

        do {
            $randomNumber = rand(0, 999);
            $randomNumberPadded = str_pad($randomNumber, 3, '0', STR_PAD_LEFT);
            $userId = "FAC-" . $yearLastTwoDigits . $randomNumberPadded;
            $userIdExist = User::where('user_id_no', $userId)->first();
        } while ($userIdExist);

        // Generate a random password
        $password = $this->generateRandomPassword();

        $user = User::create([
            'user_id_no' => $userId,
            'password' => Hash::make($password),
            'user_role' => 'faculty',
        ]);

        UserInformation::create([
            'user_id' => $user->id,
            'password' => Hash::make($request->password),
            'user_role' => $request->user_role,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'middle_name' => $request->middle_name,
            'gender' => $request->gender,
            'birthday' => $request->birthday,
            'contact_number' => $request->contact_number,
            'email_address' => $request->email_address,
            'present_address' => $request->present_address,
            'zip_code' => $request->zip_code,
        ]);

        Faculty::create([
            'faculty_id' => $user->id,
            'department_id' => $request->department_id,
        ]);

        $faculty = [
            "first_name" => ucwords(strtolower($request->first_name)),
            "middle_name" => ucwords(strtolower($request->middle_name)),
            "last_name" => ucwords(strtolower($request->last_name)),
            "user_id_no" => $userId
        ];

        if ($request->email_address) {
            Mail::to($request->email_address)->send(new FacultyCredentialsMail($faculty, $password));
        }
    }

    private function generateRandomPassword()
    {
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $numbers = '0123456789';

        $password = $uppercase[random_int(0, strlen($uppercase) - 1)] .
            $lowercase[random_int(0, strlen($lowercase) - 1)] .
            $numbers[random_int(0, strlen($numbers) - 1)];

        $allCharacters = $uppercase . $lowercase . $numbers;
        for ($i = 3; $i < 8; $i++) {
            $password .= $allCharacters[random_int(0, strlen($allCharacters) - 1)];
        }

        return str_shuffle($password);
    }

    private function getPreparingOrOngoingSchoolYear()
    {
        $today = Carbon::now(); // Get today's date
        $twoWeeksBeforeToday = $today->copy()->subWeeks(2); // 2 weeks before today, stored separately
        $twoWeeksAfterToday = $today->copy()->addWeeks(2); // 2 weeks after today, stored separately

        // Check if enrollment preparation is within 2 weeks before today and today
        $enrollmentPreparation = SchoolYear::whereDate('start_date', '>=', $today->toDateString())
            ->whereDate('start_date', '<=', $twoWeeksAfterToday->toDateString())
            ->first();

        // Check if enrollment is ongoing (start_date <= today <= end_date)
        $enrollmentOngoing = SchoolYear::whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->first();

        $schoolYear = null;
        $status = null;
        $preparation = false;

        // Determine the status and set the school year accordingly
        if ($enrollmentOngoing) {
            // If enrollment is ongoing, set preparation to false
            $status = 'ongoing';
            $schoolYear = $enrollmentOngoing;
            $preparation = false;
        } elseif ($enrollmentPreparation) {
            // If enrollment is in preparation, set status to preparing
            $status = 'preparing';
            $schoolYear = $enrollmentPreparation;
            $preparation = true;
        } else {
            // No enrollment preparation or ongoing, set status to false
            $status = false;
        }

        // Return status, preparation, and school year
        return [
            'status' => $status,
            'preparation' => $preparation,
            'school_year' => $schoolYear
        ];
    }
}
