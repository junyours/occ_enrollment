<?php

namespace App\Http\Controllers\Room;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
}
