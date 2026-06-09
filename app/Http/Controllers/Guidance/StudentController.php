<?php

namespace App\Http\Controllers\Guidance;

use Inertia\Inertia;
use App\Models\StudentDraft;
use Illuminate\Http\Request;
use App\Models\StudentAnswer;
use App\Models\EvaluationFeedback;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use App\Services\FeedbackAnalyzerService;



class StudentController extends Controller
{
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

        $evaluations = DB::select("
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
            WHERE e.status = 'active'
            AND es.student_id = ?
        ", [$studentId]);

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

    public function submit(Request $request, FeedbackAnalyzerService $analyzer)
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

        DB::transaction(function () use ($request, $studentId, $anonymous, $analyzer) {

            // save answers
            foreach ($request->answers as $evaluationQuestionId => $rating) {
                StudentAnswer::create([
                    'evaluation_question_id' => $evaluationQuestionId,
                    'student_id' => $studentId,
                    'student_subject_id' => $request->student_subject_id,
                    'rating' => $rating,
                    'anonymous' => 1,
                ]);
            }

            $feedback = EvaluationFeedback::create([
                'evaluation_session_id' => $request->evaluation_id,
                'student_subject_id' => $request->student_subject_id,
                'student_id' => $studentId,
                'strengths' => $request->strengths,
                'weaknesses' => $request->weaknesses,
                'anonymous' => 1,
            ]);

            $analyzer->analyze($feedback);
        });

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
}
