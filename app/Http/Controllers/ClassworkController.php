<?php

namespace App\Http\Controllers;

use App\Services\ClassworkDrive;
use App\Support\ClassworkHtml;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class ClassworkController extends Controller
{
    private function isTeacher(
        Request $request,
        int $classId
    ): bool {
        abort_unless($request->user(), 401);

        $class = DB::table('year_section_subjects')
            ->find($classId);

        abort_unless($class, 404);

        return (string) $class->faculty_id
            === (string) $request->user()->id;
    }

    private function teacher(
        Request $request,
        int $classId
    ): void {
        abort_unless(
            $this->isTeacher($request, $classId),
            403,
            'You do not teach this class.'
        );
    }

    private function roster(int $classId)
    {
        return DB::table('student_subjects as ss')
            ->join(
                'enrolled_students as es',
                'es.id',
                '=',
                'ss.enrolled_students_id'
            )
            ->where(
                'ss.year_section_subjects_id',
                $classId
            )
            ->where(
                fn($query) => $query
                    ->whereNull('ss.dropped')
                    ->orWhere('ss.dropped', 0)
            );
    }

    private function enrollment(
        Request $request,
        int $classId
    ): int {
        $rows = $this->roster($classId)
            ->where('es.student_id', $request->user()->id)
            ->pluck('ss.id');

        abort_if(
            $rows->isEmpty(),
            403,
            'You are not enrolled in this class.'
        );

        abort_unless(
            $rows->count() === 1,
            409,
            'Duplicate class enrollment needs to be corrected.'
        );

        return (int) $rows->first();
    }

    private function table(string $kind): string
    {
        abort_unless(
            in_array(
                $kind,
                ['materials', 'assignments', 'submissions'],
                true
            ),
            404
        );

        return 'class_' . $kind;
    }

    private function assessment(
        int $classId,
        int $assessmentId,
        bool $lock = false
    ) {
        $query = DB::table('assessments')
            ->where('id', $assessmentId)
            ->whereNull('deleted_at');

        $assessment = (
            $lock ? $query->lockForUpdate() : $query
        )->first();

        abort_unless(
            $assessment,
            404,
            'Assessment is unavailable.'
        );

        $category = DB::table('grading_categories')
            ->where('id', $assessment->grading_category_id)
            ->where('year_section_subject_id', $classId)
            ->whereNull('deleted_at')
            ->first();

        abort_unless(
            $category,
            404,
            'Assessment does not belong to this class.'
        );

        return $assessment;
    }

    private function item(
        int $classId,
        string $kind,
        int $id,
        bool $lock = false
    ) {
        $query = DB::table($this->table($kind))
            ->where('id', $id)
            ->where('year_section_subject_id', $classId);

        $item = (
            $lock ? $query->lockForUpdate() : $query
        )->first();

        abort_unless($item, 404);

        if ($kind === 'assignments') {
            $this->assessment(
                $classId,
                $item->assessment_id
            );
        }

        return $item;
    }

    private function canRead(
        Request $request,
        int $classId,
        object $item
    ): void {
        if (! $this->isTeacher($request, $classId)) {
            $this->enrollment($request, $classId);

            abort_unless($item->published, 404);
        }
    }

    private function canSubmit(object $assignment): void
    {
        abort_unless(
            $assignment->published,
            403,
            'Assignment is not published.'
        );

        if (
            ! $assignment->allow_late &&
            $assignment->due_at &&
            now()->utc()->greaterThan(
                CarbonImmutable::parse(
                    $assignment->due_at,
                    'UTC'
                )
            )
        ) {
            throw ValidationException::withMessages([
                'assignment' => 'The submission deadline has passed.',
            ]);
        }
    }

    public function index(Request $request, int $classId, string $kind)
    {
        $teacher = $this->isTeacher($request, $classId);

        $studentSubjectId = $teacher
            ? null
            : $this->enrollment($request, $classId);

        $table = $this->table($kind);

        $query = DB::table($table . ' as item')
            ->leftJoin('classwork_topics as topic', function ($join) {
                $join->on('topic.id', '=', 'item.topic_id')
                    ->on(
                        'topic.year_section_subject_id',
                        '=',
                        'item.year_section_subject_id'
                    );
            })
            ->where('item.year_section_subject_id', $classId);

        if (! $teacher) {
            $query->where('item.published', true);
        }

        if ($kind === 'assignments') {
            $query
                ->join('assessments as a', 'a.id', '=', 'item.assessment_id')
                ->join(
                    'grading_categories as gc',
                    'gc.id',
                    '=',
                    'a.grading_category_id'
                )
                ->where('gc.year_section_subject_id', $classId)
                ->whereNull('a.deleted_at')
                ->whereNull('gc.deleted_at')
                ->select(
                    'item.*',
                    'a.name as assessment_name',
                    'a.max_score',
                    'gc.name as category',
                    'gc.period'
                );
        } else {
            $query->select('item.*');
        }

        $items = $query
            ->addSelect(
                'topic.name as topic_name',
                'topic.sort_order as topic_sort_order'
            )
            ->orderByDesc('item.id')
            ->get();

        $links = collect();

        if ($kind === 'assignments' && $items->isNotEmpty()) {
            $links = DB::table('assignment_material as link')
                ->join(
                    'class_materials as material',
                    'material.id',
                    '=',
                    'link.material_id'
                )
                ->whereIn('link.assignment_id', $items->pluck('id'))
                ->where('material.year_section_subject_id', $classId)
                ->when(
                    ! $teacher,
                    fn($query) => $query->where('material.published', true)
                )
                ->orderBy('link.material_id')
                ->get(['link.assignment_id', 'link.material_id'])
                ->groupBy('assignment_id');
        }

        $items->each(function ($item) use ($kind, $links) {
            $item->published = (bool) $item->published;
            $item->body_format = $item->body_format ?? 'text';

            if ($kind === 'assignments') {
                $item->material_ids = $links
                    ->get($item->id, collect())
                    ->pluck('material_id')
                    ->map(fn($id) => (int) $id)
                    ->values()
                    ->all();
            }

            if (property_exists($item, 'assessment_name') && ! $item->title) {
                $item->title = $item->assessment_name;
            }

            if (property_exists($item, 'due_at')) {
                $item->due_at = $item->due_at
                    ? CarbonImmutable::parse($item->due_at, 'UTC')
                    ->toIso8601String()
                    : null;

                $item->allow_late = (bool) $item->allow_late;
            }
        });

        if ($kind === 'assignments' && $items->isNotEmpty()) {
            $teacher
                ? $this->attachClassProgress($classId, $items)
                : $this->attachStudentProgress($studentSubjectId, $items);
        }

        return response()->json([
            'items' => $items,
            'can_manage' => $teacher,
        ]);
    }

    /**
     * Adds the signed-in student's own status to each assignment, so the
     * list can show "Missing", "Turned in" or the score without opening it.
     */
    private function attachStudentProgress(int $studentSubjectId, $items): void
    {
        $submissions = DB::table('class_submissions')
            ->where('student_subject_id', $studentSubjectId)
            ->whereIn('assignment_id', $items->pluck('id'))
            ->get(['assignment_id', 'submitted_at', 'feedback'])
            ->keyBy('assignment_id');

        $scores = DB::table('assessment_scores')
            ->where('student_subject_id', $studentSubjectId)
            ->whereIn('assessment_id', $items->pluck('assessment_id'))
            ->whereNull('deleted_at')
            ->whereNotNull('score')
            ->pluck('score', 'assessment_id');

        $items->each(function ($item) use ($submissions, $scores) {
            $submission = $submissions->get($item->id);
            $score = $scores->get($item->assessment_id);

            $item->mine = [
                'started' => (bool) $submission,
                'submitted_at' => $submission?->submitted_at
                    ? CarbonImmutable::parse($submission->submitted_at, 'UTC')
                    ->toIso8601String()
                    : null,
                'score' => $score === null ? null : (int) $score,
                'has_feedback' => filled($submission?->feedback),
            ];
        });
    }

    /**
     * Adds turned-in and grading counts across the active roster, so the
     * teacher sees what needs grading without opening each assignment.
     */
    private function attachClassProgress(int $classId, $items): void
    {
        $students = $this->roster($classId)->count();
        $roster = fn() => $this->roster($classId)->select('ss.id');

        $turnedIn = DB::table('class_submissions')
            ->whereIn('assignment_id', $items->pluck('id'))
            ->whereNotNull('submitted_at')
            ->whereIn('student_subject_id', $roster())
            ->groupBy('assignment_id')
            ->selectRaw('assignment_id, count(*) as total')
            ->pluck('total', 'assignment_id');

        $graded = DB::table('assessment_scores')
            ->whereIn('assessment_id', $items->pluck('assessment_id'))
            ->whereNull('deleted_at')
            ->whereNotNull('score')
            ->whereIn('student_subject_id', $roster())
            ->groupBy('assessment_id')
            ->selectRaw('assessment_id, count(*) as total')
            ->pluck('total', 'assessment_id');

        // Turned in, but no score recorded yet.
        $toGrade = DB::table('class_submissions as s')
            ->join('class_assignments as ca', 'ca.id', '=', 's.assignment_id')
            ->leftJoin('assessment_scores as sc', function ($join) {
                $join->on('sc.assessment_id', '=', 'ca.assessment_id')
                    ->on('sc.student_subject_id', '=', 's.student_subject_id')
                    ->whereNull('sc.deleted_at');
            })
            ->whereIn('s.assignment_id', $items->pluck('id'))
            ->whereNotNull('s.submitted_at')
            ->whereNull('sc.score')
            ->whereIn('s.student_subject_id', $roster())
            ->groupBy('s.assignment_id')
            ->selectRaw('s.assignment_id, count(*) as total')
            ->pluck('total', 'assignment_id');

        $items->each(function ($item) use ($students, $turnedIn, $graded, $toGrade) {
            $item->progress = [
                'students' => $students,
                'turned_in' => (int) $turnedIn->get($item->id, 0),
                'to_grade' => (int) $toGrade->get($item->id, 0),
                'graded' => (int) $graded->get($item->assessment_id, 0),
            ];
        });
    }

    public function gradingCategories(
        Request $request,
        int $classId
    ) {
        $this->teacher($request, $classId);

        $categories = DB::table('grading_categories')
            ->where('year_section_subject_id', $classId)
            ->whereNull('deleted_at')
            ->orderBy('period')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name', 'period']);

        return response()->json($categories);
    }

    /**
     * Creates a grading assessment from the assignment editor, so teachers
     * do not have to leave the editor for the Grading tab.
     */
    public function storeAssessment(
        Request $request,
        int $classId
    ) {
        $this->teacher($request, $classId);

        $data = $request->validate([
            'grading_category_id' => ['required', 'integer', 'min:1'],
            'name' => ['required', 'string', 'max:255'],
            'max_score' => ['required', 'integer', 'min:1', 'max:10000'],
        ]);

        $assessment = DB::transaction(function () use ($classId, $data) {
            $category = DB::table('grading_categories')
                ->where('id', $data['grading_category_id'])
                ->where('year_section_subject_id', $classId)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->first();

            if (! $category) {
                throw ValidationException::withMessages([
                    'grading_category_id' =>
                    'Choose a grading category from this class.',
                ]);
            }

            $name = trim($data['name']);

            if ($name === '') {
                throw ValidationException::withMessages([
                    'name' => 'Enter an assessment name.',
                ]);
            }

            $sortOrder = (int) DB::table('assessments')
                ->where('grading_category_id', $category->id)
                ->max('sort_order') + 1;

            $id = DB::table('assessments')->insertGetId([
                'grading_category_id' => $category->id,
                'name' => $name,
                'max_score' => $data['max_score'],
                'sort_order' => $sortOrder,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return [
                'id' => $id,
                'name' => $name,
                'max_score' => $data['max_score'],
                'category' => $category->name,
                'period' => $category->period,
            ];
        });

        return response()->json($assessment, 201);
    }

    public function assessments(
        Request $request,
        int $classId
    ) {
        $this->teacher($request, $classId);

        $assessments = DB::table('assessments as a')
            ->join(
                'grading_categories as gc',
                'gc.id',
                '=',
                'a.grading_category_id'
            )
            ->where('gc.year_section_subject_id', $classId)
            ->whereNull('a.deleted_at')
            ->whereNull('gc.deleted_at')
            ->whereNotExists(
                fn($query) => $query
                    ->selectRaw('1')
                    ->from('class_assignments as ca')
                    ->whereColumn(
                        'ca.assessment_id',
                        'a.id'
                    )
            )
            ->orderBy('gc.period')
            ->orderBy('gc.sort_order')
            ->orderBy('a.sort_order')
            ->get([
                'a.id',
                'a.name',
                'a.max_score',
                'gc.name as category',
                'gc.period',
            ]);

        return response()->json($assessments);
    }

    public function save(
        Request $request,
        int $classId,
        string $kind,
        ?int $id = null
    ) {
        $this->teacher($request, $classId);

        $rules = [
            'title' => ['required', 'string', 'max:255'],
            'body_format' => ['sometimes', Rule::in(['text', 'html'])],
            'published' => ['required', 'boolean'],
            'topic_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];

        $data = $request->validate(
            $rules + ($kind === 'materials' ? [
                'description' => ['nullable', 'string', 'max:20000'],
                'material_ids' => ['prohibited'],
            ] : [
                'assessment_id' => $id
                    ? ['prohibited']
                    : [
                        'required',
                        'integer',
                        Rule::unique('class_assignments', 'assessment_id'),
                    ],

                'instructions' => ['nullable', 'string', 'max:20000'],
                'due_at' => ['nullable', 'date'],
                'allow_late' => ['required', 'boolean'],
                'material_ids' => ['sometimes', 'array', 'max:50'],
                'material_ids.*' => [
                    'required',
                    'integer',
                    'min:1',
                    'distinct',
                ],
            ])
        );

        // Omitting these fields preserves existing relationships.
        $syncMaterials = $kind === 'assignments'
            && array_key_exists('material_ids', $data);

        $materialIds = array_map('intval', $data['material_ids'] ?? []);

        unset($data['material_ids']);

        $data['title'] = trim($data['title']);

        $bodyField = $kind === 'materials'
            ? 'description'
            : 'instructions';

        if (array_key_exists($bodyField, $data)) {
            $data['body_format'] = $data['body_format'] ?? 'text';

            if ($data['body_format'] === 'html') {
                $data[$bodyField] = ClassworkHtml::clean(
                    $data[$bodyField]
                );
            }
        } else {
            // A title-only update must preserve the existing body format.
            unset($data['body_format']);
        }

        if (isset($data['due_at'])) {
            $data['due_at'] = CarbonImmutable::parse($data['due_at'])
                ->utc()
                ->format('Y-m-d H:i:s');
        }

        $result = DB::transaction(function () use (
            $classId,
            $kind,
            $id,
            $data,
            $syncMaterials,
            $materialIds
        ) {
            DB::table('year_section_subjects')
                ->where('id', $classId)
                ->lockForUpdate()
                ->first();

            if (isset($data['topic_id'])) {
                $topic = DB::table('classwork_topics')
                    ->where('id', $data['topic_id'])
                    ->where('year_section_subject_id', $classId)
                    ->lockForUpdate()
                    ->first();

                if (! $topic) {
                    throw ValidationException::withMessages([
                        'topic_id' => 'Choose a topic from this class.',
                    ]);
                }
            }

            if ($materialIds !== []) {
                $materials = DB::table('class_materials')
                    ->whereIn('id', $materialIds)
                    ->where('year_section_subject_id', $classId)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get(['id']);

                if ($materials->count() !== count($materialIds)) {
                    throw ValidationException::withMessages([
                        'material_ids' => 'Choose materials from this class.',
                    ]);
                }
            }

            if ($id) {
                $this->item($classId, $kind, $id, true);
            } elseif ($kind === 'assignments') {
                $this->assessment($classId, $data['assessment_id'], true);

                $alreadyLinked = DB::table('class_assignments')
                    ->where('assessment_id', $data['assessment_id'])
                    ->exists();

                if ($alreadyLinked) {
                    throw ValidationException::withMessages([
                        'assessment_id' =>
                        'This assessment already has an assignment.',
                    ]);
                }
            }

            $values = [
                ...$data,
                'updated_at' => now(),
            ];

            if ($id) {
                DB::table($this->table($kind))
                    ->where('id', $id)
                    ->update($values);
            } else {
                $id = DB::table($this->table($kind))->insertGetId([
                    ...$values,
                    'year_section_subject_id' => $classId,
                    'created_at' => now(),
                ]);
            }

            if ($syncMaterials) {
                DB::table('assignment_material')
                    ->where('assignment_id', $id)
                    ->delete();

                if ($materialIds !== []) {
                    DB::table('assignment_material')->insert(
                        array_map(fn($materialId) => [
                            'assignment_id' => $id,
                            'material_id' => $materialId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ], $materialIds)
                    );
                }
            }

            return ['id' => $id];
        });

        return response()->json($result, $id ? 200 : 201);
    }

    public function submissions(
        Request $request,
        int $classId,
        int $id
    ) {
        $this->teacher($request, $classId);

        $assignment = $this->item(
            $classId,
            'assignments',
            $id
        );

        $rows = $this->roster($classId)
            ->join('users as u', 'u.id', '=', 'es.student_id')
            ->leftJoin(
                'user_information as ui',
                'ui.user_id',
                '=',
                'u.id'
            )
            ->leftJoin(
                'class_submissions as s',
                fn($query) => $query
                    ->on(
                        's.student_subject_id',
                        '=',
                        'ss.id'
                    )
                    ->where('s.assignment_id', $id)
            )
            ->leftJoin(
                'assessment_scores as score',
                fn($query) => $query
                    ->on(
                        'score.student_subject_id',
                        '=',
                        'ss.id'
                    )
                    ->where(
                        'score.assessment_id',
                        $assignment->assessment_id
                    )
                    ->whereNull('score.deleted_at')
            )
            ->orderBy('ui.last_name')
            ->orderBy('ui.first_name')
            ->get([
                'ss.id as student_subject_id',
                'u.id as student_id',
                'u.user_id_no',
                'ui.first_name',
                'ui.last_name',
                's.id as submission_id',
                's.answer',
                's.submitted_at',
                's.feedback',
                's.reviewed_at',
                'score.score',
            ]);

        // Unfinished answers remain private to the student.
        $rows->each(function ($row) {
            if (! $row->submitted_at) {
                $row->submission_id = null;
                $row->answer = null;
            }
        });

        return response()->json($rows);
    }

    public function mine(
        Request $request,
        int $classId,
        int $id
    ) {
        $assignment = $this->item(
            $classId,
            'assignments',
            $id
        );

        $this->canRead($request, $classId, $assignment);

        $studentSubjectId = $this->enrollment(
            $request,
            $classId
        );

        $submission = DB::table('class_submissions')
            ->where('assignment_id', $id)
            ->where('student_subject_id', $studentSubjectId)
            ->first();

        $score = DB::table('assessment_scores')
            ->where('assessment_id', $assignment->assessment_id)
            ->where('student_subject_id', $studentSubjectId)
            ->whereNull('deleted_at')
            ->value('score');

        return response()->json([
            'submission' => $submission,
            'score' => $score,
        ]);
    }

    public function draft(
        Request $request,
        int $classId,
        int $id
    ) {
        // Autosave sends the answer; the first call also creates the draft.
        $data = $request->validate([
            'answer' => ['sometimes', 'nullable', 'string', 'max:20000'],
        ]);

        $studentSubjectId = $this->enrollment(
            $request,
            $classId
        );

        $submission = DB::transaction(function () use (
            $data,
            $classId,
            $id,
            $studentSubjectId
        ) {
            // Locking the assignment serializes concurrent autosaves.
            $assignment = $this->item(
                $classId,
                'assignments',
                $id,
                true
            );

            $this->canSubmit($assignment);

            $query = DB::table('class_submissions')
                ->where('assignment_id', $id)
                ->where(
                    'student_subject_id',
                    $studentSubjectId
                );

            $existing = $query->first();

            if (! $existing) {
                DB::table('class_submissions')->insert([
                    'assignment_id' => $id,
                    'student_subject_id' => $studentSubjectId,
                    'answer' => $data['answer'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif (
                array_key_exists('answer', $data)
                && ! $existing->submitted_at
            ) {
                // A submitted answer is final; late autosaves are ignored.
                $query->update([
                    'answer' => $data['answer'],
                    'updated_at' => now(),
                ]);
            }

            return $query->first();
        });

        return response()->json($submission);
    }

    public function submit(
        Request $request,
        int $classId,
        int $id
    ) {
        $data = $request->validate([
            'answer' => ['nullable', 'string', 'max:20000'],
        ]);

        $studentSubjectId = $this->enrollment(
            $request,
            $classId
        );

        DB::transaction(function () use (
            $data,
            $classId,
            $id,
            $studentSubjectId
        ) {
            $assignment = $this->item(
                $classId,
                'assignments',
                $id,
                true
            );

            $query = DB::table('class_submissions')
                ->where('assignment_id', $id)
                ->where(
                    'student_subject_id',
                    $studentSubjectId
                );

            $submission = $query
                ->lockForUpdate()
                ->first();

            // Safe retry if the previous response was lost.
            if ($submission?->submitted_at) {
                return;
            }

            $this->canSubmit($assignment);

            if (! $submission) {
                // An answer can be submitted before its first autosave lands.
                DB::table('class_submissions')->insert([
                    'assignment_id' => $id,
                    'student_subject_id' => $studentSubjectId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $submission = $query->first();
            }

            $hasFiles = DB::table('classwork_files')
                ->where('submission_id', $submission->id)
                ->exists();

            if (
                ! trim($data['answer'] ?? '') &&
                ! $hasFiles
            ) {
                throw ValidationException::withMessages([
                    'answer' =>
                    'Add an answer or upload at least one file.',
                ]);
            }

            $query->update([
                'answer' => $data['answer'] ?? null,
                'submitted_at' => now()->utc(),
                'updated_at' => now(),
            ]);
        });

        return $this->mine($request, $classId, $id);
    }

    public function grade(
        Request $request,
        int $classId,
        int $id,
        int $submissionId
    ) {
        $this->teacher($request, $classId);

        $data = $request->validate([
            'score' => [
                'present',
                'nullable',
                'integer',
                'min:0',
            ],
            'feedback' => [
                'nullable',
                'string',
                'max:10000',
            ],
        ]);

        $assignment = $this->item(
            $classId,
            'assignments',
            $id
        );

        DB::transaction(function () use (
            $classId,
            $id,
            $submissionId,
            $assignment,
            $data
        ) {
            // Same lock used by your assessment maximum/score writes.
            $assessment = $this->assessment(
                $classId,
                $assignment->assessment_id,
                true
            );

            $submission = DB::table('class_submissions')
                ->where('id', $submissionId)
                ->where('assignment_id', $id)
                ->lockForUpdate()
                ->first();

            abort_unless(
                $submission && $submission->submitted_at,
                422,
                'This work has not been submitted.'
            );

            abort_unless(
                $this->roster($classId)
                    ->where(
                        'ss.id',
                        $submission->student_subject_id
                    )
                    ->exists(),
                403
            );

            if (
                $data['score'] !== null &&
                $data['score'] > $assessment->max_score
            ) {
                throw ValidationException::withMessages([
                    'score' =>
                    "Maximum score is {$assessment->max_score}.",
                ]);
            }

            $key = [
                'assessment_id' => $assessment->id,
                'student_subject_id' =>
                $submission->student_subject_id,
            ];

            // Includes soft-deleted records so the unique key is reused.
            $existing = DB::table('assessment_scores')
                ->where($key)
                ->first();

            $values = [
                'score' => $data['score'],
                'deleted_at' => null,
                'updated_at' => now(),
            ];

            if ($existing) {
                DB::table('assessment_scores')
                    ->where('id', $existing->id)
                    ->update($values);
            } else {
                DB::table('assessment_scores')->insert([
                    ...$key,
                    ...$values,
                    'created_at' => now(),
                ]);
            }

            DB::table('class_submissions')
                ->where('id', $submissionId)
                ->update([
                    'feedback' => $data['feedback'] ?? null,
                    'reviewed_at' => $data['score'] === null
                        ? null
                        : now(),
                    'updated_at' => now(),
                ]);
        });

        return response()->json(['saved' => true]);
    }

    private function owner(
        Request $request,
        int $classId,
        string $kind,
        int $id,
        bool $write = false,
        bool $lock = false
    ): array {
        if ($kind !== 'submissions') {
            $item = $this->item(
                $classId,
                $kind,
                $id,
                $lock
            );

            if ($write) {
                $this->teacher($request, $classId);
            } else {
                $this->canRead($request, $classId, $item);
            }

            return [
                $kind === 'materials'
                    ? 'material_id'
                    : 'assignment_id',
                $item,
            ];
        }

        $query = DB::table('class_submissions')
            ->where('id', $id);

        $submission = (
            $lock ? $query->lockForUpdate() : $query
        )->first();

        abort_unless($submission, 404);

        $assignment = $this->item(
            $classId,
            'assignments',
            $submission->assignment_id
        );

        if ($this->isTeacher($request, $classId)) {
            abort_if(
                $write,
                403,
                'Students upload their own submission files.'
            );

            abort_unless(
                $submission->submitted_at,
                403,
                'This is still a student draft.'
            );
        } else {
            $studentSubjectId = $this->enrollment(
                $request,
                $classId
            );

            abort_unless(
                (string) $submission->student_subject_id
                    === (string) $studentSubjectId,
                403
            );

            abort_unless($assignment->published, 404);

            if ($write) {
                $this->canSubmit($assignment);

                abort_if(
                    $submission->submitted_at,
                    409,
                    'This submission is already final.'
                );
            }
        }

        return ['submission_id', $submission];
    }

    public function files(
        Request $request,
        int $classId,
        string $kind,
        int $id
    ) {
        [$column] = $this->owner(
            $request,
            $classId,
            $kind,
            $id
        );

        $files = DB::table('classwork_files')
            ->where($column, $id)
            ->orderBy('id')
            ->get([
                'id',
                'name',
                'mime_type',
                'size',
            ]);

        return response()->json($files);
    }

    private function drive(Closure $work)
    {
        try {
            return $work();
        } catch (Throwable $error) {
            report($error);

            abort(
                503,
                'Google Drive is unavailable. Please try again.'
            );
        }
    }

    public function upload(
        Request $request,
        ClassworkDrive $drive,
        int $classId,
        string $kind,
        int $id
    ) {
        $this->owner(
            $request,
            $classId,
            $kind,
            $id,
            true
        );

        // Any file type, up to 100 MB.
        $request->validate([
            'file' => ['required', 'file', 'max:102400'],
        ]);

        $file = $request->file('file');

        // Network upload happens outside the database transaction.
        $remote = $this->drive(
            fn() => $drive->upload(
                $classId,
                $kind,
                $id,
                $file
            )
        );

        try {
            $fileId = DB::transaction(function () use (
                $request,
                $classId,
                $kind,
                $id,
                $file,
                $remote
            ) {
                // Recheck permissions and submission state after upload.
                [$column] = $this->owner(
                    $request,
                    $classId,
                    $kind,
                    $id,
                    true,
                    true
                );

                $name = preg_replace(
                    '/[\x00-\x1F\x7F\/\\\\]/u',
                    '_',
                    $file->getClientOriginalName()
                );

                return DB::table('classwork_files')
                    ->insertGetId([
                        $column => $id,
                        ...$remote,
                        'name' => mb_substr($name, 0, 255),
                        'size' => $file->getSize(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
            });
        } catch (Throwable $error) {
            try {
                $drive->trash($remote['drive_file_id']);
            } catch (Throwable $cleanup) {
                report($cleanup);
            }

            throw $error;
        }

        return response()->json(
            ['id' => $fileId],
            201
        );
    }

    public function download(
        Request $request,
        ClassworkDrive $drive,
        int $classId,
        int $fileId
    ) {
        $file = DB::table('classwork_files')
            ->find($fileId);

        abort_unless($file, 404);

        $kind = $file->material_id
            ? 'materials'
            : ($file->assignment_id
                ? 'assignments'
                : 'submissions');

        $ownerId = $file->material_id
            ?? $file->assignment_id
            ?? $file->submission_id;

        $this->owner(
            $request,
            $classId,
            $kind,
            $ownerId
        );

        $stream = $this->drive(
            fn() => $drive->stream($file->drive_file_id)
        );

        $inline = $request->boolean('preview')
            && in_array($file->mime_type, [
                'application/pdf',
                'image/png',
                'image/jpeg',
                'image/gif',
                'image/webp',
            ], true);

        return response()->streamDownload(
            function () use ($stream) {
                try {
                    while (! $stream->eof()) {
                        echo $stream->read(8192);
                    }
                } finally {
                    $stream->close();
                }
            },
            $file->name,
            [
                'Content-Type' => $file->mime_type,
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store',
            ],
            $inline ? 'inline' : 'attachment'
        );
    }

    public function topics(Request $request, int $classId)
    {
        $this->teacher($request, $classId);

        $topics = DB::table('classwork_topics')
            ->where('year_section_subject_id', $classId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name', 'sort_order']);

        return response()->json($topics);
    }

    public function storeTopic(Request $request, int $classId)
    {
        $this->teacher($request, $classId);

        if (is_string($request->input('name'))) {
            $request->merge([
                'name' => trim($request->input('name')),
            ]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $topic = DB::transaction(function () use ($classId, $data) {
            DB::table('year_section_subjects')
                ->where('id', $classId)
                ->lockForUpdate()
                ->first();

            $topics = DB::table('classwork_topics')
                ->where('year_section_subject_id', $classId);

            if ((clone $topics)->where('name', $data['name'])->exists()) {
                throw ValidationException::withMessages([
                    'name' => 'This class already has that topic.',
                ]);
            }

            $sortOrder = (int) ($topics->max('sort_order') ?? -1) + 1;

            $id = DB::table('classwork_topics')->insertGetId([
                'year_section_subject_id' => $classId,
                'name' => $data['name'],
                'sort_order' => $sortOrder,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return [
                'id' => $id,
                'name' => $data['name'],
                'sort_order' => $sortOrder,
            ];
        });

        return response()->json($topic, 201);
    }
}
