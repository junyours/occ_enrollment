<?php

namespace App\Http\Controllers\Room;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RoomController extends Controller
{
    public function getOwnDepartmentRooms()
    {
        $userId = Auth::user()->id;

        $deptId = Faculty::select('department_id')
            ->where('faculty_id', '=', $userId)
            ->first()->department_id;

        return Room::select('id', 'room_name')
            ->where('department_id', '=', $deptId)
            ->orderBy('room_name', 'ASC')
            ->get();
    }

    public function view()
    {
        return Inertia::render('Rooms/Rooms');
    }

    public function rooms()
    {
        $rooms = Room::select("rooms.id", "rooms.room_name", "department.department_name_abbreviation", "department_id")
            ->leftJoin('department', 'rooms.department_id', '=', 'department.id')
            ->get();

        $depatments = Department::select("id", "department_name_abbreviation")->get();

        return response(['rooms' => $rooms, 'department' => $depatments]);
    }

    public function edit($id, Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'nullable|exists:department,id',
        ]);

        Room::where('id', '=', $id)->update([
            'department_id' => $validated['department_id'],
        ]);

        return response()->json(['message' => 'success'], 200);
    }

    public function add(Request $request)
    {
        $request->validate([
            'room_name' => 'required|string|max:255'
        ]);

        $roomExist = Room::where('room_name', $request->room_name)->first();

        if ($roomExist) {
            return back()->withErrors([
                'room_name' => 'Room name already exists.',
            ]);
        }

        Room::create([
            'room_name' => $request->room_name
        ]);
    }
}
