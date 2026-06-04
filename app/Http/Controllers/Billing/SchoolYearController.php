<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\BillingSchoolYear;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SchoolYearController extends Controller
{
    public function schoolYear()
    {
        return Inertia::render('billing/school-year');
    }

    public function getSchoolYear(Request $request)
    {
        $search = $request->search;

        $school_years = BillingSchoolYear::select('id', 'school_year_name')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where("school_year_name", "like", "%{$search}%");
                });
            })
            ->orderByDesc('school_year_name')
            ->paginate(50);

        return response()->json($school_years);
    }

    public function addSchoolYear(Request $request)
    {
        $request->validate([
            'school_year_name' => ['required', 'unique:billing_school_years,school_year_name']
        ]);

        BillingSchoolYear::create([
            'school_year_name' => $request->school_year_name
        ]);
    }

    public function updateSchoolYear(Request $request, $id)
    {
        $school_year = BillingSchoolYear::findOrFail($id);

        $request->validate([
            'school_year_name' => ['required', 'unique:billing_school_years,school_year_name,' . $id]
        ]);

        $school_year->update([
            'school_year_name' => $request->school_year_name
        ]);
    }
}
