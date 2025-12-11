<?php

namespace App\Http\Controllers\Mis;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserInformation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;

class MisController extends Controller
{
    public  function misFacultyList()
    {
        return Inertia::render('Mis/Faculties');
    }

    public function misStudentList()
    {
        return Inertia::render('Mis/Students');
    }

    public function recycleBin()
    {
        return Inertia::render('Mis/RecycleBin');
    }

    public function users(Request $request)
    {
        $users = User::query()
            ->select(
                'users.id',
                'users.user_id_no',
                'users.user_role',
                'user_information.first_name',
                'user_information.last_name',
                'user_information.middle_name',
                'user_information.gender',
                'user_information.birthday',
                'user_information.civil_status',
                'user_information.contact_number',
                'user_information.email_address as email',
                'user_information.present_address',
                'user_information.zip_code'
            )
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->when($request->role && $request->role !== 'all', function ($query, $role) use ($request) {
                $query->where('users.user_role', $request->role);
            })
            ->when($request->search, function ($query, $search) use ($request) {
                $searchField = $request->searchField ?? 'all';

                if ($searchField === 'all') {
                    $query->where(function ($q) use ($search) {
                        $q->where('users.user_id_no', 'like', '%' . $search . '%')
                            ->orWhere('user_information.first_name', 'like', '%' . $search . '%')
                            ->orWhere('user_information.last_name', 'like', '%' . $search . '%')
                            ->orWhere('user_information.middle_name', 'like', '%' . $search . '%')
                            ->orWhere('user_information.email_address', 'like', '%' . $search . '%')
                            ->orWhere('users.user_role', 'like', '%' . $search . '%')
                            ->orWhere('user_information.contact_number', 'like', '%' . $search . '%');
                    });
                } else {
                    // Map field names to their table columns
                    $fieldMap = [
                        'user_id_no' => 'users.user_id_no',
                        'first_name' => 'user_information.first_name',
                        'last_name' => 'user_information.last_name',
                        'email' => 'user_information.email_address',
                        'user_role' => 'users.user_role',
                        'contact_number' => 'user_information.contact_number',
                    ];

                    if (isset($fieldMap[$searchField])) {
                        $query->where($fieldMap[$searchField], 'like', '%' . $search . '%');
                    }
                }
            })
            ->orderByRaw("CASE
                WHEN user_role = 'super_admin' THEN 1
                WHEN user_role = 'president' THEN 2
                WHEN user_role = 'program_head' THEN 3
                WHEN user_role = 'registrar' THEN 4
                WHEN user_role = 'evaluator' THEN 5
                WHEN user_role = 'mis' THEN 6
                WHEN user_role = 'guidance' THEN 7
                WHEN user_role = 'announcement_admin' THEN 8
                WHEN user_role = 'faculty' THEN 9
                WHEN user_role = 'student' THEN 10
                ELSE 11
                END")
            ->orderByRaw('COALESCE(user_information.last_name, users.user_id_no)')
            ->paginate(10);

        $users->appends($request->query());

        return Inertia::render('Mis/Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'searchField', 'role'])
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id_no' => ['required', 'unique:users,user_id_no'],
            'user_role' => ['required', 'in:faculty,student,program_head,evaluator,registrar,mis,super_admin,president,announcement_admin,guidance'],
            'password' => ['required', 'confirmed'],
        ], [
            'user_id_no.required' => 'User ID number is required.',
            'user_id_no.unique' => 'This user ID number already exists.',
            'user_role.required' => 'User role is required.',
            'user_role.in' => 'Invalid user role selected.',
            'password.required' => 'Password is required.',
            'password.confirmed' => 'Password confirmation does not match.',
        ]);

        User::create([
            'user_id_no' => strtoupper($validated['user_id_no']),
            'user_role' => $validated['user_role'],
            'password' => Hash::make($validated['password']),
        ]);

        return redirect()->route('mis-users')->with('success', 'User created successfully.');
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'user_id_no' => ['required', 'unique:users,user_id_no,' . $id],
            'user_role' => ['required', 'in:faculty,student,program_head,evaluator,registrar,mis,super_admin,president,announcement_admin,guidance'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', 'in:Male,Female'],
            'birthday' => ['nullable', 'date'],
            'civil_status' => ['nullable', 'string', 'max:50'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'present_address' => ['nullable', 'string', 'max:500'],
            'zip_code' => ['nullable', 'string', 'max:10'],
        ]);

        // Update user basic info
        $user->update([
            'user_id_no' => $validated['user_id_no'],
            'user_role' => $validated['user_role'],
            'email' => $validated['email'] ?? null,
        ]);

        // Update or create user information
        UserInformation::updateOrCreate(
            ['user_id' => $user->id], // search key
            [
                'first_name' => $validated['first_name'] ?? null,
                'last_name' => $validated['last_name'] ?? null,
                'middle_name' => $validated['middle_name'] ?? null,
                'gender' => $validated['gender'] ?? null,
                'birthday' => $validated['birthday'] ?? null,
                'civil_status' => $validated['civil_status'] ?? null,
                'contact_number' => $validated['contact_number'] ?? null,
                'email_address' => $validated['email'] ?? null,
                'present_address' => $validated['present_address'] ?? null,
                'zip_code' => $validated['zip_code'] ?? null,
            ]
        );

        return redirect()->route('mis-users')->with('success', 'User updated successfully.');
    }
}
