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

class GuidanceController extends Controller
{
public function index()
{
    // Get the active school year with its semester
    $schoolYear = SchoolYear::where('is_current', 1)
        ->with('semester') // if you have a related semester model
        ->first();

    // Count the number of enrolled students in the active school year
    $totalEnrolled = EnrolledStudent::whereHas('yearSection.schoolYear', function ($query) {
        $query->where('is_current', 1);
    })->count();

    // Count the number of faculty assigned during the active school year
    $facultyCount = DB::table('faculty as f')
        ->join('users as u', 'f.faculty_id', '=', 'u.id')
        ->join('year_section_subjects as yss', 'u.id', '=', 'yss.faculty_id')
        ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
        ->join('school_years as sy', 'ys.school_year_id', '=', 'sy.id')
        ->join('semesters as s', 'sy.semester_id', '=', 's.id')
        ->where('sy.is_current', 1)
        ->distinct('u.id')
        ->count('u.id');

    // Render dashboard with all data
    return Inertia::render('Guidance/Dashboard', [
        'schoolYear' => $schoolYear,
        'title' => 'Guidance Dashboard',
        'totalEnrolled' => $totalEnrolled,
        'facultyCount' => $facultyCount,
    ]);
}


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
            'title' => 'required|string|max:255',
            'questions' => 'nullable|array',
            'questions.*' => 'nullable|string'
        ]);

        $criteria = Criteria::create([
            'title' => $validated['title'],
        ]);

        // Save questions if provided
        if (!empty($validated['questions'])) {
            foreach ($validated['questions'] as $q) {
                if (trim($q) !== '') {
                    $criteria->questions()->create([
                        'question' => $q
                    ]);
                }
            }
        }

        return redirect()->route('guidance.criteria')->with('success', 'Criteria and questions added successfully.');
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

public function stud_eval_questionnaire($id)
{
    $studentId = auth()->id();

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
        $studentId = auth()->id();

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
    \App\Models\StudentDraft::where('student_id', $studentId)
        ->where('evaluation_id', $request->evaluation_id)
        ->where('student_subject_id', $request->student_subject_id)
        ->delete();

    return redirect()->route('student.evaluation')->with('success', 'Evaluation submitted successfully.');
}


public function loadDraft($evaluationId, $studentSubjectId)
{
    $draft = \App\Models\StudentDraft::where('student_id', auth()->id())
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

    $draft = \App\Models\StudentDraft::updateOrCreate(
        [
            'student_id' => auth()->id(),
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
    \App\Models\StudentDraft::where('student_id', auth()->id())
        ->where('evaluation_id', $evaluationId)
        ->where('student_subject_id', $studentSubjectId)
        ->delete();

    return response()->json(['message' => 'Draft deleted']);
}

public function previewEvaluation($evaluationId, $studentSubjectId)
{
    $studentId = auth()->id();

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


public function facultyList(Request $request)
{
    // Get active school year with its semester
    $activeSy = DB::table('school_years as sy')
        ->join('semesters as s', 'sy.semester_id', '=', 's.id')
        ->where('sy.is_current', 1)
        ->select('sy.*', 's.semester_name')
        ->first();

    // Get search and department inputs
    $search = strtolower($request->input('search', ''));
    $departmentId = $request->input('department', '');

    // Build the query
    $query = DB::table('faculty as f')
        ->join('users as u', 'f.faculty_id', '=', 'u.id')
        ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
        ->leftJoin('department as d', 'f.department_id', '=', 'd.id')
        ->join('year_section_subjects as yss', 'u.id', '=', 'yss.faculty_id')
        ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
        ->join('school_years as sy', 'ys.school_year_id', '=', 'sy.id')
        ->join('semesters as s', 'sy.semester_id', '=', 's.id')
        ->where('ys.school_year_id', $activeSy->id)
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
        $query->whereRaw("LOWER(CONCAT(ui.last_name, ', ', ui.first_name, ' ', COALESCE(ui.middle_name, ''))) LIKE ?", ["%{$search}%"]);
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

    // Return to the frontend with all data
    return Inertia::render('Guidance/FacultyListPage', [
        'faculty' => $faculty,
        'schoolYear' => $activeSy,
        'semester' => $activeSy->semester_name,
        'departments' => $departments,
        'filters' => [
            'department' => $departmentId,
            'search' => $search,
        ],
    ]);
}





public function showSubjects($id)
{
    $activeSy = DB::table('school_years')->where('is_current', 1)->first();

    $subjects = DB::table('year_section_subjects as yss')
        ->join('subjects as s', 'yss.subject_id', '=', 's.id')
        ->join('year_section as ys', 'yss.year_section_id', '=', 'ys.id')
        ->join('student_subjects as ss', 'yss.id', '=', 'ss.year_section_subjects_id')
        ->where('yss.faculty_id', $id)
        ->where('ys.school_year_id', $activeSy->id)
        ->select('s.subject_code', 's.descriptive_title', DB::raw('MIN(ss.id) as student_subject_id'))
        ->groupBy('s.subject_code', 's.descriptive_title')
        ->get();

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
        ->select(
            'e.*',
            'sy.start_year',
            'sy.end_year',
            'sem.semester_name'
        )
        ->first();

    if (!$evaluation) {
        abort(404, 'No active evaluation found.');
    }

    // Step 4: Get all answers with evaluation question & criteria
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

    // Step 5: Group answers per criteria/question
    $criteriaGrouped = $answers->groupBy('criteria_id')->map(function ($group, $criteriaId) {
        $criteriaTitle = $group->first()->criteria_title;

        $questions = $group->groupBy('question_id')->map(function ($qGroup, $questionId) {
            return [
                'question_id' => $questionId,
                'question_text' => $qGroup->first()->question_text,
                'average' => round($qGroup->avg('rating'), 2),
                'responses' => $qGroup->count(),
            ];
        })->values();

        return [
            'criteria_id' => $criteriaId,
            'criteria_title' => $criteriaTitle,
            'questions' => $questions,
            'average' => round($questions->avg('average'), 2),
        ];
    })->values();

    // Step 6: Overall average
    $overallAverage = round($criteriaGrouped->avg('average'), 2);

    // ✅ Add school year & semester as separate object
    $schoolYear = [
        'start_year' => $evaluation->start_year,
        'end_year' => $evaluation->end_year,
        'semester' => $evaluation->semester_name,
        'formatted' => 'S.Y. ' . $evaluation->start_year . '-' . $evaluation->end_year . ' (' . $evaluation->semester_name . ')',
    ];

    // Step 7: Count unique student respondents
    $respondents = DB::table('student_answers')
        ->whereIn('student_subject_id', $relatedStudentSubjectIds)
        ->distinct('student_id')
        ->count('student_id');

    // Step 7.5: Count total unique students assigned to the related subject
    $totalStudents = DB::table('student_subjects as ss')
        ->join('enrolled_students as es', 'ss.enrolled_students_id', '=', 'es.id')
        ->whereIn('ss.id', $relatedStudentSubjectIds)
        ->distinct('es.student_id')
        ->count('es.student_id');

    // Step 8: Get faculty info
    $faculty = DB::table('users as u')
        ->join('user_information as ui', 'u.id', '=', 'ui.user_id')
        ->where('u.id', $facultyId)
        ->select('u.id', 'ui.first_name', 'ui.last_name', 'ui.middle_name')
        ->first();

    // Step 9: Get feedback from students
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


public function studentList()
{
    $schoolYear = SchoolYear::where('is_current', 1)
        ->with('semester')
        ->first();

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
            DB::raw("
                CASE 
                    WHEN COUNT(sa.id) > 0 THEN 'Already Evaluated'
                    ELSE 'Not Yet Evaluated'
                END as evaluation_status
            ")
        )
        ->where('ys.school_year_id', $schoolYear->id)
        ->groupBy('u.id', 'ui.first_name', 'ui.middle_name', 'ui.last_name', 'c.course_name', 'ys.section')
        ->orderBy('ui.last_name', 'asc')
        ->orderBy('ui.first_name', 'asc')
        ->paginate(1000);

    return Inertia::render('Guidance/StudentListPage', [
        'schoolYear' => $schoolYear,
        'semester' => $schoolYear->semester->semester_name ?? 'N/A',
        'students' => $students,
    ]);
}



public function studentSubjects($studentId)
{
    $schoolYear = SchoolYear::where('is_current', 1)->first();

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




}
