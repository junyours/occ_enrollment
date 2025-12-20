<?php

namespace App\Http\Controllers\VPAA;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Faculty;
use App\Models\Department;
use App\Models\Criteria;
use App\Models\UserInformation;
use App\Models\Question;
use App\Models\Evaluation;
use App\Models\SchoolYear;
use App\Models\StudentDraft;
use App\Models\StudentAnswer;
use App\Models\EvaluationFeedback;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use App\Models\EnrolledStudent;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\User;

class VPAAController extends Controller
{
    public function vpaadashboard()
    {
          // 1️⃣ Check for an ACTIVE evaluation
        $activeEval = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('e.status', 'active')
            ->select(
                'e.id as eval_id',
                'sy.id as sy_id',
                'sy.start_year',
                'sy.end_year',
                'sy.is_current',
                's.semester_name'
            )
            ->first();

        // 2️⃣ If NO active evaluation → use CURRENT school year
        if ($activeEval) {
            $schoolYearId = $activeEval->sy_id;
            $schoolYear = SchoolYear::with('semester')->find($schoolYearId);
        } else {
            $schoolYear = SchoolYear::where('is_current', 1)
                ->with('semester')
                ->first();

            if (!$schoolYear) {
                return back()->with('error', 'No current school year found.');
            }

            $schoolYearId = $schoolYear->id;
        }

        // 3️⃣ TOTAL ENROLLED based on selected school year
        $totalEnrolled = EnrolledStudent::whereHas('yearSection', function ($query) use ($schoolYearId) {
            $query->where('school_year_id', $schoolYearId);
        })->count();

        // 4️⃣ FACULTY COUNT based on selected school year
        $facultyCount = DB::table('faculty as f')
            ->join('users as u', 'f.faculty_id', '=', 'u.id')
            ->join('year_section_subjects as yss', 'u.id', '=', 'yss.faculty_id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->where('ys.school_year_id', $schoolYearId)
            ->distinct('u.id')
            ->count('u.id');

        // 5️⃣ COMPUTE Submitted vs Unsubmitted Evaluation Counts
        $results = DB::table(DB::raw("(
        SELECT
            es.student_id,
            SUM(CASE WHEN sa.id IS NOT NULL THEN 1 ELSE 0 END) AS evaluated_subjects,
            COUNT(ss.id) AS total_subjects,
            CASE
                WHEN SUM(CASE WHEN sa.id IS NOT NULL THEN 1 ELSE 0 END) = COUNT(ss.id)
                    THEN 'submitted'
                ELSE 'unsubmitted'
            END AS evaluation_status
        FROM enrolled_students es
        JOIN year_section ys
            ON es.year_section_id = ys.id
        JOIN student_subjects ss
            ON ss.enrolled_students_id = es.id
        LEFT JOIN student_answers sa
            ON sa.student_subject_id = ss.id
            AND sa.student_id = es.student_id
        WHERE ys.school_year_id = {$schoolYearId}
        GROUP BY es.student_id
    ) AS t"))
            ->selectRaw("
            SUM(t.evaluation_status = 'submitted') AS submitted_count,
            SUM(t.evaluation_status = 'unsubmitted') AS unsubmitted_count
        ")
            ->first();


        // Get faculty list
        $faculties = DB::table('faculty as f')
            ->join('users as u', 'f.faculty_id', '=', 'u.id')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->leftJoin('department as d', 'f.department_id', '=', 'd.id')
            ->join('year_section_subjects as yss', 'u.id', '=', 'yss.faculty_id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->where('ys.school_year_id', $schoolYearId)
            ->select(
                'u.id',
                'ui.first_name',
                'ui.middle_name',
                'ui.last_name',
                'd.department_name'
            )
            ->groupBy('u.id', 'ui.first_name', 'ui.middle_name', 'ui.last_name', 'd.department_name')
            ->get();

        $ranking = [];

        foreach ($faculties as $faculty) {
            // Get subjects handled by this faculty
            $subjects = DB::table('year_section_subjects as yss')
                ->join('subjects as s', 'yss.subject_id', '=', 's.id')
                ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
                ->join('student_subjects as ss', 'yss.id', '=', 'ss.year_section_subjects_id')
                ->where('yss.faculty_id', $faculty->id)
                ->where('ys.school_year_id', $schoolYearId)
                ->select('s.id as subject_id', DB::raw('MIN(ss.id) as student_subject_id'))
                ->groupBy('s.id')
                ->get();

            $totalWeightedRating = 0;
            $totalStudents = 0;

            foreach ($subjects as $subject) {
                $relatedIds = DB::table('student_subjects as ss')
                    ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
                    ->where('yss.faculty_id', $faculty->id)
                    ->where('yss.subject_id', $subject->subject_id)
                    ->whereIn('yss.year_section_id', function ($query) use ($schoolYearId) {
                        $query->select('id')->from('year_section')->where('school_year_id', $schoolYearId);
                    })
                    ->pluck('ss.id');

                if ($relatedIds->isEmpty()) continue;

                // Total enrolled students for weighting
                $subjectStudents = DB::table('student_subjects as ss')
                    ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
                    ->whereIn('ss.id', $relatedIds)
                    ->distinct('es.student_id')
                    ->count('es.student_id');

                if ($subjectStudents === 0) continue;

                // Answers for this subject
                $answers = DB::table('student_answers as sa')
                    ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
                    ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
                    ->whereIn('sa.student_subject_id', $relatedIds)
                    ->where('eq.evaluation_session_id', $activeEval->eval_id ?? 0)
                    ->select('c.id as criteria_id', 'eq.id as question_id', 'sa.rating')
                    ->get();

                if ($answers->isEmpty()) continue;

                $criteriaGrouped = $answers->groupBy('criteria_id')->map(function ($group) use ($subjectStudents) {
                    $questions = $group->groupBy('question_id')->map(function ($qGroup) use ($subjectStudents) {
                        $sumRatings = $qGroup->sum('rating');
                        $avgRating = $subjectStudents ? $sumRatings / $subjectStudents : 0;
                        return round($avgRating, 2);
                    })->values();

                    return round($questions->avg(), 2); // criteria average
                })->values();

                $subjectAverage = round($criteriaGrouped->avg(), 2);

                $totalWeightedRating += $subjectAverage * $subjectStudents;
                $totalStudents += $subjectStudents;
            }

            $overallRating = $totalStudents > 0 ? round($totalWeightedRating / $totalStudents, 2) : null;

            $ranking[] = [
                'id' => $faculty->id,
                'full_name' => "{$faculty->last_name}, {$faculty->first_name} {$faculty->middle_name}",
                'department_name' => $faculty->department_name ?? 'N/A',
                'overall_rating' => $overallRating,
            ];
        }

        // Sort for ranking
        $ranking = collect($ranking)
            ->sortByDesc('overall_rating')
            ->values()
            ->all();

        // INSIGHTS (Highest, Lowest, Average, etc.)
        $ratingsOnly = collect($ranking)
            ->whereNotNull('overall_rating')
            ->pluck('overall_rating');

        $insights = [
            'highest_rating' => $ratingsOnly->max(),
            'lowest_rating'  => $ratingsOnly->min(),
            'average_rating' => $ratingsOnly->isEmpty() ? null : round($ratingsOnly->avg(), 2),
            'total_faculty'  => count($ranking),
            'evaluated_faculty' => $ratingsOnly->count(),
            'unevaluated_faculty' => count($ranking) - $ratingsOnly->count(),
            'top5' => array_slice($ranking, 0, 5),
        ];


         // STUDENTS PER DEPARTMENT INSIGHTS
        $departmentStats = DB::table('enrolled_students as es')
            ->join('year_section as ys', 'es.year_section_id', '=', 'ys.id')
            ->join('course as c', 'ys.course_id', '=', 'c.id')
            ->join('department as d', 'c.department_id', '=', 'd.id')
            ->leftJoin('student_subjects as ss', 'es.id', '=', 'ss.enrolled_students_id')
            ->leftJoin('student_answers as sa', function ($join) {
                $join->on('sa.student_subject_id', '=', 'ss.id')
                    ->on('sa.student_id', '=', 'es.student_id');
            })
            ->where('ys.school_year_id', $schoolYearId)
            ->groupBy('es.id', 'd.department_name')
            ->select(
            'd.department_name_abbreviation as department',
                'es.id as student_id',
                DB::raw('COUNT(ss.id) as total_subjects'),
                DB::raw('COUNT(sa.id) as evaluated_subjects'),
                DB::raw('CASE WHEN COUNT(ss.id) > 0 AND COUNT(sa.id) = COUNT(ss.id) THEN "Completed" ELSE "Pending" END as status')
            )
            ->get()
            ->groupBy('department') // group by department in Laravel Collection
            ->map(function ($students, $dept) {
                $total = $students->count();
                $completed = $students->where('status', 'Completed')->count();
                $pending = $students->where('status', 'Pending')->count();
                return [
                    'department' => $dept,
                    'total_students' => $total,
                    'completed' => $completed,
                    'pending' => $pending,
                    'completed_percentage' => $total ? round($completed / $total * 100, 2) : 0,
                    'pending_percentage' => $total ? round($pending / $total * 100, 2) : 0,
                ];
            })->values();



        // ------------------------------------------------------------------

        return Inertia::render('vpaa/VPAADashboard', [
            'activeEval'       => $activeEval,
            'schoolYear'       => $schoolYear,
            'title'            => 'Guidance Dashboard',
            'totalEnrolled'    => $totalEnrolled,
            'facultyCount'     => $facultyCount,
            'submittedCount'   => $results->submitted_count,
            'unsubmittedCount' => $results->unsubmitted_count,

            'reports' => [
                'all'    => $ranking,
                'top5'   => $insights['top5'],    // keep top 5
                'highest_rating' => $insights['highest_rating'],
                'lowest_rating'  => $insights['lowest_rating'],
                'average_rating' => $insights['average_rating'],
                'evaluated_faculty' => $insights['evaluated_faculty'],
                'unevaluated_faculty' => $insights['unevaluated_faculty'],
            ],

            'departmentStats' => $departmentStats,
        ]);
    }

    //Faculty List

    public function facultyList(Request $request)
    {
        /**
         * 1️⃣ Get ACTIVE evaluation based on status = 'active'
         */
        $activeEval = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('e.status', 'active')
            ->select(
                'e.id as eval_id',
                'sy.id as sy_id',
                'sy.start_year',
                'sy.end_year',
                's.semester_name'
            )
            ->first();

        // Handle case when no active evaluation exists
        if (!$activeEval) {
            return Inertia::render('vpaa/FacultyListPage', [
                'faculty' => [],
                'schoolYear' => null,
                'semester' => null,
                'departments' => DB::table('department')->select('id', 'department_name')->get(),
                'filters' => [
                    'department' => '',
                    'search' => '',
                ],
                'noActiveEval' => true,
            ]);
        }

        // 2️⃣ Input filters
        $search = strtolower($request->input('search', ''));
        $departmentId = $request->input('department', '');

        /**
         * 3️⃣ Build faculty query using active evaluation’s school_year_id
         */
        $query = DB::table('faculty as f')
            ->join('users as u', 'f.faculty_id', '=', 'u.id')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->leftJoin('department as d', 'f.department_id', '=', 'd.id')
            ->join('year_section_subjects as yss', 'u.id', '=', 'yss.faculty_id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->join('school_years as sy', 'ys.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('ys.school_year_id', $activeEval->sy_id)
            ->select(
                'u.id',
                'ui.first_name',
                'ui.last_name',
                'ui.middle_name',
                'd.department_name',
                'f.department_id',
                's.semester_name'
            )
            ->selectRaw("CONCAT(ui.last_name, ', ', ui.first_name, ' ', COALESCE(ui.middle_name, '')) as full_name")
            ->groupBy(
                'u.id',
                'ui.first_name',
                'ui.last_name',
                'ui.middle_name',
                'd.department_name',
                'f.department_id',
                's.semester_name'
            );

        // Apply search filter
        if (!empty($search)) {
            $query->whereRaw(
                "LOWER(CONCAT(ui.last_name, ', ', ui.first_name, ' ', COALESCE(ui.middle_name, ''))) LIKE ?",
                ["%{$search}%"]
            );
        }

        // Apply department filter
        if (!empty($departmentId)) {
            $query->where('f.department_id', $departmentId);
        }

        // Order results
        $query->orderBy('ui.last_name', 'asc')
            ->orderBy('ui.first_name', 'asc');

        // Pagination
        $perPage = $request->input('per_page', 100);
        $faculty = $query->paginate($perPage)->withQueryString();

        // Departments for filter dropdown
        $departments = DB::table('department')->select('id', 'department_name')->get();

        /**
         * 4️⃣ Return result using active evaluation SY & semester
         */
        return Inertia::render('vpaa/FacultyListPage', [
            'faculty' => $faculty,
            'schoolYear' => [
                'id' => $activeEval->sy_id,
                'start_year' => $activeEval->start_year,
                'end_year' => $activeEval->end_year,
            ],
            'semester' => $activeEval->semester_name,
            'departments' => $departments,
            'filters' => [
                'department' => $departmentId,
                'search' => $search,
            ],
        ]);
    }

    public function showSubjects($id)
    {
        /**
         * 1️⃣ Get ACTIVE evaluation
         */
        $activeEval = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('e.status', 'active')
            ->select(
                'e.id as eval_id',
                'sy.id as sy_id',
                'sy.start_year',
                'sy.end_year',
                's.semester_name'
            )
            ->first();

        if (!$activeEval) {
            return back()->with('error', 'No active evaluation found.');
        }

        /**
         * 2️⃣ Get subjects handled by faculty for active evaluation's school year
         */
        $subjects = DB::table('year_section_subjects as yss')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->join('student_subjects as ss', 'yss.id', '=', 'ss.year_section_subjects_id')
            ->where('yss.faculty_id', $id)
            ->where('ys.school_year_id', $activeEval->sy_id)
            ->select(
                's.id as subject_id',
                's.subject_code',
                's.descriptive_title',
                DB::raw('MIN(ss.id) as student_subject_id')
            )
            ->groupBy('s.id', 's.subject_code', 's.descriptive_title')
            ->get();

        /**
         * 3️⃣ Compute overall rating for each subject (consistent with facultyEvaluationResult)
         */
        foreach ($subjects as $subject) {
            // 3A: Get all student_subject_ids for this faculty & subject
            $relatedIds = DB::table('student_subjects as ss')
                ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
                ->where('yss.faculty_id', $id)
                ->where('yss.subject_id', $subject->subject_id)
                ->whereIn('yss.year_section_id', function ($query) use ($activeEval) {
                    $query->select('id')
                        ->from('year_section')
                        ->where('school_year_id', $activeEval->sy_id);
                })
                ->pluck('ss.id');

            $subject->student_count = $relatedIds->count();

            if ($relatedIds->isEmpty()) {
                $subject->overall_average = null;
                continue;
            }

            // 3B: Get total enrolled students for weighting
            $totalStudents = DB::table('student_subjects as ss')
                ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
                ->whereIn('ss.id', $relatedIds)
                ->distinct('es.student_id')
                ->count('es.student_id');

            if ($totalStudents === 0) {
                $subject->overall_average = null;
                continue;
            }

            // 3C: Get all answers with criteria and question
            $answers = DB::table('student_answers as sa')
                ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
                ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
                ->whereIn('sa.student_subject_id', $relatedIds)
                ->where('eq.evaluation_session_id', $activeEval->eval_id)
                ->select('c.id as criteria_id', 'eq.id as question_id', 'sa.rating')
                ->get();

            if ($answers->isEmpty()) {
                $subject->overall_average = null;
                continue;
            }

            // 3D: Group answers by criteria and question
            $criteriaGrouped = $answers->groupBy('criteria_id')->map(function ($group) use ($totalStudents) {
                $questions = $group->groupBy('question_id')->map(function ($qGroup) use ($totalStudents) {
                    $sumRatings = $qGroup->sum('rating');
                    $avgRating = $totalStudents ? $sumRatings / $totalStudents : 0;
                    return round($avgRating, 2);
                })->values();

                return round($questions->avg(), 2); // criteria average
            })->values();

            // 3E: Overall average = mean of criteria averages
            $subject->overall_average = round($criteriaGrouped->avg(), 2);
        }

        // 4️⃣ Get faculty info
        $faculty = DB::table('users as u')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->leftJoin('faculty as f', 'u.id', '=', 'f.faculty_id')
            ->leftJoin('department as d', 'f.department_id', '=', 'd.id')
            ->where('u.id', $id)
            ->select('u.id', 'ui.first_name', 'ui.last_name', 'ui.middle_name', 'd.department_name')
            ->first();

        return Inertia::render('vpaa/FacultySubjectsPage', [
            'faculty' => $faculty,
            'subjects' => $subjects,
            'schoolYear' => [
                'start_year' => $activeEval->start_year,
                'end_year' => $activeEval->end_year,
            ],
            'semester' => $activeEval->semester_name,
        ]);
    }

    public function facultyEvaluationResult($facultyId, $studentSubjectId)
    {
        // Step 1: Get subject info
        $subjectInfo = DB::table('student_subjects as ss')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->where('ss.id', $studentSubjectId)
            ->select('s.id as subject_id', 's.subject_code', 's.descriptive_title')
            ->first();

        if (!$subjectInfo) abort(404, 'Subject not found.');

        // Step 2: Get all student_subject_id with same faculty & subject
        $relatedStudentSubjectIds = DB::table('student_subjects as ss')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->where('yss.faculty_id', $facultyId)
            ->where('s.id', $subjectInfo->subject_id)
            ->pluck('ss.id');

        // Step 3: Get evaluation and school year info
        $evaluation = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as sem', 'sy.semester_id', '=', 'sem.id')
            ->where('e.status', 'active')
            ->latest('e.start_date')
            ->select('e.*', 'sy.start_year', 'sy.end_year', 'sem.semester_name')
            ->first();

        if (!$evaluation) {
            return Inertia::render('vpaa /FacultyEvaluationResultPage', [
                'faculty' => null,
                'subject' => null,
                'evaluation' => null,
                'criteria' => [],
                'overallAverage' => null,
                'totalRespondents' => 0,
                'totalStudentsHandled' => 0,
                'schoolYear' => null,
                'feedback' => [],
                'message' => 'Evaluation has not yet started.',
            ]);
        }

        // Step 4: Get total students enrolled
        $totalStudents = DB::table('student_subjects as ss')
            ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
            ->whereIn('ss.id', $relatedStudentSubjectIds)
            ->distinct('es.student_id')
            ->count('es.student_id');

        // Step 5: Get all answers with evaluation question & criteria
        $answers = DB::table('student_answers as sa')
            ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
            ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
            ->whereIn('sa.student_subject_id', $relatedStudentSubjectIds)
            ->where('eq.evaluation_session_id', $evaluation->id)
            ->select('c.id as criteria_id', 'c.title as criteria_title', 'eq.id as question_id', 'eq.question_text', 'sa.rating')
            ->get();

        // Step 6: Group answers per criteria and question
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

        // Step 7: Compute overall average
        $overallAverage = round($criteriaGrouped->avg('average'), 2);

        // Step 8: School year data
        $schoolYear = [
            'start_year' => $evaluation->start_year,
            'end_year' => $evaluation->end_year,
            'semester' => $evaluation->semester_name,
            'formatted' => 'S.Y. ' . $evaluation->start_year . '-' . $evaluation->end_year . ' (' . $evaluation->semester_name . ')',
        ];

        // Step 9: Count unique respondents
        $respondents = DB::table('student_answers')
            ->whereIn('student_subject_id', $relatedStudentSubjectIds)
            ->distinct('student_id')
            ->count('student_id');

        $respondentDetails = DB::table('student_answers AS sa')
            ->join('users AS u', 'u.id', '=', 'sa.student_id')
            ->join('user_information AS ui', 'ui.user_id', '=', 'u.id')
            ->join('student_subjects AS ss', 'ss.id', '=', 'sa.student_subject_id')
            ->join('enrolled_students AS es', 'es.id', '=', 'ss.enrolled_students_id')
            ->whereIn('sa.student_subject_id', $relatedStudentSubjectIds)
            ->select(
                'sa.student_subject_id',
                'sa.student_id',
                'sa.anonymous',
                DB::raw("IF(sa.anonymous = 1, SUBSTRING(MD5(CONCAT(sa.student_subject_id, '-', sa.student_id)), 1, 8), ui.first_name) AS first_name"),
                DB::raw("IF(sa.anonymous = 1, '', ui.last_name) AS last_name"),
                DB::raw("IF(sa.anonymous = 1, '', ui.middle_name) AS middle_name")
            )
            ->distinct()
            ->get();


        // Step 10: Get faculty info
        $faculty = DB::table('users as u')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->where('u.id', $facultyId)
            ->select('u.id', 'ui.first_name', 'ui.last_name', 'ui.middle_name')
            ->first();

        // Step 11: Get feedback from students
        $feedback = DB::table('evaluation_feedback as ef')
            ->join('student_subjects as ss', 'ef.student_subject_id', '=', 'ss.id')
            ->join('users as u', 'u.id', '=', 'ss.enrolled_students_id') // Adjust to match your schema: probably ss.enrolled_students_id
            ->select(
                'ef.strengths',
                'ef.weaknesses',
                'ef.anonymous',
                'ef.student_subject_id',
                'ef.created_at',
                DB::raw("IF(ef.anonymous = 1, 'Anonymous', u.id) AS student_id")
            )
            ->whereIn('ef.student_subject_id', $relatedStudentSubjectIds)
            ->orderByDesc('ef.created_at')
            ->get();



        /*
     * -------------------------------------------------------
     * STEP 12: DETAILED ANSWERS (student → criteria → question)
     * -------------------------------------------------------
     */
        $detailedAnswers = DB::table('student_answers as sa')
            ->join('student_subjects as ss', 'sa.student_subject_id', '=', 'ss.id')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as sub', 'yss.subject_id', '=', 'sub.id')
            ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
            ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
            ->join('users as u', 'sa.student_id', '=', 'u.id')
            ->join('user_information as ui', 'ui.user_id', '=', 'u.id')
            ->whereIn('sa.student_subject_id', $relatedStudentSubjectIds)
            ->where('eq.evaluation_session_id', $evaluation->id)
            ->select(
                'sa.id as answer_id',
                'sa.student_subject_id', // <-- ADD THIS
                'sa.rating',
                'sa.anonymous',
                'sa.student_id',
                'eq.id as question_id',
                'eq.question_text',
                'c.id as criteria_id',
                'c.title as criteria_title',
                'sub.id as subject_id',
                'sub.subject_code',
                'sub.descriptive_title',
                DB::raw("IF(sa.anonymous = 1, SUBSTRING(MD5(CONCAT(sa.student_subject_id, '-', sa.student_id)), 1, 8), ui.first_name) AS first_name"),
                DB::raw("IF(sa.anonymous = 1, '', ui.last_name) AS last_name"),
                DB::raw("IF(sa.anonymous = 1, '', ui.middle_name) AS middle_name")
            )
            ->orderBy('criteria_id')
            ->orderBy('question_id')
            ->get();


        return Inertia::render('vpaa/FacultyEvaluationResultPage', [
            'faculty' => $faculty,
            'subject' => $subjectInfo,
            'evaluation' => $evaluation,
            'criteria' => $criteriaGrouped,
            'overallAverage' => $overallAverage,
            'totalRespondents' => $respondents,
            'totalStudentsHandled' => $totalStudents,
            'schoolYear' => $schoolYear,
            'feedback' => $feedback,
            'respondentDetails' => $respondentDetails,
            'detailedAnswers' => $detailedAnswers, // ← ADDED
        ]);
    }

    public function facultyRanking()
    {
        $activeEval = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('e.status', 'active')
            ->select(
                'e.id as eval_id',
                'sy.id as sy_id',
                'sy.start_year',
                'sy.end_year',
                's.semester_name'
            )
            ->first();

        if (!$activeEval) {
            return Inertia::render('vpaa/Ranking', [
                'hasActiveEval' => false,
                'ranking' => [],
                'schoolYear' => null,
                'semester' => null,
            ]);
        }

        // Get faculties handling subjects in this school year
        $faculties = DB::table('faculty as f')
            ->join('users as u', 'f.faculty_id', '=', 'u.id')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->leftJoin('department as d', 'f.department_id', '=', 'd.id')
            ->join('year_section_subjects as yss', 'u.id', '=', 'yss.faculty_id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->where('ys.school_year_id', $activeEval->sy_id)
            ->select(
                'u.id',
                'ui.first_name',
                'ui.last_name',
                'ui.middle_name',
                'd.department_name'
            )
            ->groupBy('u.id', 'ui.first_name', 'ui.last_name', 'ui.middle_name', 'd.department_name')
            ->get();

        $ranking = [];

        foreach ($faculties as $faculty) {
            // 1️⃣ Get subjects handled by this faculty
            $subjects = DB::table('year_section_subjects as yss')
                ->join('subjects as s', 'yss.subject_id', '=', 's.id')
                ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
                ->join('student_subjects as ss', 'yss.id', '=', 'ss.year_section_subjects_id')
                ->where('yss.faculty_id', $faculty->id)
                ->where('ys.school_year_id', $activeEval->sy_id)
                ->select(
                    's.id as subject_id',
                    DB::raw('MIN(ss.id) as student_subject_id')
                )
                ->groupBy('s.id')
                ->get();

            $totalWeightedRating = 0;
            $totalStudents = 0;

            foreach ($subjects as $subject) {
                // Get all student_subject_ids for this subject
                $relatedIds = DB::table('student_subjects as ss')
                    ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
                    ->where('yss.faculty_id', $faculty->id)
                    ->where('yss.subject_id', $subject->subject_id)
                    ->whereIn('yss.year_section_id', function ($query) use ($activeEval) {
                        $query->select('id')->from('year_section')->where('school_year_id', $activeEval->sy_id);
                    })
                    ->pluck('ss.id');

                if ($relatedIds->isEmpty()) continue;

                // Get total enrolled students for weighting
                $subjectStudents = DB::table('student_subjects as ss')
                    ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
                    ->whereIn('ss.id', $relatedIds)
                    ->distinct('es.student_id')
                    ->count('es.student_id');

                if ($subjectStudents === 0) continue;

                // Get all answers with criteria and question
                $answers = DB::table('student_answers as sa')
                    ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
                    ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
                    ->whereIn('sa.student_subject_id', $relatedIds)
                    ->where('eq.evaluation_session_id', $activeEval->eval_id)
                    ->select('c.id as criteria_id', 'eq.id as question_id', 'sa.rating')
                    ->get();

                if ($answers->isEmpty()) continue;

                // Group answers by criteria and question
                $criteriaGrouped = $answers->groupBy('criteria_id')->map(function ($group) use ($subjectStudents) {
                    $questions = $group->groupBy('question_id')->map(function ($qGroup) use ($subjectStudents) {
                        $sumRatings = $qGroup->sum('rating');
                        $avgRating = $subjectStudents ? $sumRatings / $subjectStudents : 0;
                        return round($avgRating, 2);
                    })->values();

                    return round($questions->avg(), 2); // criteria average
                })->values();

                $subjectAverage = round($criteriaGrouped->avg(), 2);

                // Weighted sum
                $totalWeightedRating += $subjectAverage * $subjectStudents;
                $totalStudents += $subjectStudents;
            }

            $overallRating = $totalStudents > 0 ? round($totalWeightedRating / $totalStudents, 2) : null;

            $ranking[] = [
                'faculty_id' => $faculty->id,
                'first_name' => $faculty->first_name,
                'middle_name' => $faculty->middle_name,
                'last_name' => $faculty->last_name,
                'full_name' => "{$faculty->last_name}, {$faculty->first_name} {$faculty->middle_name}",
                'department_name' => $faculty->department_name ?? 'N/A',
                'overall_rating' => $overallRating
            ];
        }

        // Sort & rank
        // Filter out faculties with no rating or negative rating
        $ranking = collect($ranking)
            ->filter(fn($f) => $f['overall_rating'] !== null && $f['overall_rating'] > 0)
            ->sortByDesc('overall_rating')
            ->values()
            ->all();


        foreach ($ranking as $index => &$item) {
            $item['rank'] = $index + 1;
        }

        return Inertia::render('vpaa/Ranking', [
            'hasActiveEval' => true,
            'ranking' => $ranking,
            'schoolYear' => [
                'start_year' => $activeEval->start_year,
                'end_year' => $activeEval->end_year,
            ],
            'semester' => $activeEval->semester_name,
        ]);
    }


    //Student List
    public function studentList(Request $request)
    {
        /**
         * 1️⃣ Get ACTIVE evaluation based on status = 'active'
         */
        $activeEval = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('e.status', 'active')
            ->select(
                'e.id as eval_id',
                'sy.id as sy_id',
                'sy.start_year',
                'sy.end_year',
                's.semester_name'
            )
            ->first();

        // If no active evaluation exists, return an empty list with a message
        if (!$activeEval) {
            return Inertia::render('vpaa/StudentListPage', [
                'students' => [],
                'schoolYear' => null,
                'semester' => null,
                'filters' => ['search' => ''],
                'noActiveEval' => true,
            ]);
        }

        // 2️⃣ Input search filter
        $search = strtolower($request->input('search', ''));

        /**
         * 3️⃣ Build student query based on active evaluation's school_year_id
         */
        $students = DB::table('enrolled_students as es')
            ->join('users as u', 'es.student_id', '=', 'u.id')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->join('year_section as ys', 'es.year_section_id', '=', 'ys.id')
            ->join('course as c', 'ys.course_id', '=', 'c.id')
            ->leftJoin('student_subjects as ss', 'es.id', '=', 'ss.enrolled_students_id')
            ->leftJoin('student_answers as sa', function ($join) {
                $join->on('sa.student_subject_id', '=', 'ss.id')
                    ->on('sa.student_id', '=', 'es.student_id');
            })
            ->select(
                'u.id as student_id',
                'ui.first_name',
                'ui.middle_name',
                'ui.last_name',
                'c.course_name',
                'ys.section',
                DB::raw("COUNT(ss.id) as total_subjects"),
                DB::raw("COUNT(sa.id) as evaluated_subjects"),
                DB::raw("
                CASE
                    WHEN COUNT(sa.id) = COUNT(ss.id) AND COUNT(ss.id) > 0
                        THEN 'Completed'
                    ELSE 'Pending'
                END AS evaluation_status
            ")
            )
            ->where('ys.school_year_id', $activeEval->sy_id) // ← Use active evaluation's SY
            ->groupBy(
                'u.id',
                'ui.first_name',
                'ui.middle_name',
                'ui.last_name',
                'c.course_name',
                'ys.section'
            );

        // Apply search filter
        if (!empty($search)) {
            $students->whereRaw("
            LOWER(CONCAT(ui.last_name, ', ', ui.first_name, ' ', COALESCE(ui.middle_name, '')))
            LIKE ?
        ", ["%{$search}%"]);
        }

        // Order results
        $students = $students
            ->orderBy('ui.last_name', 'asc')
            ->orderBy('ui.first_name', 'asc')
            ->paginate(1000)
            ->withQueryString();

        /**
         * 4️⃣ Return results to frontend using active evaluation's SY & semester
         */
        return Inertia::render('vpaa/StudentListPage', [
            'students' => $students,
            'schoolYear' => [
                'start_year' => $activeEval->start_year,
                'end_year' => $activeEval->end_year,
            ],
            'semester' => $activeEval->semester_name,
            'filters' => ['search' => $search],
            'noActiveEval' => false,
        ]);
    }


    public function studentSubjects($studentId)
    {
        /**
         * 1️⃣ Get ACTIVE evaluation based on status = 'active'
         */
        $activeEval = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('e.status', 'active')
            ->select(
                'e.id as eval_id',
                'sy.id as sy_id',
                'sy.start_year',
                'sy.end_year',
                's.semester_name'
            )
            ->first();

        // 2️⃣ If no active evaluation exists, return a friendly message
        if (!$activeEval) {
            return response()->json([
                'subjects' => [],
                'school_year' => null,
                'semester' => null,
                'message' => 'No active evaluation found. Subjects cannot be evaluated until an evaluation is activated.',
            ]);
        }

        // 3️⃣ Fetch subjects for the student based on active evaluation's school_year_id
        $subjects = DB::table('enrolled_students as es')
            ->join('year_section as ys', 'es.year_section_id', '=', 'ys.id')
            ->join('student_subjects as ss', 'es.id', '=', 'ss.enrolled_students_id')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->leftJoin('student_answers as sa', function ($join) {
                $join->on('sa.student_subject_id', '=', 'ss.id')
                    ->on('sa.student_id', '=', 'es.student_id');
            })
            ->where('es.student_id', $studentId)
            ->where('ys.school_year_id', $activeEval->sy_id) // ← Use active evaluation's SY
            ->select(
                's.subject_code',
                's.descriptive_title',
                DB::raw("CASE WHEN COUNT(sa.id) > 0 THEN 'Evaluated' ELSE 'Non-Evaluated' END as status")
            )
            ->groupBy('s.subject_code', 's.descriptive_title')
            ->orderBy('s.subject_code')
            ->get();

        // 4️⃣ Return JSON response
        return response()->json([
            'subjects' => $subjects,
            'school_year' => "{$activeEval->start_year}–{$activeEval->end_year}",
            'semester' => $activeEval->semester_name,
        ]);
    }

    public function Archive()
    {
        return Inertia::render('vpaa/Archive', [
            'title' => 'Archive',
        ]);
    }

    // 1. Create a reusable private method for the query
    private function SchoolYearsWithEval()
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
        return Inertia::render('vpaa/Archives/EvalResult', [
            'title' => 'Evaluation Result',
            'schoolYears' => $this->SchoolYearsWithEval(),
        ]);
    }


    public function phFacultyReport()
    {
        return Inertia::render('vpaa/PH_Eval_Result/PHFacultyReport', [
            'title' => 'PH Faculty Evaluation Report',
            'schoolYears' => $this->SchoolYearsWithEval(),
        ]);
    }

    public function FacultyResult()
    {
        return Inertia::render('vpaa/FesFacultyResult/FacultyFesReport', [
            'title' => 'Faculty Evaluation Report',
            'schoolYears' => $this->SchoolYearsWithEval(),
        ]);
    }

        public function evalfacultyList($schoolYearId, Request $request)
    {
        // Get the school year and its semester from the passed schoolYearId
        $schoolYear = DB::table('school_years as sy')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('sy.id', $schoolYearId)
            ->select('sy.*', 's.semester_name')
            ->first();

        if (!$schoolYear) {
            abort(404, 'School year not found');
        }

        // Get search and department inputs
        $search = strtolower($request->input('search', ''));
        $departmentId = $request->input('department', '');
        $semester = $request->query('semester', $schoolYear->semester_name); // use passed semester or default

        // Build the query
        $query = DB::table('faculty as f')
            ->join('users as u', 'f.faculty_id', '=', 'u.id')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->leftJoin('department as d', 'f.department_id', '=', 'd.id')
            ->join('year_section_subjects as yss', 'u.id', '=', 'yss.faculty_id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->join('school_years as sy', 'ys.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('ys.school_year_id', $schoolYear->id) // filter by passed school year
            ->where('s.semester_name', $semester)        // filter by semester
            ->select(
                'u.id',
                'ui.first_name',
                'ui.last_name',
                'ui.middle_name',
                'd.department_name',
                'f.department_id',
                's.semester_name'
            )
            ->selectRaw("CONCAT(ui.last_name, ', ', ui.first_name, ' ', COALESCE(ui.middle_name, '')) as full_name")
            ->groupBy(
                'u.id',
                'ui.first_name',
                'ui.last_name',
                'ui.middle_name',
                'd.department_name',
                'f.department_id',
                's.semester_name'
            );

        // Search by full name
        if (!empty($search)) {
            $query->whereRaw(
                "LOWER(CONCAT(ui.last_name, ', ', ui.first_name, ' ', COALESCE(ui.middle_name, ''))) LIKE ?",
                ["%{$search}%"]
            );
        }

        // Filter by department
        if (!empty($departmentId)) {
            $query->where('f.department_id', $departmentId);
        }

        $query->orderBy('ui.last_name', 'asc')
            ->orderBy('ui.first_name', 'asc');

        $perPage = $request->input('per_page', 100);

        // Paginate results
        $faculty = $query->paginate($perPage)->withQueryString();

        // Get departments for the filter dropdown
        $departments = DB::table('department')->select('id', 'department_name')->get();

        // Return to the frontend
        return Inertia::render('vpaa/Archives/FacultyList', [
            'faculty' => $faculty,
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'departments' => $departments,
            'filters' => [
                'department' => $departmentId,
                'search' => $search,
            ],
        ]);
    }

    public function facultySubjects($facultyId, $schoolYearId, Request $request)
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

        // STEP 1 – Get subjects handled by this faculty in this school year
        $subjects = DB::table('year_section_subjects as yss')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->join('student_subjects as ss', 'yss.id', '=', 'ss.year_section_subjects_id')
            ->where('yss.faculty_id', $facultyId)
            ->where('ys.school_year_id', $schoolYearId)
            ->select(
                's.id as subject_id',
                's.subject_code',
                's.descriptive_title',
                DB::raw('MIN(ss.id) as student_subject_id')
            )
            ->groupBy('s.id', 's.subject_code', 's.descriptive_title')
            ->get();

        // STEP 2 – Compute rating per subject (consistent with facultyEvaluationResult)
        foreach ($subjects as $subject) {

            // Get all student_subject_ids for this faculty & subject
            $relatedIds = DB::table('student_subjects as ss')
                ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
                ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
                ->where('yss.faculty_id', $facultyId)
                ->where('yss.subject_id', $subject->subject_id)
                ->where('ys.school_year_id', $schoolYearId)
                ->pluck('ss.id');

            $subject->student_count = $relatedIds->count();

            if ($relatedIds->isEmpty()) {
                $subject->overall_average = null;
                continue;
            }

            // Total enrolled students for weighting
            $totalStudents = DB::table('student_subjects as ss')
                ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
                ->whereIn('ss.id', $relatedIds)
                ->distinct('es.student_id')
                ->count('es.student_id');

            if ($totalStudents === 0) {
                $subject->overall_average = null;
                continue;
            }

            // Get all answers with criteria & question
            $answers = DB::table('student_answers as sa')
                ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
                ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
                ->whereIn('sa.student_subject_id', $relatedIds)
                ->select('c.id as criteria_id', 'eq.id as question_id', 'sa.rating')
                ->get();

            if ($answers->isEmpty()) {
                $subject->overall_average = null;
                continue;
            }

            // Group answers by criteria and question
            $criteriaGrouped = $answers->groupBy('criteria_id')->map(function ($group) use ($totalStudents) {
                $questions = $group->groupBy('question_id')->map(function ($qGroup) use ($totalStudents) {
                    $sumRatings = $qGroup->sum('rating');
                    $avgRating = $totalStudents ? $sumRatings / $totalStudents : 0;
                    return round($avgRating, 2);
                })->values();

                return round($questions->avg(), 2); // criteria average
            })->values();

            // Overall average = mean of criteria averages
            $subject->overall_average = round($criteriaGrouped->avg(), 2);
        }

        // STEP 3 – Compute overall rating across all subjects
        $validSubjects = $subjects->filter(fn($s) => $s->overall_average !== null);
        $overallRating = $validSubjects->count() ? round($validSubjects->avg('overall_average'), 2) : null;

        // STEP 4 – Get faculty info
        $faculty = DB::table('users as u')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->leftJoin('faculty as f', 'u.id', '=', 'f.faculty_id')
            ->leftJoin('department as d', 'f.department_id', '=', 'd.id')
            ->where('u.id', $facultyId)
            ->select('u.id', 'ui.first_name', 'ui.last_name', 'ui.middle_name', 'd.department_name')
            ->first();

        return Inertia::render('vpaa/Archives/FacultySubjects', [
            'faculty'       => $faculty,
            'schoolYear'    => $schoolYear,
            'schoolYearId'  => $schoolYearId,
            'subjects'      => $subjects,
            'overallRating' => $overallRating,
        ]);
    }

    public function archiveEvaluationResult($facultyId, $studentSubjectId, $schoolYearId)
    {
        // Step 1: Get subject info
        $subjectInfo = DB::table('student_subjects as ss')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->where('ss.id', $studentSubjectId)
            ->select('s.id as subject_id', 's.subject_code', 's.descriptive_title')
            ->first();

        if (!$subjectInfo) abort(404, 'Subject not found.');

        // Step 2: Get all student_subject_ids for the same faculty & subject
        $relatedStudentSubjectIds = DB::table('student_subjects as ss')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->where('yss.faculty_id', $facultyId)
            ->where('yss.subject_id', $subjectInfo->subject_id)
            ->pluck('ss.id');

        // Step 3: Get the evaluation for that school year
        $evaluation = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as sem', 'sy.semester_id', '=', 'sem.id')
            ->where('e.school_year_id', $schoolYearId)
            ->latest('e.start_date')
            ->select('e.*', 'sy.start_year', 'sy.end_year', 'sem.semester_name')
            ->first();

        if (!$evaluation) {
            return Inertia::render('vpaa/Archives/EvaluationResult', [
                'faculty' => null,
                'subject' => null,
                'evaluation' => null,
                'criteria' => [],
                'overallAverage' => null,
                'totalRespondents' => 0,
                'totalStudentsHandled' => 0,
                'schoolYear' => null,
                'feedback' => [],
                'message' => 'Evaluation has not yet started.',
            ]);
        }

        // Step 4: Total students for weighting
        $totalStudents = DB::table('student_subjects as ss')
            ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
            ->whereIn('ss.id', $relatedStudentSubjectIds)
            ->distinct('es.student_id')
            ->count('es.student_id');

        // Step 5: Get all answers
        $answers = DB::table('student_answers as sa')
            ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
            ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
            ->whereIn('sa.student_subject_id', $relatedStudentSubjectIds)
            ->where('eq.evaluation_session_id', $evaluation->id)
            ->select('c.id as criteria_id', 'c.title as criteria_title', 'eq.id as question_id', 'eq.question_text', 'sa.rating')
            ->get();

        // Step 6: Group answers per criteria and question, calculate averages based on total students
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

        // Step 7: Overall average = mean of criteria averages
        $overallAverage = $criteriaGrouped->avg('average');
        $overallAverage = round($overallAverage, 2);

        // Step 8: School year info
        $schoolYear = [
            'start_year' => $evaluation->start_year,
            'end_year' => $evaluation->end_year,
            'semester' => $evaluation->semester_name,
            'formatted' => 'S.Y. ' . $evaluation->start_year . '-' . $evaluation->end_year . ' (' . $evaluation->semester_name . ')',
        ];

        // Step 9: Count unique student respondents
        $respondents = DB::table('student_answers')
            ->whereIn('student_subject_id', $relatedStudentSubjectIds)
            ->distinct('student_id')
            ->count('student_id');

        // Step 10: Get faculty info
        $faculty = DB::table('users as u')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->where('u.id', $facultyId)
            ->select('u.id', 'ui.first_name', 'ui.last_name', 'ui.middle_name')
            ->first();

        // Step 11: Get feedback
        $feedback = DB::table('evaluation_feedback')
            ->whereIn('student_subject_id', $relatedStudentSubjectIds)
            ->select('strengths', 'weaknesses', 'anonymous', 'created_at')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('vpaa/Archives/EvaluationResult', [
            'faculty' => $faculty,
            'subject' => $subjectInfo,
            'evaluation' => $evaluation,
            'criteria' => $criteriaGrouped,
            'overallAverage' => $overallAverage,
            'totalRespondents' => $respondents,
            'totalStudentsHandled' => $totalStudents,
            'schoolYear' => $schoolYear,
            'feedback' => $feedback,
            'message' => null,
        ]);
    }

    public function studEval()
    {
        $schoolYearsWithEval = DB::table('evaluation as e')
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

        return Inertia::render('vpaa/Archives/StudEval', [
            'title' => 'Archive',
            'schoolYears' => $schoolYearsWithEval,
        ]);
    }

    public function archivestudentList(Request $request, $schoolYearId = null)
    {
        // Use selected SY if provided, otherwise fallback to active
        $schoolYear = $schoolYearId
            ? SchoolYear::with('semester')->findOrFail($schoolYearId)
            : SchoolYear::where('is_current', 1)->with('semester')->first();

        $search = strtolower($request->input('search', ''));

        $students = DB::table('enrolled_students as es')
            ->join('users as u', 'es.student_id', '=', 'u.id')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->join('year_section as ys', 'es.year_section_id', '=', 'ys.id')
            ->join('course as c', 'ys.course_id', '=', 'c.id')
            ->leftJoin('student_subjects as ss', 'es.id', '=', 'ss.enrolled_students_id')
            ->leftJoin('student_answers as sa', function ($join) {
                $join->on('sa.student_subject_id', '=', 'ss.id')
                    ->on('sa.student_id', '=', 'es.student_id');
            })
            ->select(
                'u.id as student_id',
                'ui.first_name',
                'ui.middle_name',
                'ui.last_name',
                'c.course_name',
                'ys.section',
                DB::raw("COUNT(ss.id) as total_subjects"),
                DB::raw("COUNT(sa.id) as evaluated_subjects"),
                DB::raw("
                CASE
                    WHEN COUNT(sa.id) = COUNT(ss.id) AND COUNT(ss.id) > 0
                        THEN 'Completed'
                    ELSE 'Pending'
                END AS evaluation_status
            ")
            )
            ->where('ys.school_year_id', $schoolYear->id)
            ->groupBy(
                'u.id',
                'ui.first_name',
                'ui.middle_name',
                'ui.last_name',
                'c.course_name',
                'ys.section'
            );

        if (!empty($search)) {
            $students->whereRaw("
            LOWER(CONCAT(ui.last_name, ', ', ui.first_name, ' ', COALESCE(ui.middle_name, '')))
            LIKE ?
        ", ["%{$search}%"]);
        }

        $students = $students
            ->orderBy('ui.last_name', 'asc')
            ->orderBy('ui.first_name', 'asc')
            ->paginate(1000)
            ->withQueryString();

        return Inertia::render('vpaa/Archives/StudentsList', [
            'schoolYear' => $schoolYear,
            'semester' => $schoolYear->semester->semester_name ?? 'N/A',
            'students' => $students,
            'filters' => ['search' => $search]
        ]);
    }

     public function archivestudentSubjects($studentId, $schoolYearId = null)
    {
        // Use selected SY if provided, otherwise fallback to active
        $schoolYear = $schoolYearId
            ? SchoolYear::findOrFail($schoolYearId)
            : SchoolYear::where('is_current', 1)->first();

        $subjects = DB::table('enrolled_students as es')
            ->join('year_section as ys', 'es.year_section_id', '=', 'ys.id')
            ->join('student_subjects as ss', 'es.id', '=', 'ss.enrolled_students_id')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->leftJoin('student_answers as sa', function ($join) {
                $join->on('sa.student_subject_id', '=', 'ss.id')
                    ->on('sa.student_id', '=', 'es.student_id');
            })
            ->select(
                's.subject_code',
                's.descriptive_title',
                DB::raw("CASE WHEN COUNT(sa.id) > 0 THEN 'Evaluated' ELSE 'Non-Evaluated' END as status")
            )
            ->where('es.student_id', $studentId)
            ->when(isset($schoolYear->id), function ($query) use ($schoolYear) {
                $query->where('ys.school_year_id', $schoolYear->id);
            })
            ->groupBy('s.subject_code', 's.descriptive_title')
            ->orderBy('s.subject_code')
            ->get();

        return response()->json([
            'subjects' => $subjects,
            'school_year' => "{$schoolYear->start_year}–{$schoolYear->end_year}",
        ]);
    }

    public function rankEval()
    {
        $schoolYearsWithEval = DB::table('evaluation as e')
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

        return Inertia::render('vpaa/Archives/RankEval', [
            'title' => 'Archive',
            'schoolYears' => $schoolYearsWithEval,
        ]);
    }

    public function archiveRanking($schoolYearId = null)
    {
        if (!$schoolYearId) {
            return Inertia::render('vpaa/Archives/RankingList', [
                'hasArchive' => false,
                'ranking' => [],
                'schoolYear' => null,
                'semester' => null,
            ]);
        }

        // 1️⃣ Get evaluation for the selected school year
        $selectedEval = DB::table('evaluation as e')
            ->join('school_years as sy', 'e.school_year_id', '=', 'sy.id')
            ->join('semesters as s', 'sy.semester_id', '=', 's.id')
            ->where('sy.id', $schoolYearId)
            ->select(
                'e.id as eval_id',
                'sy.id as sy_id',
                'sy.start_year',
                'sy.end_year',
                's.semester_name',
                'e.status'
            )
            ->first();

        if (!$selectedEval) {
            return Inertia::render('vpaa/Archives/RankingList', [
                'hasArchive' => false,
                'ranking' => [],
                'schoolYear' => null,
                'semester' => null,
            ]);
        }

        // 2️⃣ Get all faculties for this school year
        $faculties = DB::table('faculty as f')
            ->join('users as u', 'f.faculty_id', '=', 'u.id')
            ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
            ->leftJoin('department as d', 'f.department_id', '=', 'd.id')
            ->join('year_section_subjects as yss', 'u.id', '=', 'yss.faculty_id')
            ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
            ->where('ys.school_year_id', $selectedEval->sy_id)
            ->select(
                'u.id',
                'ui.first_name',
                'ui.last_name',
                'ui.middle_name',
                'd.department_name'
            )
            ->groupBy('u.id', 'ui.first_name', 'ui.last_name', 'ui.middle_name', 'd.department_name')
            ->get();

        $ranking = [];

        foreach ($faculties as $faculty) {
            // 3️⃣ Get subjects handled by this faculty
            $subjects = DB::table('year_section_subjects as yss')
                ->join('subjects as s', 'yss.subject_id', '=', 's.id')
                ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
                ->join('student_subjects as ss', 'yss.id', '=', 'ss.year_section_subjects_id')
                ->where('yss.faculty_id', $faculty->id)
                ->where('ys.school_year_id', $selectedEval->sy_id)
                ->select('s.id as subject_id', DB::raw('MIN(ss.id) as student_subject_id'))
                ->groupBy('s.id')
                ->get();

            $totalWeightedRating = 0;
            $totalStudents = 0;

            foreach ($subjects as $subject) {
                $relatedIds = DB::table('student_subjects as ss')
                    ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
                    ->where('yss.faculty_id', $faculty->id)
                    ->where('yss.subject_id', $subject->subject_id)
                    ->whereIn('yss.year_section_id', function ($query) use ($selectedEval) {
                        $query->select('id')->from('year_section')->where('school_year_id', $selectedEval->sy_id);
                    })
                    ->pluck('ss.id');

                if ($relatedIds->isEmpty()) continue;

                // Total enrolled students
                $subjectStudents = DB::table('student_subjects as ss')
                    ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
                    ->whereIn('ss.id', $relatedIds)
                    ->distinct('es.student_id')
                    ->count('es.student_id');

                if ($subjectStudents === 0) continue;

                // Answers for this subject
                $answers = DB::table('student_answers as sa')
                    ->join('evaluation_questions as eq', 'sa.evaluation_question_id', '=', 'eq.id')
                    ->join('criterias as c', 'eq.criteria_id', '=', 'c.id')
                    ->whereIn('sa.student_subject_id', $relatedIds)
                    ->where('eq.evaluation_session_id', $selectedEval->eval_id)
                    ->select('c.id as criteria_id', 'eq.id as question_id', 'sa.rating')
                    ->get();

                if ($answers->isEmpty()) continue;

                $criteriaGrouped = $answers->groupBy('criteria_id')->map(function ($group) use ($subjectStudents) {
                    $questions = $group->groupBy('question_id')->map(function ($qGroup) use ($subjectStudents) {
                        $sumRatings = $qGroup->sum('rating');
                        $avgRating = $subjectStudents ? $sumRatings / $subjectStudents : 0;
                        return round($avgRating, 2);
                    })->values();

                    return round($questions->avg(), 2); // criteria average
                })->values();

                $subjectAverage = round($criteriaGrouped->avg(), 2);

                // Weighted sum
                $totalWeightedRating += $subjectAverage * $subjectStudents;
                $totalStudents += $subjectStudents;
            }

            $overallRating = $totalStudents > 0 ? round($totalWeightedRating / $totalStudents, 2) : null;

            $ranking[] = [
                'faculty_id' => $faculty->id,
                'first_name' => $faculty->first_name,
                'middle_name' => $faculty->middle_name,
                'last_name' => $faculty->last_name,
                'full_name' => "{$faculty->last_name}, {$faculty->first_name} {$faculty->middle_name}",
                'department_name' => $faculty->department_name ?? 'N/A',
                'overall_rating' => $overallRating
            ];
        }

        // Sort & rank
        // Filter out faculties with no rating or negative rating
        $ranking = collect($ranking)
            ->filter(fn($f) => $f['overall_rating'] !== null && $f['overall_rating'] > 0)
            ->sortByDesc('overall_rating')
            ->values()
            ->all();


        foreach ($ranking as $index => &$item) {
            $item['rank'] = $index + 1;
        }

        return Inertia::render('vpaa/Archives/RankingList', [
            'hasArchive' => true,
            'ranking' => $ranking,
            'schoolYear' => "{$selectedEval->start_year}-{$selectedEval->end_year}",
            'semester' => $selectedEval->semester_name,
        ]);
    }





}
