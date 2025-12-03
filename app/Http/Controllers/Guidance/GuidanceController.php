<?php

namespace App\Http\Controllers\Guidance;

use Inertia\Inertia;
use App\Models\Faculty;
use App\Models\Department;
use App\Models\Criteria;
use App\Models\UserInformation;
use App\Models\Question;
use App\Models\Evaluation;
use App\Models\SchoolYear;
use App\Models\StudentDraft;
use Illuminate\Http\Request;
use App\Models\StudentAnswer;
use App\Models\EvaluationFeedback;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use App\Models\EnrolledStudent;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\User;


class GuidanceController extends Controller
{
    public function index()
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

        // ------------------------------------------------------------------
        // 🔥 6️⃣ FACULTY RANKING INSIGHTS (Added here)
        // ------------------------------------------------------------------

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
            ->groupBy('es.id', 'd.department_name', 'department')
            ->select(
                'd.department_name_abbreviation as department',
                'es.id as student_id',
                DB::raw('COUNT(ss.id) as total_subjects'),
                DB::raw('COUNT(sa.id) as evaluated_subjects'),
                DB::raw('CASE WHEN COUNT(ss.id) > 0 AND COUNT(sa.id) = COUNT(ss.id) THEN "Completed" ELSE "Pending" END as status')
            )
            ->get()
            ->groupBy('department_name_abbreviation') // group by department in Laravel Collection
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

        return Inertia::render('Guidance/Dashboard', [
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



    // ------- Criteria --------------------------------------------------------------------------------------------------------------------

    public function criteria()
    {
        $criteria = Criteria::all();
        return Inertia::render('Guidance/Criteria', [
            'criteria' => $criteria
        ]);
    }

    public function create()
    {
        return Inertia::render('Guidance/AddCriteria');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255|unique:criterias,title',
            'questions' => 'nullable|array',
            'questions.*' => 'nullable|string'
        ]);

        $criteria = Criteria::create([
            'title' => $validated['title'],
        ]);

        $savedQuestions = [];

        if (!empty($validated['questions'])) {
            foreach ($validated['questions'] as $q) {
                if (trim($q) !== '') {
                    $newQ = $criteria->questions()->create([
                        'text' => $q
                    ]);

                    $savedQuestions[] = [
                        'id' => $newQ->id,
                        'text' => $newQ->text,
                    ];
                }
            }
        }

        return response()->json([
            'id' => $criteria->id,
            'title' => $criteria->title,
            'saved_questions' => $savedQuestions,
            'message' => 'Criteria and questions added successfully.'
        ]);
    }

    public function save(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'questions' => 'nullable|array',
            'questions.*' => 'nullable|string',
        ]);

        // Create the criteria
        $criteria = Criteria::create([
            'title' => $validated['title'],
        ]);

        // Save questions if provided
        if (!empty($validated['questions'])) {
            foreach ($validated['questions'] as $q) {
                if (trim($q) !== '') {
                    $criteria->questions()->create([
                        'question' => $q,
                    ]);
                }
            }
        }

        return redirect()->route('guidance.criteria')
            ->with('success', 'Criteria and questions added successfully.');
    }


    public function destroy($id)
    {
        $criteria = Criteria::findOrFail($id);
        $criteria->delete();

        // If it's an AJAX request (like Axios), return JSON
        if (request()->wantsJson()) {
            return response()->json(['message' => 'Deleted successfully'], 200);
        }

        // Otherwise, fallback to redirect
        return redirect()->route('guidance.criteria')->with('success', 'Criteria deleted successfully.');
    }

    public function criteria_update(Request $request, $id)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'recommendation' => 'nullable|string',
            'suggestion' => 'nullable|string',
        ]);

        $criteria = Criteria::findOrFail($id);
        $criteria->update($validated);

        return redirect()->route('guidance.criteria')->with('success', 'Criteria updated successfully.');
    }


    public function questionnaire()
    {
        return Inertia::render('Guidance/Questionnaire');
    }

    public function quesCri()
    {
        $criteria = Criteria::with('questions')->get();
        return Inertia::render('Guidance/Questionnaire', [
            'criteria' => $criteria
        ]);
    }

    public function storeQuestions(Request $request, $id)
    {
        $validated = $request->validate([
            'questions' => 'required|array',
            'questions.*' => 'required|string',
        ]);

        $criteria = Criteria::findOrFail($id);

        $saved = [];
        foreach ($validated['questions'] as $q) {
            $newQuestion = $criteria->questions()->create(['text' => $q]);
            $saved[] = [
                'id' => $newQuestion->id,
                'text' => $newQuestion->text,
            ];
        }

        return response()->json([
            'message' => 'New questions added successfully',
            'questions' => $saved,
        ]);
    }

    // -------------- Questionnaire --------------------------------------------------------------------------------------------------------------------


    public function questionnaireForm()
    {
        $criteria = Criteria::with('questions')->orderBy('position')->get();
        return Inertia::render('Guidance/QuestionnaireForm', [
            'criteria' => $criteria
        ]);
    }

    public function saveOrder(Request $request)
    {
        $data = $request->input('criteria');

        foreach ($data as $index => $criteriaData) {
            $criteria = Criteria::find($criteriaData['id']);
            if ($criteria) {
                $criteria->position = $index;
                $criteria->save();

                foreach ($criteriaData['question_ids'] as $qIndex => $questionId) {
                    $question = Question::find($questionId);
                    if ($question) {
                        $question->position = $qIndex;
                        $question->save();
                    }
                }
            }
        }

        return back()->with('success', 'Order saved successfully.');
    }

    // Add this method:
    public function softDeleteQuestion($id)
    {
        $question = Question::findOrFail($id);
        $question->delete();

        return response()->json(['message' => 'Question soft-deleted.']);
    }

    public function restoreQuestion($id)
    {
        $question = Question::withTrashed()->findOrFail($id);

        if ($question->trashed()) {
            $question->restore();
            return response()->json(['message' => 'Question restored.']);
        }

        return response()->json(['message' => 'Question is not deleted.'], 400);
    }

    public function updateQuestion(Request $request, $id)
    {
        $question = Question::findOrFail($id);
        $question->update([
            'text' => $request->input('text'),
        ]);

        return response()->json(['message' => 'Question updated.']);
    }

    //------------ Set Evaluation --------------------------------------------------------------------------------------------------------------------

    public function evaluation(Request $request)
    {
        $schoolYears = SchoolYear::with([
            'semester',
            'evaluations' => function ($query) {
                $query->with(['evaluationQuestions' => function ($q) {
                    $q->orderBy('criteria_position')->orderBy('question_position');
                }]);
            }
        ])
            ->orderByDesc('start_year')
            ->paginate(6) // Show 6 per page (adjust as needed)
            ->withQueryString(); // Keeps filters/search/pagination in URL

        return Inertia::render('Guidance/Evaluation', [
            'schoolYears' => $schoolYears,
        ]);
    }

    public function eval_store(Request $request)
    {
        $validated = $request->validate([
            'school_year_id' => 'required|exists:school_years,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'nullable|in:pending,active,closed',
        ]);

        $today = now()->toDateString();

        // Automatically set status based on date range
        if ($validated['end_date'] < $today) {
            $validated['status'] = 'closed';
        } elseif ($validated['start_date'] > $today) {
            $validated['status'] = 'pending';
        } else {
            $validated['status'] = 'active';
        }

        // ✅ Laravel check for existing evaluation (excluding soft deleted)
        $existing = Evaluation::where('school_year_id', $validated['school_year_id'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'An evaluation for this school year already exists.'
            ], 422);
        }

        // ❗ Ensure only ONE active evaluation exists
        if ($validated['status'] === 'active') {
            Evaluation::where('status', 'active')->update(['status' => 'closed']);
        }

        // ✅ Fetch all questions with criteria
        $questions = Question::with('criteria')->get();

        if ($questions->isEmpty()) {
            return response()->json([
                'message' => 'No evaluation questions are available. Please create them first.'
            ], 400);
        }

        try {
            // ✅ Use transaction to ensure atomic save
            $evaluation = DB::transaction(function () use ($validated, $questions) {
                $eval = Evaluation::create($validated);

                foreach ($questions as $question) {
                    DB::table('evaluation_questions')->insert([
                        'evaluation_session_id' => $eval->id,
                        'question_id' => $question->id,
                        'question_text' => $question->text,
                        'question_position' => $question->position,
                        'criteria_id' => $question->criteria_id,
                        'criteria_title' => $question->criteria->title,
                        'criteria_position' => $question->criteria->position,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                return $eval;
            });

            $evaluation->load('schoolYear.semester');

            return response()->json([
                'message' => 'Evaluation created and questions assigned successfully.',
                'evaluation' => $evaluation,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // ✅ Catch duplicate key SQL errors from unique constraint
            if ($e->getCode() == '23000') {
                return response()->json([
                    'message' => 'Evaluation already exists for this school year.'
                ], 422);
            }

            // For other unexpected database errors
            return response()->json([
                'message' => 'An error occurred while saving the evaluation.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function eval_update(Request $request, Evaluation $evaluation)
    {
        $validated = $request->validate([
            'school_year_id' => 'required|exists:school_years,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'required|in:pending,active,closed',
        ]);

        if ($validated['status'] === 'active') {
            Evaluation::where('status', 'active')
                ->where('id', '!=', $evaluation->id)
                ->update(['status' => 'closed']);
        }

        // $today = now()->toDateString();

        // if ($validated['end_date'] < $today) {
        //     $validated['status'] = 'closed';
        // } elseif ($validated['start_date'] > $today) {
        //     $validated['status'] = 'pending';
        // } else {
        //     $validated['status'] = 'active';
        // }

        $evaluation->update($validated);

        $evaluation->load('schoolYear.semester');

        return response()->json([
            'message' => 'Updated successfully.',
            'evaluation' => $evaluation,
        ]);
    }
    public function eval_destroy(Evaluation $evaluation)
    {
        $evaluation->delete();

        return response()->json(['message' => 'Evaluation deleted successfully.']);
    }

    // ---------- Student side Evalaution Questionnaire --------------------------------------------------------------------------------------------------------------------

    public function stud_eval_questionnaire($id)
    {
        $studentId = Auth::id();

        // Get evaluation info (instructor, subject, dates, etc.)
        $evaluation = DB::table('student_subjects as ss')
            ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->join('faculty as fac', 'yss.faculty_id', '=', 'fac.faculty_id')
            ->join('users as f', 'fac.faculty_id', '=', 'f.id')
            ->join('user_information as fui', 'f.id', '=', 'fui.user_id')
            ->join('year_section as ys', 'es.year_section_id', '=', 'ys.id')
            ->join('school_years as sy', 'ys.school_year_id', '=', 'sy.id')
            ->join('semesters as sem', 'sy.semester_id', '=', 'sem.id')
            ->join('evaluation as e', 'e.school_year_id', '=', 'sy.id')
            ->where('ss.id', $id)
            ->where('es.student_id', $studentId)
            ->select(
                'ss.id as student_subject_id', // ✅ added this line
                'e.id as evaluation_id',
                'fui.first_name as instructor_first_name',
                'fui.last_name as instructor_last_name',
                's.descriptive_title as subject_title',
                's.subject_code',
                'e.status',
                'sy.start_year',
                'sy.end_year',
                'sem.semester_name',
                'e.start_date',
                'e.end_date'
            )
            ->first();

        if (!$evaluation) {
            abort(403, 'Unauthorized or invalid evaluation request.');
        }

        // Fetch evaluation_questions grouped by criteria
        $criteria = DB::table('evaluation_questions')
            ->where('evaluation_session_id', $evaluation->evaluation_id)
            ->orderBy('criteria_position')
            ->orderBy('question_position')
            ->get()
            ->groupBy('criteria_id')
            ->map(function ($questions, $criteriaId) {
                return [
                    'id' => $criteriaId,
                    'title' => $questions->first()->criteria_title,
                    'questions' => $questions->map(function ($q) {
                        return [
                            'id' => $q->id, // evaluation_question.id
                            'question_text' => $q->question_text,
                        ];
                    })->values(),
                ];
            })->values();


        return Inertia::render('StudentEvaluation/StudentQuestionnaire', [
            'evaluation' => $evaluation,
            'criteria' => $criteria,
        ]);
    }


    public function stud_questionnaire()
    {
        $studentId = Auth::id();

        $evaluations = DB::select('
            SELECT
                ss.id as student_subject_id,
                e.id AS evaluation_id,
                u.user_id_no AS student_number,
                ui.first_name AS student_first_name,
                ui.last_name AS student_last_name,
                s.descriptive_title AS subject_title,
                s.subject_code,
                fac.faculty_id AS instructor_id,
                fui.first_name AS instructor_first_name,
                fui.last_name AS instructor_last_name,
                sy.start_year,
                sy.end_year,
                e.start_date,
                e.end_date,
                e.status,
                sem.semester_name
            FROM enrolled_students es
            JOIN student_subjects ss ON es.id = ss.enrolled_students_id
            JOIN year_section_subjects yss ON ss.year_section_subjects_id = yss.id
            JOIN subjects s ON yss.subject_id = s.id
            JOIN year_section ys ON es.year_section_id = ys.id
            JOIN school_years sy ON ys.school_year_id = sy.id
            JOIN semesters sem ON sy.semester_id = sem.id
            JOIN users u ON es.student_id = u.id
            JOIN user_information ui ON u.id = ui.user_id
            JOIN faculty fac ON yss.faculty_id = fac.faculty_id
            JOIN users f ON fac.faculty_id = f.id
            JOIN user_information fui ON f.id = fui.user_id
            JOIN evaluation e ON e.school_year_id = sy.id
            WHERE sy.is_current = 1 AND es.student_id = ?
        ', [$studentId]);

        $evaluationsWithProgress = collect($evaluations)->map(function ($eval) use ($studentId) {
            $total = DB::table('evaluation_questions')
                ->where('evaluation_session_id', $eval->evaluation_id)
                ->count();

            $hasSubmitted = DB::table('evaluation_feedback')
                ->where('evaluation_session_id', $eval->evaluation_id)
                ->where('student_id', $studentId)
                ->where('student_subject_id', $eval->student_subject_id)
                ->exists();

            $answered = 0;
            $feedbackCompleted = 0;

            if (!$hasSubmitted) {
                $draft = DB::table('student_drafts')
                    ->where('student_id', $studentId)
                    ->where('evaluation_id', $eval->evaluation_id)
                    ->where('student_subject_id', $eval->student_subject_id)
                    ->first();

                if ($draft) {
                    $answersArray = is_array($draft->answers) ? $draft->answers : json_decode($draft->answers, true);
                    $answered = is_array($answersArray) ? count($answersArray) : 0;

                    if (!empty($draft->strengths)) $feedbackCompleted++;
                    if (!empty($draft->weaknesses)) $feedbackCompleted++;
                }
            } else {
                $answered = DB::table('student_answers')
                    ->join('evaluation_questions', 'student_answers.evaluation_question_id', '=', 'evaluation_questions.id')
                    ->where('student_answers.student_id', $studentId)
                    ->where('student_answers.student_subject_id', $eval->student_subject_id)
                    ->where('evaluation_questions.evaluation_session_id', $eval->evaluation_id)
                    ->count();

                $feedbackCompleted = 2;
            }

            $totalWithFeedback = $total + 2;
            $eval->total_questions = $total;
            $eval->total_questions_with_feedback = $totalWithFeedback;
            $eval->progress = $totalWithFeedback > 0
                ? round((($answered + $feedbackCompleted) / $totalWithFeedback) * 100)
                : 0;
            $eval->has_submitted = $hasSubmitted;

            return $eval;
        });

        return Inertia::render('StudentEvaluation/StudentEvaluation', [
            'evaluations' => $evaluationsWithProgress,
        ]);
    }

    public function submit(Request $request)
    {
        $request->validate([
            'evaluation_id' => 'required|exists:evaluation,id',
            'student_subject_id' => 'required|exists:student_subjects,id',
            'answers' => 'required|array',
            'strengths' => 'required|string',
            'weaknesses' => 'required|string',
            'anonymous' => 'boolean',
        ]);

        $studentId = Auth::id();
        $anonymous = $request->boolean('anonymous');

        // Prevent duplicate submission for same subject-instructor pair
        $existing = EvaluationFeedback::where('evaluation_session_id', $request->evaluation_id)
            ->where('student_id', $studentId)
            ->where('student_subject_id', $request->student_subject_id)
            ->first();

        if ($existing) {
            return back()->withErrors(['error' => 'You have already submitted this evaluation.']);
        }

        // Save answers
        foreach ($request->answers as $evaluationQuestionId => $rating) {
            StudentAnswer::create([
                'evaluation_question_id' => $evaluationQuestionId,
                'student_id' => $studentId,
                'student_subject_id' => $request->student_subject_id,
                'rating' => $rating,
                'anonymous' => $anonymous,
            ]);
        }

        // Save feedback
        EvaluationFeedback::create([
            'evaluation_session_id' => $request->evaluation_id,
            'student_subject_id' => $request->student_subject_id,
            'student_id' => $studentId,
            'strengths' => $request->strengths,
            'weaknesses' => $request->weaknesses,
            'anonymous' => $anonymous,
        ]);

        // ✅ Delete any existing draft to save space
        StudentDraft::where('student_id', $studentId)
            ->where('evaluation_id', $request->evaluation_id)
            ->where('student_subject_id', $request->student_subject_id)
            ->delete();

        return redirect()->route('student.evaluation')->with('success', 'Evaluation submitted successfully.');
    }


    public function loadDraft($evaluationId, $studentSubjectId)
    {
        $draft = StudentDraft::where('student_id', Auth::id())
            ->where('evaluation_id', $evaluationId)
            ->where('student_subject_id', $studentSubjectId)
            ->first();

        return response()->json($draft);
    }


    public function saveDraft(Request $request)
    {
        $validated = $request->validate([
            'evaluation_id' => 'required|exists:evaluation,id',
            'student_subject_id' => 'required|exists:student_subjects,id',
            'answers' => 'nullable|array',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'anonymous' => 'boolean',
        ]);

        $draft = StudentDraft::updateOrCreate(
            [
                'student_id' => Auth::id(),
                'evaluation_id' => $validated['evaluation_id'],
                'student_subject_id' => $validated['student_subject_id'],
            ],
            [
                'answers' => $validated['answers'] ?? [],
                'strengths' => $validated['strengths'],
                'weaknesses' => $validated['weaknesses'],
                'anonymous' => $validated['anonymous'],
            ]
        );

        return response()->json(['message' => 'Draft saved', 'draft' => $draft]);
    }


    public function deleteDraft($evaluationId, $studentSubjectId)
    {
        StudentDraft::where('student_id', Auth::id())
            ->where('evaluation_id', $evaluationId)
            ->where('student_subject_id', $studentSubjectId)
            ->delete();

        return response()->json(['message' => 'Draft deleted']);
    }

    public function previewEvaluation($evaluationId, $studentSubjectId)
    {
        $studentId = Auth::id();

        $evaluation = DB::table('student_subjects as ss')
            ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
            ->join('year_section_subjects as yss', 'ss.year_section_subjects_id', '=', 'yss.id')
            ->join('subjects as s', 'yss.subject_id', '=', 's.id')
            ->join('faculty as fac', 'yss.faculty_id', '=', 'fac.faculty_id')
            ->join('users as f', 'fac.faculty_id', '=', 'f.id')
            ->join('user_information as fui', 'f.id', '=', 'fui.user_id')
            ->join('year_section as ys', 'es.year_section_id', '=', 'ys.id')
            ->join('school_years as sy', 'ys.school_year_id', '=', 'sy.id')
            ->join('semesters as sem', 'sy.semester_id', '=', 'sem.id')
            ->join('evaluation as e', 'e.school_year_id', '=', 'sy.id')
            ->where('ss.id', $studentSubjectId)
            ->where('es.student_id', $studentId)
            ->where('e.id', $evaluationId)
            ->select(
                'ss.id as student_subject_id',
                'e.id as evaluation_id',
                'fui.first_name as instructor_first_name',
                'fui.last_name as instructor_last_name',
                's.descriptive_title as subject_title',
                's.subject_code',
                'e.status',
                'sy.start_year',
                'sy.end_year',
                'sem.semester_name',
                'e.start_date',
                'e.end_date'
            )
            ->first();

        if (!$evaluation) {
            abort(403, 'Unauthorized or invalid preview request.');
        }

        $criteria = DB::table('evaluation_questions')
            ->where('evaluation_session_id', $evaluation->evaluation_id)
            ->orderBy('criteria_position')
            ->orderBy('question_position')
            ->get()
            ->groupBy('criteria_id')
            ->map(function ($questions, $criteriaId) {
                return [
                    'id' => $criteriaId,
                    'title' => $questions->first()->criteria_title,
                    'questions' => $questions->map(function ($q) {
                        return [
                            'id' => $q->id,
                            'question_text' => $q->question_text,
                        ];
                    })->values(),
                ];
            })->values();

        $answers = StudentAnswer::where('student_id', $studentId)
            ->where('student_subject_id', $studentSubjectId)
            ->whereHas('evaluationQuestion', function ($query) use ($evaluationId) {
                $query->where('evaluation_session_id', $evaluationId);
            })
            ->pluck('rating', 'evaluation_question_id');

        $feedback = EvaluationFeedback::where('evaluation_session_id', $evaluationId)
            ->where('student_subject_id', $studentSubjectId)
            ->where('student_id', $studentId)
            ->first();

        return Inertia::render('StudentEvaluation/StudentQuestionnaire', [
            'evaluation' => $evaluation,
            'criteria' => $criteria,
            'answers' => $answers,
            'feedback' => $feedback,
            'isPreview' => true,
        ]);
    }


    // ------ Faculty List --------------------------------------------------------------------------------------------------------------------

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
            return Inertia::render('Guidance/FacultyListPage', [
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
        return Inertia::render('Guidance/FacultyListPage', [
            'faculty' => $faculty,
            'schoolYear' => [
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

        return Inertia::render('Guidance/FacultySubjectsPage', [
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
            return Inertia::render('Guidance/FacultyEvaluationResultPage', [
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

        // Step 4: Get total students enrolled for weighting
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
                // Average over total students (even if some didn't answer)
                $avgRating = $totalStudents ? round($sumRatings / $totalStudents, 2) : 0;

                return [
                    'question_id' => $questionId,
                    'question_text' => $qGroup->first()->question_text,
                    'average' => $avgRating,
                ];
            })->values();

            // Criteria average = mean of question averages
            $criteriaAvg = $questions->avg('average');

            return [
                'criteria_id' => $criteriaId,
                'criteria_title' => $criteriaTitle,
                'questions' => $questions,
                'average' => round($criteriaAvg, 2),
            ];
        })->values();

        // Step 7: Compute overall average = mean of criteria averages
        $overallAverage = $criteriaGrouped->avg('average');
        $overallAverage = round($overallAverage, 2);

        // Step 8: Add school year & semester
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

        // Step 11: Get feedback from students
        $feedback = DB::table('evaluation_feedback')
            ->whereIn('student_subject_id', $relatedStudentSubjectIds)
            ->select('strengths', 'weaknesses', 'anonymous', 'created_at')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Guidance/FacultyEvaluationResultPage', [
            'faculty' => $faculty,
            'subject' => $subjectInfo,
            'evaluation' => $evaluation,
            'criteria' => $criteriaGrouped,
            'overallAverage' => $overallAverage,
            'totalRespondents' => $respondents,
            'totalStudentsHandled' => $totalStudents,
            'schoolYear' => $schoolYear,
            'feedback' => $feedback,
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
            return Inertia::render('Guidance/Ranking', [
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

        return Inertia::render('Guidance/Ranking', [
            'hasActiveEval' => true,
            'ranking' => $ranking,
            'schoolYear' => [
                'start_year' => $activeEval->start_year,
                'end_year' => $activeEval->end_year,
            ],
            'semester' => $activeEval->semester_name,
        ]);
    }

    public function facultyReport()
    {
        // Get the logged-in Program Head's user ID
        $facultyId = Auth::id();

        // Pass it to the Inertia page
        return Inertia::render('Guidance/PHFacultyList', [
            'facultyId' => $facultyId,
        ]);
    }





    //--------- Student List --------------------------------------------------------------------------------------------------------------------

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
            return Inertia::render('Guidance/StudentListPage', [
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
        return Inertia::render('Guidance/StudentListPage', [
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


    //-------TRASH BIN--------------------------------------------------------------------------------------------------------------------

    public function Trash()
    {
        $questions = Question::onlyTrashed()->get();
        $criteria = Criteria::onlyTrashed()->get();
        $evaluation = Evaluation::onlyTrashed()->get();

        return Inertia::render('Guidance/TrashPage', [
            'title' => 'Trash Bin',
            'deletedQuestions' => $questions,
            'deletedCriteria' => $criteria,
            'deletedEvaluations' => $evaluation,
        ]);
    }
    public function restore(Request $request)
    {
        $type = $request->type;
        $id = $request->id;

        $model = $this->getModel($type);
        if ($model) {
            $model::onlyTrashed()->where('id', $id)->restore();
        }

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Item restored successfully']);
        }

        return redirect()->back()->with('success', 'Item restored successfully');
    }

    public function delete($type, $id)
    {
        $model = $this->getModel($type);
        if (!$model) {
            $message = 'Invalid type';
            return Inertia::location(url()->previous() . '?message=' . urlencode($message) . '&type=error');
        }

        $item = $model::onlyTrashed()->findOrFail($id);

        // Prevent hard delete for criteria linked to evaluation questions
        if ($type === 'criteria' && $item->questions()->exists()) {
            $message = 'Cannot permanently delete this criteria because it is used in evaluations.';
            return Inertia::location(url()->previous() . '?message=' . urlencode($message) . '&type=error');
        }

        // Optional: Prevent deletion of questions linked to evaluations
        if ($type === 'question' && $item->criteria()->exists()) {
            $message = 'Cannot permanently delete this question because it is used in evaluations.';
            return Inertia::location(url()->previous() . '?message=' . urlencode($message) . '&type=error');
        }

        $item->forceDelete();

        $message = $type === 'question' ? 'Question permanently deleted' : 'Item permanently deleted';
        return Inertia::location(url()->previous() . '?message=' . urlencode($message) . '&type=success');
    }



    public function restoreAll(Request $request)
    {
        Question::onlyTrashed()->restore();
        Criteria::onlyTrashed()->restore();
        Evaluation::onlyTrashed()->restore();

        if ($request->wantsJson()) {
            return response()->json(['message' => 'All items restored']);
        }

        return back()->with('success', 'All items restored!');
    }

    public function deleteAll(Request $request)
    {
        Question::onlyTrashed()->forceDelete();

        // Only delete criteria that are not linked to any evaluation questions
        $criterias = Criteria::onlyTrashed()->get();
        foreach ($criterias as $criteria) {
            if (!$criteria->questions()->exists()) {
                $criteria->forceDelete();
            }
        }

        Evaluation::onlyTrashed()->forceDelete();

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Items permanently deleted where safe!']);
        }

        return back()->with('success', 'Items permanently deleted where safe!');
    }


    private function getModel($type)
    {
        return match ($type) {
            'question' => Question::class,
            'criteria' => Criteria::class,
            'evaluation' => Evaluation::class,
            default => null,
        };
    }

    //-------ARCHIVES--------------------------------------------------------------------------------------------------------------------

    public function Archive()
    {
        return Inertia::render('Guidance/Archive', [
            'title' => 'Archive',
        ]);
    }

    public function evalResult()
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

        return Inertia::render('Guidance/Archive/EvalResult', [
            'title' => 'Evaluation Result',
            'schoolYears' => $schoolYearsWithEval,
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
        return Inertia::render('Guidance/Archive/FacultyList', [
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

        return Inertia::render('Guidance/Archive/FacultySubjects', [
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
            return Inertia::render('Guidance/Archive/EvaluationResult', [
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

        return Inertia::render('Guidance/Archive/EvaluationResult', [
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

        return Inertia::render('Guidance/Archive/StudEval', [
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

        return Inertia::render('Guidance/Archive/StudentsList', [
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

        return Inertia::render('Guidance/Archive/RankEval', [
            'title' => 'Archive',
            'schoolYears' => $schoolYearsWithEval,
        ]);
    }

    public function archiveRanking($schoolYearId = null)
    {
        if (!$schoolYearId) {
            return Inertia::render('Guidance/Archive/RankingList', [
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
            return Inertia::render('Guidance/Archive/RankingList', [
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

        return Inertia::render('Guidance/Archive/RankingList', [
            'hasArchive' => true,
            'ranking' => $ranking,
            'schoolYear' => "{$selectedEval->start_year}-{$selectedEval->end_year}",
            'semester' => $selectedEval->semester_name,
        ]);
    }
}
