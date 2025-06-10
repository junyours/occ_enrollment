<?php

namespace App\Http\Controllers\Curriculum;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Curriculum;
use App\Models\CurriculumTerm;
use App\Models\CurriculumTermSubject;
use App\Models\Faculty;
use App\Models\Subject;
use App\Models\YearLevel;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;

class CurriculumController extends Controller
{
    public function view()
    {
        return Inertia::render('Curriculum/CoursesCurriculumLists', []);
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

    public function CurriculumInfoView($courseId, $schoolYear)
    {
        $years = explode('-', $schoolYear);

        $courseRecord = Course::where(DB::raw('MD5(id)'), '=', $courseId)
            ->first();

        if (!$courseRecord) {
            // Handle case where course is not found
            abort(404, 'Course not found');
        }

        $course = Course::find($courseRecord->id);

        if (!$course) {
            abort(404, 'Course not found');
        }

        return Inertia::render('Curriculum/CurriculumInfo', [
            'course_name' => $course->course_name,
            'course_name_abbreviation' => $course->course_name_abbreviation,
            'years' => $years
        ]);
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


    public function addSchoolYear(Request $request)
    {
        // You already have course_id as MD5(id), so match on that
        $exist = Curriculum::where('course_id', $request->course_id)
            ->where('school_year_start', $request->school_year_start)
            ->where('school_year_end', $request->school_year_end)
            ->first();

        if ($exist) {
            return Redirect::back()->withErrors([
                'school_year' => 'This curriculum school year already existed.'
            ]);
        }

        // Save the curriculum
        Curriculum::create([
            'course_id' => $request->course_id,
            'school_year_start' => $request->school_year_start,
            'school_year_end' => $request->school_year_end,
        ]);

        // Format the school year range
        $schoolYear = $request->school_year_start . '-' . $request->school_year_end;

        $course = Course::addSelect(DB::raw("MD5(course.id) as hashed_course_id"))
            ->where('id', '=', $request->course_id)
            ->first();

        // Redirect to curriculum view
        return Redirect::to("/curriculum/{$course->hashed_course_id}/{$schoolYear}");
    }

    public function addSubject(Request $request)
    {
        $subjectExist = Subject::where('subject_code', '=', $request->subject_code)->first();

        if (!$subjectExist) {
            // Create new subject if it doesn't exist
            $subject = Subject::create([
                'subject_code' => $request->subject_code,
                'descriptive_title' => $request->descriptive_title,
                'credit_units' => $request->credit_units,
                'lecture_hours' => $request->lecture_hours,
                'laboratory_hours' => $request->laboratory_hours,
            ]);

            $subjectId = $subject->id;
        } else {
            // Use existing subject
            $subjectId = $subjectExist->id;
        }

        // Check if this curriculum term subject combination already exists
        $curriculumTermSubjectExists = CurriculumTermSubject::where('curriculum_term_id', $request->curriculum_term_id)
            ->where('subject_id', $subjectId)
            ->exists();

        if (!$curriculumTermSubjectExists) {
            CurriculumTermSubject::create([
                'curriculum_term_id' => $request->curriculum_term_id,
                'subject_id' => $subjectId,
            ]);
        }
    }
}
