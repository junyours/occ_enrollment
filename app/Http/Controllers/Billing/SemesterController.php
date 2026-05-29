<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\BillingSemester;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SemesterController extends Controller
{
    public function semester()
    {
        return Inertia::render('billing/semester');
    }

    public function getSemester(Request $request)
    {
        $search = $request->search;

        $semesters = BillingSemester::select('id', 'semester_name')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where("semester_name", "like", "%{$search}%");
                });
            })
            ->paginate(50);

        return response()->json($semesters);
    }

    public function addSemester(Request $request)
    {
        $request->validate([
            'semester_name' => ['required', 'unique:billing_semesters,semester_name']
        ]);

        BillingSemester::create([
            'semester_name' => $request->semester_name
        ]);
    }

    public function updateSemester(Request $request, $id)
    {
        $semester = BillingSemester::findOrFail($id);

        $request->validate([
            'semester_name' => ['required', 'unique:billing_semesters,semester_name,' . $id]
        ]);

        $semester->update([
            'semester_name' => $request->semester_name
        ]);
    }
}
