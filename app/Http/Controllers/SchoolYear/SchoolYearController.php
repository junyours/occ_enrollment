<?php

namespace App\Http\Controllers\SchoolYear;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use App\Models\Semester;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SchoolYearController extends Controller
{
    public function view()
    {
        return Inertia::render('SchoolYear/SchoolYear');
    }

    public function schoolYears()
    {
        $today = Carbon::now();

        $today = Carbon::now()->toDateString();
        $twoWeeksAfterToday = Carbon::now()->addWeeks(2)->toDateString();

        $schoolYear = SchoolYear::select(
            'school_years.id',
            'semester_id',
            'start_year',
            'end_year',
            'start_date',
            'end_date',
            'is_current',
            'semester_name',
            DB::raw("CASE
            WHEN '$today' BETWEEN start_date AND end_date
            THEN true
            ELSE false
         END as enrollment_ongoing"),
            DB::raw("CASE
            WHEN '$today' >= start_date AND '$today' <= '$twoWeeksAfterToday'
            THEN true
            ELSE false
         END as preparation")
        )
            ->join('semesters', 'school_years.semester_id', '=', 'semesters.id')
            ->orderBy('school_years.created_at', 'desc')
            ->get();

        return response()->json($schoolYear, 200);
    }

    public function addSchoolYear(Request $request)
    {
        $schoolYear = SchoolYear::create([
            'semester_id' => $request->semester_id,
            'start_year' => $request->start_year,
            'end_year' => $request->end_year,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'is_current' => $request->is_current,
        ]);

        if ($schoolYear->is_current) {
            SchoolYear::whereNot('id', '=',  $schoolYear->id)
                ->update(['is_current' => 0]);
        }

        return response()->json(['message' => 'success'], 200);
    }

    public function editSchoolYear(Request $request, $id)
    {
        if ($request->is_current) {
            SchoolYear::whereNot('id', '=',  $id)
                ->update(['is_current' => 0]);
        }

        SchoolYear::where('id', $id)->update([
            'semester_id' => $request->semester_id,
            'start_year' => $request->start_year,
            'end_year' => $request->end_year,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'is_current' => $request->is_current,
        ]);

        return response()->json(['message' => 'success'], 200);
    }
}
