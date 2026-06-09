<?php

namespace App\Http\Controllers\Guidance;

use Inertia\Inertia;
use App\Models\Faculty;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;


class ProgramHeadController extends Controller
{


    public function facultyReport($schoolYearId, Request $request)
    {
        $userId = Auth::id();

        // Get logged-in PH faculty info
        $phInfo = Faculty::where('faculty_id', $userId)->first();

        // Get the school year and semester
        $schoolYear = DB::table('school_years as sy')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('sy.id', $schoolYearId)
            ->select('sy.*', 's.semester_name')
            ->first();

        if (!$schoolYear) {
            abort(404, 'School year not found');
        }

        $search = strtolower($request->input('search', ''));
        $departmentId = $request->input('department', $phInfo->department_id); // default to PH faculty department
        $semester = $request->query('semester', $schoolYear->semester_name);

        // Build faculty query
        $query = Faculty::select(
            'users.id',
            'user_id_no',
            'user_role',
            'email_address',
            'user_information.first_name',
            'user_information.middle_name',
            'user_information.last_name',
            'department.department_name',
            'faculty.active'
        )
            ->join('users', 'users.id', '=', 'faculty.faculty_id')
            ->leftJoin('user_information', 'user_information.user_id', '=', 'users.id')
            ->join('department', 'department.id', '=', 'faculty.department_id')
            ->join('year_section_subjects as yss', 'faculty.faculty_id', '=', 'yss.faculty_id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->join('school_years as sy', 'ys.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('sy.id', $schoolYear->id)
            ->where('s.semester_name', $semester)
            ->where('faculty.department_id', $departmentId)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereRaw("LOWER(CONCAT(user_information.last_name, ', ', user_information.first_name, ' ', COALESCE(user_information.middle_name, ''))) LIKE ?", ["%{$search}%"])
                        ->orWhere('email_address', 'like', "%{$search}%")
                        ->orWhere('user_id_no', 'like', "%{$search}%");
                });
            })
            ->groupBy(
                'users.id',
                'user_id_no',
                'user_role',
                'email_address',
                'user_information.first_name',
                'user_information.middle_name',
                'user_information.last_name',
                'department.department_name',
                'faculty.active'
            )
            ->orderBy('user_information.last_name', 'asc')
            ->orderBy('user_information.first_name', 'asc');

        $perPage = $request->input('per_page', 100);

        $faculty = $query->paginate($perPage)->withQueryString();

        // Get departments for filter dropdown
        $departments = DB::table('department')->select('id', 'department_name')->get();

        // Pass it to the Inertia page
        return Inertia::render('Guidance/PH_Eval_Result/PHFacultyList', [
            'faculty' => $faculty,
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'departments' => $departments,
            'filters' => [
                'department' => $departmentId,
                'search' => $search,
            ]
        ]);
    }

    public function phfacultySubjects($facultyId, $schoolYearId, Request $request)
    {
        // Load school year + semester
        $schoolYear = DB::table('school_years as sy')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('sy.id', $schoolYearId)
            ->select('sy.*', 's.semester_name')
            ->first();

        if (!$schoolYear) {
            abort(404, 'School year not found');
        }

        /**
         * STEP 1 – Get subjects handled by this faculty in this school year
         * ✅ EXCLUDE DROPPED for representative student_subject_id
         */
        $subjects = DB::table('year_section_subjects as yss')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->join('student_subjects as ss', 'yss.id', '=', 'ss.year_section_subjects_id')
            ->where('yss.faculty_id', $facultyId)
            ->where('ys.school_year_id', $schoolYearId)
            ->where('ss.dropped', 0)
            ->select(
                's.id as subject_id',
                's.subject_code',
                's.descriptive_title',
                DB::raw('MIN(ss.id) as student_subject_id')
            )
            ->groupBy('s.id', 's.subject_code', 's.descriptive_title')
            ->get();

        /**
         * STEP 2 – Compute rating per subject (NEW FORMULA + 50% rule + dropped excluded)
         */
        foreach ($subjects as $subject) {

            // A) related student_subject IDs (EXCLUDE DROPPED)
            $relatedIds = DB::table('student_subjects as ss')
                ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
                ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
                ->where('yss.faculty_id', $facultyId)
                ->where('yss.subject_id', $subject->subject_id)
                ->where('ys.school_year_id', $schoolYearId)
                ->where('ss.dropped', 0)
                ->pluck('ss.id');

            $subject->student_subject_count = $relatedIds->count();

            if ($relatedIds->isEmpty()) {
                $subject->overall_average = null;
                $subject->total_students_handled = 0;
                $subject->total_respondents = 0;
                $subject->response_rate = 0;
                $subject->is_valid_evaluation = false;
                continue;
            }

            // B) total students handled (EXCLUDE DROPPED)
            $totalStudents = DB::table('student_subjects as ss')
                ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
                ->whereIn('ss.id', $relatedIds)
                ->where('ss.dropped', 0)
                ->distinct()
                ->count('es.student_id');

            $subject->total_students_handled = $totalStudents;

            if ($totalStudents === 0) {
                $subject->overall_average = null;
                $subject->total_respondents = 0;
                $subject->response_rate = 0;
                $subject->is_valid_evaluation = false;
                continue;
            }

            // C) respondents (EXCLUDE DROPPED) + ✅ 50% rule
            $respondents = DB::table('student_answers as sa')
                ->join('student_subjects as ss', 'ss.id', '=', 'sa.student_subject_id')
                ->whereIn('sa.student_subject_id', $relatedIds)
                ->where('ss.dropped', 0)
                ->distinct()
                ->count('sa.student_id');

            $responseRate = $totalStudents > 0 ? ($respondents / $totalStudents) : 0;
            $isValid = $responseRate >= 0.50;

            $subject->total_respondents = $respondents;
            $subject->response_rate = round($responseRate * 100, 2); // percent
            $subject->is_valid_evaluation = $isValid;

            // if not valid, do not compute rating
            if (!$isValid) {
                $subject->overall_average = null;
                continue;
            }

            // D) answers (NEW FORMULA denominator = totalStudents handled)
            $answers = DB::table('student_answers as sa')
                ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
                ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
                ->whereIn('sa.student_subject_id', $relatedIds)
                ->where('eq.evaluation_session_id', function ($q) use ($schoolYearId) {
                    $q->select('id')
                        ->from('evaluation')
                        ->where('school_year_id', $schoolYearId)
                        ->latest('start_date')
                        ->limit(1);
                })
                ->select('c.id as criteria_id', 'eq.id as question_id', 'sa.rating')
                ->get();

            if ($answers->isEmpty()) {
                $subject->overall_average = null;
                continue;
            }

            $criteriaGrouped = $answers->groupBy('criteria_id')->map(function ($group) use ($totalStudents) {
                $questionAverages = $group->groupBy('question_id')->map(function ($qGroup) use ($totalStudents) {
                    $sumRatings = $qGroup->sum('rating');
                    return $totalStudents ? round($sumRatings / $totalStudents, 2) : 0;
                })->values();

                return round($questionAverages->avg(), 2);
            })->values();

            $subject->overall_average = round($criteriaGrouped->avg(), 2);
        }

        /**
         * STEP 3 – Overall rating across VALID subjects only
         */
        $validSubjects = collect($subjects)->filter(
            fn($s) =>
            !empty($s->is_valid_evaluation) && $s->overall_average !== null && $s->overall_average > 0
        );

        $overallRating = $validSubjects->count()
            ? round($validSubjects->avg('overall_average'), 2)
            : null;

        // STEP 4 – faculty info
        $faculty = DB::table('users as u')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->leftJoin('faculty as f', 'u.id', '=', 'f.faculty_id')
            ->leftJoin('department as d', 'f.department_id', '=', 'd.id')
            ->where('u.id', $facultyId)
            ->select('u.id', 'ui.first_name', 'ui.last_name', 'ui.middle_name', 'd.department_name')
            ->first();

        return Inertia::render('Guidance/PH_Eval_Result/PhFacultySubjects', [
            'faculty'       => $faculty,
            'schoolYear'    => $schoolYear,
            'schoolYearId'  => $schoolYearId,
            'subjects'      => $subjects,
            'overallRating' => $overallRating,
        ]);
    }

    public function phEvaluationResult($facultyId, $studentSubjectId, $schoolYearId)
    {
        // Step 1: Get subject info
        $subjectInfo = DB::table('student_subjects as ss')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->where('ss.id', $studentSubjectId)
            ->select('s.id as subject_id', 's.subject_code', 's.descriptive_title')
            ->first();

        if (!$subjectInfo) abort(404, 'Subject not found.');

        // Step 2: Get all student_subject_ids with same faculty & subject
        // ✅ EXCLUDE DROPPED (same as new formula)
        $relatedStudentSubjectIds = DB::table('student_subjects as ss')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->where('yss.faculty_id', $facultyId)
            ->where('s.id', $subjectInfo->subject_id)
            ->where('ss.dropped', 0)
            ->pluck('ss.id');

        // Step 3: Get evaluation for that school year
        $evaluation = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as sem', 'sy.semester_id', '=', 'sem.id')
            ->where('e.school_year_id', $schoolYearId)
            ->latest('e.start_date')
            ->select('e.*', 'sy.start_year', 'sy.end_year', 'sem.semester_name')
            ->first();

        if (!$evaluation) {
            return Inertia::render('Guidance/PH_Eval_Result/phEvaluationResult', [
                'faculty' => null,
                'subject' => null,
                'evaluation' => null,
                'criteria' => [],
                'overallAverage' => null,
                'totalRespondents' => 0,
                'totalStudentsHandled' => 0,
                'responseRate' => 0,
                'isValidEvaluation' => false,
                'schoolYear' => null,
                'feedback' => [],
                'message' => 'Evaluation has not yet started.',
            ]);
        }

        // Step 4: Total students handled (EXCLUDE DROPPED)
        $totalStudents = DB::table('student_subjects as ss')
            ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
            ->whereIn('ss.id', $relatedStudentSubjectIds)
            ->where('ss.dropped', 0)
            ->distinct()
            ->count('es.student_id');

        // Step 5: Get all answers with criteria + question (for this eval session)
        $answers = DB::table('student_answers as sa')
            ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
            ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
            ->whereIn('sa.student_subject_id', $relatedStudentSubjectIds)
            ->where('eq.evaluation_session_id', $evaluation->id)
            ->select(
                'c.id as criteria_id',
                'c.title as criteria_title',
                'eq.id as question_id',
                'eq.question_text',
                'sa.rating'
            )
            ->get();

        // Step 6: Respondents count (EXCLUDE DROPPED) + ✅ 50% rule
        $respondents = DB::table('student_answers as sa')
            ->join('student_subjects as ss', 'ss.id', '=', 'sa.student_subject_id')
            ->whereIn('sa.student_subject_id', $relatedStudentSubjectIds)
            ->where('ss.dropped', 0)
            ->distinct()
            ->count('sa.student_id');

        $responseRate = $totalStudents > 0 ? ($respondents / $totalStudents) : 0;
        $isValidEvaluation = $responseRate >= 0.50;

        // Step 7: Group answers per criteria and question using ✅ NEW FORMULA
        // question avg = sum(rating) / totalStudentsHandled
        // criteria avg = avg(question avgs)
        // overall avg  = avg(criteria avgs)
        $criteriaGrouped = $answers->groupBy('criteria_id')->map(function ($group, $criteriaId) use ($totalStudents) {
            $criteriaTitle = $group->first()->criteria_title;

            $questions = $group->groupBy('question_id')->map(function ($qGroup, $questionId) use ($totalStudents) {
                $sumRatings = $qGroup->sum('rating');
                $avgRating = $totalStudents ? round($sumRatings / $totalStudents, 2) : 0;

                return [
                    'question_id' => $questionId,
                    'question_text' => $qGroup->first()->question_text,
                    'average' => $avgRating,
                ];
            })->values();

            $criteriaAvg = $questions->avg('average');

            return [
                'criteria_id' => $criteriaId,
                'criteria_title' => $criteriaTitle,
                'questions' => $questions,
                'average' => round($criteriaAvg, 2),
            ];
        })->values();

        // Step 8: Overall average
        // ✅ If NOT valid, force overallAverage = null (consistent with ranking/subjects page)
        $overallAverage = $isValidEvaluation ? round($criteriaGrouped->avg('average'), 2) : null;

        // Step 9: School year info
        $schoolYear = [
            'start_year' => $evaluation->start_year,
            'end_year' => $evaluation->end_year,
            'semester' => $evaluation->semester_name,
            'formatted' => 'S.Y. ' . $evaluation->start_year . '-' . $evaluation->end_year . ' (' . $evaluation->semester_name . ')',
        ];

        // Step 10: Faculty info
        $faculty = DB::table('users as u')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->where('u.id', $facultyId)
            ->select('u.id', 'ui.first_name', 'ui.last_name', 'ui.middle_name')
            ->first();

        // Step 11: Feedback (unchanged, but ✅ exclude dropped)
        $feedback = DB::table('evaluation_feedback as ef')
            ->join('student_subjects as ss', 'ef.student_subject_id', '=', 'ss.id')
            ->whereIn('ef.student_subject_id', $relatedStudentSubjectIds)
            ->where('ss.dropped', 0)
            ->select('ef.strengths', 'ef.weaknesses', 'ef.anonymous', 'ef.created_at')
            ->orderByDesc('ef.created_at')
            ->get();

        return Inertia::render('Guidance/PH_Eval_Result/phEvaluationResult', [
            'faculty' => $faculty,
            'subject' => $subjectInfo,
            'evaluation' => $evaluation,
            'criteria' => $criteriaGrouped,
            'overallAverage' => $overallAverage,
            'totalRespondents' => $respondents,
            'totalStudentsHandled' => $totalStudents,
            'responseRate' => $responseRate,           // ✅ added
            'isValidEvaluation' => $isValidEvaluation, // ✅ added
            'schoolYear' => $schoolYear,
            'feedback' => $feedback,
            'message' => null,
        ]);
    }


    // 1. Create a reusable private method for the query
    private function getSchoolYearsWithEval()
    {
        return DB::table('evaluation as e')
            ->join('school_years as sy', 'sy.id', '=', 'e.school_year_id')
            ->join('semesters as sem', 'sem.id', '=', 'sy.semester_id')
            ->select(
                'sy.id',
                DB::raw("CONCAT(sy.start_year, '-', sy.end_year) as school_year"),
                'sem.semester_name',
                'e.start_date',
                'e.end_date',
                'e.status'
            )
            ->groupBy(
                'sy.id',
                'sy.start_year',
                'sy.end_year',
                'sem.semester_name',
                'e.start_date',
                'e.end_date',
                'e.status'
            )
            ->orderBy('sy.start_year', 'desc')
            ->orderBy('sem.id', 'desc')
            ->get();
    }


    public function evalResult()
    {
        return Inertia::render('Guidance/Archive/EvalResult', [
            'title' => 'Evaluation Result',
            'schoolYears' => $this->getSchoolYearsWithEval(),
        ]);
    }


    public function phFacultyReport()
    {
        return Inertia::render('Guidance/PH_Eval_Result/PHFacultyReport', [
            'title' => 'PH Faculty Evaluation Report',
            'schoolYears' => $this->getSchoolYearsWithEval(),
        ]);
    }
}
