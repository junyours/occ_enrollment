<?php

namespace App\Http\Controllers\Curriculum;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Curriculum;
use App\Models\CurriculumTerm;
use App\Models\Faculty;
use App\Models\YearLevel;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurriculumController extends Controller
{
    public function view()
    {
        return Inertia::render('Curriculum/CoursesCurriculumLists');
    }

    public function getCoursesCurriculum(Request $request)
    {
        $user = $request->user();

        $deptId = Faculty::where("faculty_id", "=", $user->id)->first()->department_id;

        return Course::where("department_id", "=", $deptId)
            ->select("*")
            ->addSelect(DB::raw("MD5(course.id) as hashed_course_id"))
            ->with("Curriculum")
            ->get();
    }

    public function CurriculumInfoView()
    {
        return Inertia::render('Curriculum/CurriculumInfo');
    }

    public function getCurriculumInfo($courseId, $schoolYear)
    {
        $years = explode('-', $schoolYear);

        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $courseId)
            ->first();

        $curriculumId = Curriculum::select('curriculum.id')
            ->where('curriculum.course_id', '=', $course->id)
            ->where('curriculum.school_year_start', '=', $years[0])
            ->where('curriculum.school_year_end', '=', $years[1])
            ->first()->id;

        $curData = Curriculum::where('id', '=', $curriculumId)
            ->with('CurriculumTerm.Semester')
            ->with('CurriculumTerm.YearLevel')
            ->with('CurriculumTerm.CurriculumTermSubject.PreRequisiteSubjects')
            ->with('CurriculumTerm.CurriculumTermSubject.Subject')
            ->get();

        return response([
            'curriculum' => $curData,
            'course_id' => $courseId,
            'curriculum_id' => $curriculumId,
            'course_info' => $course
        ]);
    }

    public function addSemester(Request $request)
    {
        CurriculumTerm::create([
            'semester_id' => $request->semester_id,
            'year_level_id' => $request->year_level_id,
            'curriculum_id' => $request->curr_id,
        ]);
    }

    public function getCourseActiveCurriculum(Request $request)
    {
        $activeCurrs = YearLevel::select(
            'year_level.year_level',
            DB::raw('MAX(curriculum.id) as curriculum_id') // Get latest curriculum ID per year level
        )
            ->leftJoin('curriculum_term', function ($join) {
                $join->on('curriculum_term.year_level_id', '=', 'year_level.id')
                    ->where('curriculum_term.active', 1);
            })
            ->leftJoin('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
            ->where(function ($query) use ($request) {
                $query->where('curriculum.course_id', '=', $request->courseId)
                    ->orWhereNull('curriculum.course_id'); // Include year levels without curriculum terms
            })
            ->groupBy('year_level.id', 'year_level.year_level') // Group by year level
            ->pluck('curriculum_id', 'year_level.year_level'); // Converts result to key-value format

        $curriculums = Curriculum::where('course_id', '=', $request->courseId)
            ->get();

        return response([
            'active_currs' => $activeCurrs,
            'curriculums' => $curriculums,
        ]);
    }

    public function setCurriculumTermActive(Request $request)
    {
        CurriculumTerm::where('year_level_id', '=', $request->yearLevel)
            ->join('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
            ->where('curriculum.course_id', '=', $request->courseId)
            ->update(['active' => 0]);

        CurriculumTerm::where('year_level_id', '=', $request->yearLevel)
            ->join('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
            ->where('curriculum.id', '=', $request->curriculumId)
            ->update(['active' => 1]);
    }
}
