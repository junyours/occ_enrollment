<?php

namespace App\Http\Controllers;

use App\Services\ClassAnnouncements;
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
                ['materials', 'assignments', 'submissions', 'announcements'],
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

            // Archived materials (and their files) are hidden from students.
            abort_if(! empty($item->archived_at), 404);
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

    // File type presets a teacher can pick for student uploads.
    private const FILE_PRESETS = [
        'documents' => ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'ppt', 'pptx', 'odp', 'xls', 'xlsx', 'ods', 'csv'],
        'images' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'],
        'media' => ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'],
    ];

    // Per file, for teacher attachments and student work alike.
    private const MAX_UPLOAD_MB = 100;

    // Files a student can attach to one assignment.
    private const SUBMISSION_MAX_FILES = 5;

    private function decodeJson($value): ?array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || $value === '') {
            return null;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : null;
    }

    // How students hand in an assignment; each takes exactly one.
    private const SUBMISSION_TYPES = ['files', 'questions', 'links'];

    /**
     * What students hand in for an assignment: files (the default),
     * answers to questions, or links. Only the chosen type is enabled, and
     * it is what makes the work complete, so it is always required. The
     * other sections keep their options for when the teacher switches.
     * Answers are plain text, and the file limits are fixed
     * (SUBMISSION_MAX_FILES, MAX_UPLOAD_MB).
     */
    private function normalizeSubmissionSettings(?array $raw): array
    {
        $raw ??= [];
        $files = is_array($raw['files'] ?? null) ? $raw['files'] : [];
        $links = is_array($raw['links'] ?? null) ? $raw['links'] : [];

        $type = in_array($raw['type'] ?? null, self::SUBMISSION_TYPES, true)
            ? $raw['type']
            : 'files';

        $types = $files['types'] ?? 'any';
        $types = in_array($types, ['any', 'documents', 'images', 'media', 'custom'], true) ? $types : 'any';

        $extensions = collect(is_array($files['extensions'] ?? null) ? $files['extensions'] : [])
            ->map(fn($extension) => strtolower(ltrim(trim((string) $extension), '.')))
            ->filter(fn($extension) => preg_match('/^[a-z0-9]{1,10}$/', $extension) === 1)
            ->unique()
            ->take(20)
            ->values()
            ->all();

        if ($types === 'custom' && $extensions === []) {
            $types = 'any';
        }

        // Accept "github.com", "https://www.github.com/" and similar.
        $domain = strtolower(trim((string) ($links['domain'] ?? '')));
        $domain = preg_replace('#^[a-z]+://#', '', $domain);
        $domain = preg_replace('#^www\.#', '', $domain);
        $domain = rtrim(explode('/', $domain)[0], '.');
        $domain = preg_match('/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/', $domain) === 1 ? $domain : null;

        return [
            'type' => $type,
            'files' => [
                'enabled' => $type === 'files',
                'required' => $type === 'files',
                'types' => $types,
                'extensions' => $types === 'custom' ? $extensions : [],
            ],
            'links' => [
                'enabled' => $type === 'links',
                'required' => $type === 'links',
                'domain' => $domain,
                'max_links' => max(1, min(10, (int) ($links['max_links'] ?? 5))),
            ],
        ];
    }

    private function submissionSettings(object $assignment): array
    {
        return $this->normalizeSubmissionSettings(
            $this->decodeJson($assignment->submission_settings ?? null)
        );
    }

    /** Null means any file type. */
    private function allowedExtensions(array $files): ?array
    {
        return match ($files['types']) {
            'any' => null,
            'custom' => $files['extensions'],
            default => self::FILE_PRESETS[$files['types']],
        };
    }

    // An answer without surrounding spaces, to tell whether anything was written.
    private function answerText(?string $answer): string
    {
        return trim(str_replace("\u{00A0}", ' ', $answer ?? ''));
    }

    private function cleanLinks($links): array
    {
        return collect(is_array($links) ? $links : [])
            ->map(fn($link) => trim((string) $link))
            ->filter()
            ->values()
            ->all();
    }

    private function linkProblem(string $url, array $settings): ?string
    {
        $parts = parse_url($url);
        $scheme = strtolower($parts['scheme'] ?? '');
        $host = strtolower($parts['host'] ?? '');

        if (
            filter_var($url, FILTER_VALIDATE_URL) === false
            || ! in_array($scheme, ['http', 'https'], true)
            || $host === ''
        ) {
            return "“{$url}” is not a valid web address. Start it with https://.";
        }

        $domain = $settings['domain'];

        if ($domain && $host !== $domain && ! str_ends_with($host, '.' . $domain)) {
            return "Links must be on {$domain}.";
        }

        return null;
    }

    // Decodes stored JSON before a submission is sent to the browser.
    private function presentSubmission(?object $row): ?object
    {
        if (! $row) {
            return $row;
        }

        $row->links = $this->decodeJson($row->links ?? null) ?? [];

        // Answers live in class_submission_answers now; the old column only
        // keeps answers written before questions existed.
        unset($row->answer);

        return $row;
    }

    // Question types a teacher can add. Multiple choice comes later.
    private const QUESTION_TYPES = ['essay', 'short_answer'];

    private const SHORT_ANSWER_MAX = 500;

    /** Active questions grouped by assignment id, in order. */
    private function questionsFor($assignmentIds)
    {
        return DB::table('class_assignment_questions')
            ->whereIn('assignment_id', $assignmentIds)
            ->whereNull('deleted_at')
            ->orderBy('position')
            ->orderBy('id')
            ->get(['id', 'assignment_id', 'type', 'prompt', 'required'])
            ->map(function ($question) {
                $question->id = (int) $question->id;
                $question->assignment_id = (int) $question->assignment_id;
                $question->required = (bool) $question->required;

                return $question;
            })
            ->groupBy('assignment_id');
    }

    private function questionList(int $assignmentId)
    {
        return $this->questionsFor([$assignmentId])
            ->get($assignmentId, collect())
            ->values();
    }

    /**
     * Turned-in answers to questions removed afterwards (or dropped when the
     * assignment switched to another type), so students still see them.
     */
    private function removedAnswers(int $submissionId): array
    {
        return DB::table('class_submission_answers as answer')
            ->join(
                'class_assignment_questions as question',
                'question.id',
                '=',
                'answer.question_id'
            )
            ->where('answer.submission_id', $submissionId)
            ->whereNotNull('question.deleted_at')
            ->whereNotNull('answer.answer')
            ->where('answer.answer', '<>', '')
            ->orderBy('question.position')
            ->orderBy('question.id')
            ->get(['answer.question_id', 'answer.answer', 'question.type', 'question.prompt'])
            ->map(fn($row) => [
                'question_id' => (int) $row->question_id,
                'answer' => $row->answer,
                'type' => $row->type,
                'prompt' => $row->prompt,
            ])
            ->all();
    }

    /** A submission's answers as question id => answer. */
    private function answersFor(int $submissionId): array
    {
        return DB::table('class_submission_answers')
            ->where('submission_id', $submissionId)
            ->pluck('answer', 'question_id')
            ->all();
    }

    /**
     * Keeps answers to the assignment's active questions only, as plain
     * text: short answers become one trimmed line, essays stay as typed.
     * Empty answers become null so a cleared box is saved.
     */
    private function cleanAnswers(array $input, $questions): array
    {
        $byId = $questions->keyBy('id');
        $answers = [];

        foreach ($input as $questionId => $answer) {
            $question = is_int($questionId) ? $byId->get($questionId) : null;

            if (! $question) {
                continue;
            }

            $answer = (string) ($answer ?? '');

            if ($question->type === 'short_answer') {
                $answer = trim(preg_replace('/\s+/u', ' ', $answer) ?? '');

                if (mb_strlen($answer) > self::SHORT_ANSWER_MAX) {
                    throw ValidationException::withMessages([
                        "answers.{$question->id}" => 'Keep short answers under ' . self::SHORT_ANSWER_MAX . ' characters.',
                    ]);
                }
            }

            $answers[$question->id] = $answer === '' ? null : $answer;
        }

        return $answers;
    }

    private function saveAnswers(int $submissionId, array $answers): void
    {
        if ($answers === []) {
            return;
        }

        $now = now();
        $rows = [];

        foreach ($answers as $questionId => $answer) {
            $rows[] = [
                'submission_id' => $submissionId,
                'question_id' => $questionId,
                'answer' => $answer,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('class_submission_answers')->upsert(
            $rows,
            ['submission_id', 'question_id'],
            ['answer', 'updated_at']
        );
    }

    /**
     * Saves the editor's question list in order and returns the ids in that
     * order. Questions left out are soft-deleted, so answers already turned
     * in for them are kept.
     */
    private function syncQuestions(int $assignmentId, array $questions): array
    {
        $existing = DB::table('class_assignment_questions')
            ->where('assignment_id', $assignmentId)
            ->whereNull('deleted_at')
            ->lockForUpdate()
            ->pluck('id')
            ->map(fn($id) => (int) $id)
            ->all();

        $now = now();
        $kept = [];
        $ids = [];

        foreach (array_values($questions) as $index => $question) {
            $values = [
                'position' => $index + 1,
                'type' => $question['type'],
                'prompt' => $question['prompt'],
                'required' => $question['required'],
                'updated_at' => $now,
            ];

            // An unknown id (for example, a question another tab removed)
            // is saved as a new question.
            if ($question['id'] && in_array($question['id'], $existing, true)) {
                DB::table('class_assignment_questions')
                    ->where('id', $question['id'])
                    ->update($values);

                $kept[] = $ids[] = $question['id'];
            } else {
                $ids[] = (int) DB::table('class_assignment_questions')->insertGetId([
                    ...$values,
                    'assignment_id' => $assignmentId,
                    'created_at' => $now,
                ]);
            }
        }

        $removed = array_values(array_diff($existing, $kept));

        if ($removed !== []) {
            DB::table('class_assignment_questions')
                ->whereIn('id', $removed)
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
        }

        return $ids;
    }

    public function index(Request $request, int $classId, string $kind)
    {
        $teacher = $this->isTeacher($request, $classId);

        $studentSubjectId = $teacher
            ? null
            : $this->enrollment($request, $classId);

        $table = $this->table($kind);

        $query = DB::table($table . ' as item')
            ->where('item.year_section_subject_id', $classId);

        if (! $teacher) {
            $query->where('item.published', true);

            if ($kind === 'materials') {
                $query->whereNull('item.archived_at');
            }
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
            ->orderByDesc('item.id')
            ->get();

        $links = collect();
        $questions = collect();

        if ($kind === 'assignments' && $items->isNotEmpty()) {
            $questions = $this->questionsFor($items->pluck('id'));

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
                    fn($query) => $query
                        ->where('material.published', true)
                        ->whereNull('material.archived_at')
                )
                ->orderBy('link.material_id')
                ->get(['link.assignment_id', 'link.material_id'])
                ->groupBy('assignment_id');
        }

        $items->each(function ($item) use ($kind, $links, $questions) {
            $item->published = (bool) $item->published;
            $item->body_format = $item->body_format ?? 'text';

            if ($kind === 'assignments') {
                $item->submission_settings = $this->submissionSettings($item);

                $item->questions = $item->submission_settings['type'] !== 'questions'
                    ? []
                    : $questions
                    ->get($item->id, collect())
                    ->map(fn($question) => [
                        'id' => $question->id,
                        'type' => $question->type,
                        'prompt' => $question->prompt,
                        'required' => $question->required,
                    ])
                    ->values()
                    ->all();

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

            if (property_exists($item, 'archived_at')) {
                $item->archived_at = $item->archived_at
                    ? CarbonImmutable::parse($item->archived_at, 'UTC')
                    ->toIso8601String()
                    : null;
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

        if ($kind === 'materials' && $teacher && $items->isNotEmpty()) {
            $this->attachLinkedAssignments($classId, $items);
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

    /**
     * Lists the assignments each material is linked to, so the teacher
     * sees what a permanent delete would affect.
     */
    private function attachLinkedAssignments(int $classId, $items): void
    {
        $links = DB::table('assignment_material as link')
            ->join('class_assignments as a', 'a.id', '=', 'link.assignment_id')
            ->leftJoin('assessments as s', 's.id', '=', 'a.assessment_id')
            ->whereIn('link.material_id', $items->pluck('id'))
            ->where('a.year_section_subject_id', $classId)
            ->orderBy('a.id')
            ->get(['link.material_id', 'a.id', 'a.title', 's.name as assessment_name'])
            ->groupBy('material_id');

        $items->each(function ($item) use ($links) {
            $item->linked_assignments = $links
                ->get($item->id, collect())
                ->map(fn($row) => [
                    'id' => (int) $row->id,
                    'title' => $row->title ?: $row->assessment_name,
                ])
                ->values()
                ->all();
        });
    }

    public function archive(
        Request $request,
        int $classId,
        int $id
    ) {
        $this->teacher($request, $classId);

        $data = $request->validate([
            'archived' => ['required', 'boolean'],
        ]);

        $this->item($classId, 'materials', $id);

        DB::table('class_materials')
            ->where('id', $id)
            ->where('year_section_subject_id', $classId)
            ->update([
                'archived_at' => $data['archived'] ? now()->utc() : null,
                'updated_at' => now(),
            ]);

        return response()->json([
            'id' => $id,
            'archived' => (bool) $data['archived'],
        ]);
    }

    /**
     * Permanently deletes an archived material, its file records and its
     * assignment links, then moves its files to the Drive trash.
     */
    public function destroyMaterial(
        Request $request,
        ClassworkDrive $drive,
        int $classId,
        int $id
    ) {
        $this->teacher($request, $classId);

        $driveIds = DB::transaction(function () use ($classId, $id) {
            $material = $this->item($classId, 'materials', $id, true);

            if (! $material->archived_at) {
                throw ValidationException::withMessages([
                    'material' => 'Archive this material before deleting it.',
                ]);
            }

            $driveIds = DB::table('classwork_files')
                ->where('material_id', $id)
                ->pluck('drive_file_id')
                ->all();

            DB::table('classwork_files')->where('material_id', $id)->delete();
            DB::table('assignment_material')->where('material_id', $id)->delete();
            DB::table('class_materials')->where('id', $id)->delete();

            return $driveIds;
        });

        return response()->json([
            'deleted' => true,
            'files_not_trashed' => $this->trashFiles($drive, $driveIds),
        ]);
    }

    /**
     * Moves deleted items' files to the Drive trash, after the database
     * commit: a failure leaves a file in Drive but never a broken record in
     * the app. Returns how many could not be trashed.
     */
    private function trashFiles(ClassworkDrive $drive, array $driveIds): int
    {
        $notTrashed = 0;

        foreach ($driveIds as $fileId) {
            try {
                $drive->trash($fileId);
            } catch (Throwable $error) {
                report($error);
                $notTrashed++;
            }
        }

        return $notTrashed;
    }

    // ---- Copying materials between classes ----

    // Materials copied in one go.
    private const COPY_MATERIALS_MAX = 20;

    /**
     * The teacher's other classes that have materials, from any school year
     * (newest first, same subject first within a year), to copy from.
     */
    public function materialSources(Request $request, int $classId)
    {
        $this->teacher($request, $classId);

        $subjectId = DB::table('year_section_subjects')->where('id', $classId)->value('subject_id');

        $classes = DB::table('year_section_subjects as ys')
            ->join('year_section as sec', 'sec.id', '=', 'ys.year_section_id')
            ->join('course', 'course.id', '=', 'sec.course_id')
            ->join('subjects as s', 's.id', '=', 'ys.subject_id')
            ->leftJoin('school_years as sy', 'sy.id', '=', 'sec.school_year_id')
            ->leftJoin('semesters as sem', 'sem.id', '=', 'sy.semester_id')
            ->where('ys.faculty_id', $request->user()->id)
            ->where('ys.id', '!=', $classId)
            ->whereExists(fn($query) => $query
                ->selectRaw('1')
                ->from('class_materials as m')
                ->whereColumn('m.year_section_subject_id', 'ys.id'))
            ->orderByDesc('sy.start_year')
            ->orderByDesc('sy.semester_id')
            ->orderByRaw('ys.subject_id = ? desc', [$subjectId])
            ->orderBy('s.subject_code')
            ->orderBy('course.course_name_abbreviation')
            ->orderBy('sec.year_level_id')
            ->orderBy('sec.section')
            ->get([
                'ys.id',
                'ys.subject_id',
                's.subject_code',
                's.descriptive_title',
                'course.course_name_abbreviation',
                'sec.year_level_id',
                'sec.section',
                'sy.start_year',
                'sy.end_year',
                'sem.semester_name',
            ]);

        $counts = DB::table('class_materials')
            ->whereIn('year_section_subject_id', $classes->pluck('id'))
            ->groupBy('year_section_subject_id')
            ->selectRaw('year_section_subject_id, count(*) as total')
            ->pluck('total', 'year_section_subject_id');

        return response()->json($classes->map(fn($row) => [
            'id' => (int) $row->id,
            'subject' => $row->subject_code ?: $row->descriptive_title,
            'title' => $row->descriptive_title,
            'section' => $row->course_name_abbreviation . '-' . $row->year_level_id . $row->section,
            'school_year' => $row->start_year
                ? trim("{$row->start_year}–{$row->end_year} · " . ($row->semester_name ?? ''), ' ·')
                : null,
            'same_subject' => (string) $row->subject_id === (string) $subjectId,
            'materials' => (int) ($counts[$row->id] ?? 0),
        ])->values());
    }

    /** One of the teacher's classes' materials, for picking what to copy. */
    public function sourceMaterials(Request $request, int $classId, int $sourceClassId)
    {
        $this->teacher($request, $classId);
        $this->teacher($request, $sourceClassId);

        $materials = DB::table('class_materials')
            ->where('year_section_subject_id', $sourceClassId)
            ->orderByDesc('id')
            ->get(['id', 'title', 'description', 'published', 'archived_at']);

        $files = $materials->isEmpty()
            ? collect()
            : DB::table('classwork_files')
            ->whereIn('material_id', $materials->pluck('id'))
            ->groupBy('material_id')
            ->selectRaw('material_id, count(*) as total')
            ->pluck('total', 'material_id');

        return response()->json($materials->map(fn($material) => [
            'id' => (int) $material->id,
            'title' => $material->title,
            'summary' => ClassworkHtml::excerpt($material->description, 120),
            'files' => (int) ($files[$material->id] ?? 0),
            'published' => (bool) $material->published,
            'archived' => $material->archived_at !== null,
        ])->values());
    }

    /**
     * Copies materials from another class the teacher teaches into this
     * one, files included (copied inside Drive). They arrive posted or as
     * drafts. Links to assignments and topics stay with the originals.
     */
    public function copyMaterials(Request $request, ClassworkDrive $drive, int $classId)
    {
        $this->teacher($request, $classId);

        $data = $request->validate([
            'source_class_id' => ['required', 'integer', 'min:1'],
            'material_ids' => ['required', 'array', 'min:1', 'max:' . self::COPY_MATERIALS_MAX],
            'material_ids.*' => ['integer', 'distinct'],
            'published' => ['required', 'boolean'],
        ], [
            'material_ids.required' => 'Choose at least one material.',
            'material_ids.min' => 'Choose at least one material.',
            'material_ids.max' => 'Copy up to 20 materials at a time.',
        ]);

        $sourceClassId = (int) $data['source_class_id'];
        $this->teacher($request, $sourceClassId);

        $ids = array_values(array_unique(array_map('intval', $data['material_ids'])));

        $materials = DB::table('class_materials')
            ->where('year_section_subject_id', $sourceClassId)
            ->whereIn('id', $ids)
            ->orderBy('id')
            ->get();

        if ($materials->count() !== count($ids)) {
            throw ValidationException::withMessages([
                'material_ids' => 'Choose materials from that class.',
            ]);
        }

        return response()->json([
            'ids' => $this->duplicateMaterials($drive, $materials, $classId, (bool) $data['published']),
        ], 201);
    }

    /**
     * New copies of materials in a class. They start hidden while their
     * files are copied; if a file fails, the copies made so far are removed
     * and nothing is added. Returns the new ids, in the same order.
     */
    private function duplicateMaterials(ClassworkDrive $drive, $materials, int $classId, bool $publish): array
    {
        $materials = $materials->values();

        $files = DB::table('classwork_files')
            ->whereIn('material_id', $materials->pluck('id'))
            ->orderBy('id')
            ->get()
            ->groupBy('material_id');

        $newIds = DB::transaction(fn() => $materials->map(fn($material) => DB::table('class_materials')->insertGetId([
            'year_section_subject_id' => $classId,
            'title' => $material->title,
            'description' => $material->description,
            'body_format' => $material->body_format ?? 'text',
            'published' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]))->all());

        $copied = [];

        try {
            $rows = [];

            foreach ($materials as $index => $material) {
                foreach ($files->get($material->id, collect()) as $file) {
                    $remote = $drive->copy(
                        $file->drive_file_id,
                        $classId,
                        'materials',
                        $newIds[$index],
                        $file->name
                    );

                    $copied[] = $remote['drive_file_id'];

                    $rows[] = [
                        'material_id' => $newIds[$index],
                        'drive_file_id' => $remote['drive_file_id'],
                        'name' => $file->name,
                        'mime_type' => $file->mime_type,
                        'size' => $file->size,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            if ($rows !== []) {
                DB::table('classwork_files')->insert($rows);
            }
        } catch (Throwable $error) {
            report($error);

            DB::transaction(function () use ($newIds) {
                DB::table('classwork_files')->whereIn('material_id', $newIds)->delete();
                DB::table('class_materials')->whereIn('id', $newIds)->delete();
            });

            $this->trashFiles($drive, $copied);

            abort(503, 'Google Drive couldn’t copy the files, so nothing was copied. Please try again.');
        }

        if ($publish) {
            DB::table('class_materials')
                ->whereIn('id', $newIds)
                ->update(['published' => true, 'updated_at' => now()]);
        }

        return $newIds;
    }

    // ---- Announcements ----

    // Characters an announcement's rich text can have, tags included.
    private const ANNOUNCEMENT_MAX_LENGTH = 20000;

    // Regular posts per page; pinned and unposted ones come with the first.
    private const ANNOUNCEMENT_PAGE = 20;

    private const COMMENT_MAX_LENGTH = 1000;

    private const ANNOUNCEMENT_MESSAGES = [
        'body.required' => 'Write something to announce.',
        'body.max' => 'Keep the announcement under 20,000 characters.',
        'published.accepted' => 'A posted announcement can’t go back to draft.',
        'scheduled_at.date' => 'Pick a valid date and time.',
        'scheduled_at.after' => 'Pick a time in the future.',
        'scheduled_at.before' => 'Schedule it within a year.',
        'also_class_ids.max' => 'Pick up to 30 classes.',
        'also_class_ids.*.distinct' => 'Each class can be picked once.',
    ];

    /** Cleaned rich text, with something to read and small enough to store. */
    private function announcementBody(string $html): string
    {
        $clean = ClassworkHtml::clean($html);
        $text = html_entity_decode(strip_tags($clean), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        if ($this->answerText($text) === '') {
            throw ValidationException::withMessages([
                'body' => self::ANNOUNCEMENT_MESSAGES['body.required'],
            ]);
        }

        // The TEXT column holds 64 KB.
        if (strlen($clean) > 65535) {
            throw ValidationException::withMessages([
                'body' => 'This announcement is too long. Shorten it and try again.',
            ]);
        }

        return $clean;
    }

    /** A stored time as ISO 8601; `$zone` is the zone it was saved in. */
    private function isoTime(?string $value, string $zone = 'UTC'): ?string
    {
        return $value
            ? CarbonImmutable::parse($value, $zone)->toIso8601String()
            : null;
    }

    /** A time the browser sent, as stored: UTC "Y-m-d H:i:s". */
    private function utcTime(string $value): string
    {
        return CarbonImmutable::parse($value)->utc()->format('Y-m-d H:i:s');
    }

    /**
     * The other classes this teacher teaches in the same school year, where
     * an announcement can also be posted. Other sections of the same subject
     * come first.
     */
    private function sectionTargets(int $teacherId, int $classId)
    {
        $class = DB::table('year_section_subjects as ys')
            ->join('year_section as sec', 'sec.id', '=', 'ys.year_section_id')
            ->where('ys.id', $classId)
            ->first(['ys.subject_id', 'sec.school_year_id']);

        if (! $class) {
            return collect();
        }

        return DB::table('year_section_subjects as ys')
            ->join('year_section as sec', 'sec.id', '=', 'ys.year_section_id')
            ->join('course', 'course.id', '=', 'sec.course_id')
            ->join('subjects as s', 's.id', '=', 'ys.subject_id')
            ->where('ys.faculty_id', $teacherId)
            ->where('sec.school_year_id', $class->school_year_id)
            ->where('ys.id', '!=', $classId)
            ->orderByRaw('ys.subject_id = ? desc', [$class->subject_id])
            ->orderBy('s.subject_code')
            ->orderBy('course.course_name_abbreviation')
            ->orderBy('sec.year_level_id')
            ->orderBy('sec.section')
            ->get([
                'ys.id',
                'ys.subject_id',
                's.subject_code',
                's.descriptive_title',
                'course.course_name_abbreviation',
                'sec.year_level_id',
                'sec.section',
            ])
            ->map(fn($row) => [
                'id' => (int) $row->id,
                'subject' => $row->subject_code ?: $row->descriptive_title,
                'title' => $row->descriptive_title,
                'section' => $row->course_name_abbreviation . '-' . $row->year_level_id . $row->section,
                'same_subject' => (string) $row->subject_id === (string) $class->subject_id,
            ])
            ->values();
    }

    /** The classes picked in `also_class_ids`, checked against the teacher's. */
    private function checkTargets(Request $request, int $classId, array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));

        if ($ids === []) {
            return [];
        }

        $allowed = $this->sectionTargets((int) $request->user()->id, $classId)
            ->pluck('id')
            ->all();

        if (array_diff($ids, $allowed) !== []) {
            throw ValidationException::withMessages([
                'also_class_ids' => 'Choose other classes you teach this school year.',
            ]);
        }

        return $ids;
    }

    /** Other classes the teacher teaches this school year, to post copies to. */
    public function classTargets(Request $request, int $classId)
    {
        $this->teacher($request, $classId);

        return response()->json(
            $this->sectionTargets((int) $request->user()->id, $classId)
        );
    }

    /**
     * Copies an announcement into other classes as drafts, files included
     * (copied inside Drive). If a copy fails, the copies made so far are
     * removed and nothing else changes. Returns the copies' ids.
     */
    private function copyAnnouncement(ClassworkDrive $drive, int $sourceId, array $classIds): array
    {
        $source = DB::table('class_announcements')->find($sourceId);

        $files = DB::table('classwork_files')
            ->where('announcement_id', $sourceId)
            ->orderBy('id')
            ->get();

        $copyIds = DB::transaction(fn() => array_map(
            fn($classId) => DB::table('class_announcements')->insertGetId([
                'year_section_subject_id' => $classId,
                'author_id' => $source->author_id,
                'body' => $source->body,
                'published' => false,
                'comments_enabled' => $source->comments_enabled,
                'created_at' => now(),
                'updated_at' => now(),
            ]),
            $classIds
        ));

        $copied = [];

        try {
            $rows = [];

            foreach ($copyIds as $index => $copyId) {
                foreach ($files as $file) {
                    $remote = $drive->copy(
                        $file->drive_file_id,
                        $classIds[$index],
                        'announcements',
                        $copyId,
                        $file->name
                    );

                    $copied[] = $remote['drive_file_id'];

                    $rows[] = [
                        'announcement_id' => $copyId,
                        'drive_file_id' => $remote['drive_file_id'],
                        'name' => $file->name,
                        'mime_type' => $file->mime_type,
                        'size' => $file->size,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            if ($rows !== []) {
                DB::table('classwork_files')->insert($rows);
            }
        } catch (Throwable $error) {
            report($error);

            DB::transaction(function () use ($copyIds) {
                DB::table('classwork_files')->whereIn('announcement_id', $copyIds)->delete();
                DB::table('class_announcements')->whereIn('id', $copyIds)->delete();
            });

            $this->trashFiles($drive, $copied);

            abort(503, 'Google Drive couldn’t copy the files to the other classes. Nothing was posted; please try again.');
        }

        return $copyIds;
    }

    /**
     * Posts an unposted announcement now, or schedules it for $scheduledAt,
     * together with copies for the other classes picked. The copies are
     * made first, so a failure posts nothing. Returns the copies' ids.
     */
    private function publishAnnouncement(
        ClassworkDrive $drive,
        ClassAnnouncements $service,
        int $id,
        ?string $scheduledAt,
        array $targets
    ): array {
        $copies = $targets ? $this->copyAnnouncement($drive, $id, $targets) : [];
        $ids = [$id, ...$copies];

        $done = DB::transaction(function () use ($id, $ids, $scheduledAt) {
            $post = DB::table('class_announcements')->where('id', $id)->lockForUpdate()->first();

            // Posted meanwhile, e.g. by a second click.
            if (! $post || $post->published) {
                return false;
            }

            DB::table('class_announcements')->whereIn('id', $ids)->update($scheduledAt
                ? ['scheduled_at' => $scheduledAt, 'updated_at' => now()]
                : ['published' => true, 'posted_at' => now()->utc(), 'scheduled_at' => null, 'updated_at' => now()]);

            return true;
        });

        if (! $done) {
            $this->deleteAnnouncements($drive, $service, $copies);

            return [];
        }

        if (! $scheduledAt) {
            foreach ($ids as $postId) {
                $service->notifyPosted($postId);
            }
        }

        return $copies;
    }

    /** Deletes announcements with their files, comments and notifications. */
    private function deleteAnnouncements(ClassworkDrive $drive, ClassAnnouncements $service, array $ids): int
    {
        if ($ids === []) {
            return 0;
        }

        $driveIds = DB::transaction(function () use ($ids, $service) {
            DB::table('class_announcements')->whereIn('id', $ids)->lockForUpdate()->get(['id']);

            $driveIds = DB::table('classwork_files')
                ->whereIn('announcement_id', $ids)
                ->pluck('drive_file_id')
                ->all();

            DB::table('classwork_files')->whereIn('announcement_id', $ids)->delete();
            DB::table('class_announcement_comments')->whereIn('announcement_id', $ids)->delete();
            DB::table('class_announcements')->whereIn('id', $ids)->delete();
            $service->forget($ids);

            return $driveIds;
        });

        return $this->trashFiles($drive, $driveIds);
    }

    /**
     * A class's announcements, newest first, each with its author, files and
     * comment count so the feed loads in one request. Pinned posts come
     * first, and teachers also get unposted ones (scheduled, then drafts) on
     * top and how many students have seen each post. Older posts come in
     * pages: send `next_cursor` back as `before`.
     */
    public function announcements(Request $request, ClassAnnouncements $service, int $classId)
    {
        $teacher = $this->isTeacher($request, $classId);

        if (! $teacher) {
            $this->enrollment($request, $classId);
        }

        $data = $request->validate([
            'before' => ['nullable', 'string', 'regex:/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\|\d+$/'],
        ]);

        $service->releaseDue($classId);

        $before = isset($data['before']) ? explode('|', $data['before']) : null;
        $posts = fn() => DB::table('class_announcements')->where('year_section_subject_id', $classId);

        $regular = $posts()
            ->where('published', true)
            ->whereNull('pinned_at')
            ->when($before, fn($query) => $query->where(fn($older) => $older
                ->where('posted_at', '<', $before[0])
                ->orWhere(fn($same) => $same
                    ->where('posted_at', $before[0])
                    ->where('id', '<', (int) $before[1]))))
            ->orderByDesc('posted_at')
            ->orderByDesc('id')
            ->limit(self::ANNOUNCEMENT_PAGE + 1)
            ->get();

        $more = $regular->count() > self::ANNOUNCEMENT_PAGE;
        $regular = $regular->take(self::ANNOUNCEMENT_PAGE);
        $page = $regular;

        if (! $before) {
            $unposted = $teacher
                ? $posts()
                ->where('published', false)
                ->orderByRaw('scheduled_at is null')
                ->orderBy('scheduled_at')
                ->orderByDesc('id')
                ->get()
                : collect();

            $pinned = $posts()
                ->where('published', true)
                ->whereNotNull('pinned_at')
                ->orderByDesc('pinned_at')
                ->get();

            $page = $unposted->concat($pinned)->concat($regular);
        }

        $ids = $page->pluck('id')->map(fn($id) => (int) $id)->all();

        $authors = DB::table('user_information')
            ->whereIn('user_id', $page->pluck('author_id')->filter()->unique()->values())
            ->get(['user_id', 'first_name', 'middle_name', 'last_name'])
            ->keyBy('user_id');

        $files = $ids === []
            ? collect()
            : DB::table('classwork_files')
            ->whereIn('announcement_id', $ids)
            ->orderBy('id')
            ->get(['id', 'announcement_id', 'name', 'mime_type', 'size'])
            ->groupBy('announcement_id');

        $comments = $ids === []
            ? collect()
            : DB::table('class_announcement_comments')
            ->whereIn('announcement_id', $ids)
            ->groupBy('announcement_id')
            ->selectRaw('announcement_id, count(*) as total')
            ->pluck('total', 'announcement_id');

        $seen = $teacher ? $service->seenCounts($ids) : [];
        $unread = $teacher ? [] : array_flip($service->unreadPostIds((int) $request->user()->id, $classId));

        $items = $page->map(function ($post) use ($authors, $files, $comments, $seen, $unread, $teacher) {
            $id = (int) $post->id;
            $author = $post->author_id ? $authors->get($post->author_id) : null;

            return [
                'id' => $id,
                'body' => $post->body,
                'published' => (bool) $post->published,
                'posted_at' => $this->isoTime($post->posted_at),
                'scheduled_at' => $this->isoTime($post->scheduled_at),
                'edited_at' => $this->isoTime($post->edited_at),
                // Saved with now(), in the app's timezone.
                'created_at' => $this->isoTime($post->created_at, config('app.timezone')),
                'pinned' => $post->pinned_at !== null,
                'comments_enabled' => (bool) $post->comments_enabled,
                'comments_count' => (int) ($comments[$id] ?? 0),
                'author' => $author ? [
                    'first_name' => $author->first_name,
                    'middle_name' => $author->middle_name,
                    'last_name' => $author->last_name,
                ] : null,
                'files' => $files->get($id, collect())
                    ->map(fn($file) => [
                        'id' => (int) $file->id,
                        'name' => $file->name,
                        'mime_type' => $file->mime_type,
                        'size' => (int) $file->size,
                    ])
                    ->values(),
                // Teachers: how many of the students told about it saw it.
                'seen' => $teacher && $post->published ? ($seen[$id] ?? ['seen' => 0, 'total' => 0]) : null,
                // Students: not seen yet (marked as new on their screen).
                'unread' => isset($unread[$id]),
            ];
        });

        $last = $regular->last();

        return response()->json([
            'items' => $items->values(),
            'next_cursor' => $more && $last ? $last->posted_at . '|' . $last->id : null,
            'can_manage' => $teacher,
        ]);
    }

    /**
     * Posts an announcement now, schedules it, or saves it as a draft. A post
     * with files is saved as a draft first and posted once they are
     * attached. Posting or scheduling can also put copies in other classes
     * the teacher teaches (`also_class_ids`).
     */
    public function storeAnnouncement(
        Request $request,
        ClassworkDrive $drive,
        ClassAnnouncements $service,
        int $classId
    ) {
        $this->teacher($request, $classId);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:' . self::ANNOUNCEMENT_MAX_LENGTH],
            'published' => ['required', 'boolean'],
            'scheduled_at' => ['nullable', 'date', 'after:now', 'before:+1 year'],
            'also_class_ids' => ['sometimes', 'array', 'max:30'],
            'also_class_ids.*' => ['integer', 'distinct'],
            'comments_enabled' => ['sometimes', 'boolean'],
        ], self::ANNOUNCEMENT_MESSAGES);

        $publish = (bool) $data['published'];
        $scheduledAt = empty($data['scheduled_at']) ? null : $this->utcTime($data['scheduled_at']);

        if ($publish && $scheduledAt) {
            throw ValidationException::withMessages([
                'scheduled_at' => 'Post it now or schedule it, not both.',
            ]);
        }

        $body = $this->announcementBody($data['body']);
        $targets = $publish || $scheduledAt
            ? $this->checkTargets($request, $classId, $data['also_class_ids'] ?? [])
            : [];

        // Saved as a draft, then posted or scheduled with its copies.
        $id = DB::table('class_announcements')->insertGetId([
            'year_section_subject_id' => $classId,
            'author_id' => $request->user()->id,
            'body' => $body,
            'published' => false,
            'comments_enabled' => $data['comments_enabled'] ?? true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $copies = $publish || $scheduledAt
            ? $this->publishAnnouncement($drive, $service, $id, $scheduledAt, $targets)
            : [];

        return response()->json(['id' => $id, 'copies' => $copies], 201);
    }

    /**
     * Changes an announcement. Teachers can edit the text of any post; pin a
     * posted one or turn its comments on or off; and post, schedule or
     * reschedule an unposted one (`scheduled_at: null` makes it a plain
     * draft again). Students see a posted announcement marked as edited
     * once its text changes.
     */
    public function updateAnnouncement(
        Request $request,
        ClassworkDrive $drive,
        ClassAnnouncements $service,
        int $classId,
        int $id
    ) {
        $this->teacher($request, $classId);

        $data = $request->validate([
            'body' => ['sometimes', 'required', 'string', 'max:' . self::ANNOUNCEMENT_MAX_LENGTH],
            'published' => ['sometimes', 'accepted'],
            'scheduled_at' => ['sometimes', 'nullable', 'date', 'after:now', 'before:+1 year'],
            'also_class_ids' => ['sometimes', 'array', 'max:30'],
            'also_class_ids.*' => ['integer', 'distinct'],
            'pinned' => ['sometimes', 'boolean'],
            'comments_enabled' => ['sometimes', 'boolean'],
        ], self::ANNOUNCEMENT_MESSAGES);

        $intent = match (true) {
            array_key_exists('published', $data) => 'post',
            ! empty($data['scheduled_at']) => 'schedule',
            array_key_exists('scheduled_at', $data) => 'draft',
            default => null,
        };

        if ($intent === 'post' && ! empty($data['scheduled_at'])) {
            throw ValidationException::withMessages([
                'scheduled_at' => 'Post it now or schedule it, not both.',
            ]);
        }

        $scheduledAt = $intent === 'schedule' ? $this->utcTime($data['scheduled_at']) : null;

        $body = array_key_exists('body', $data)
            ? $this->announcementBody($data['body'])
            : null;

        $release = DB::transaction(function () use ($classId, $id, $data, $body, $intent) {
            $post = $this->item($classId, 'announcements', $id, true);
            $posted = (bool) $post->published;

            if ($posted && in_array($intent, ['schedule', 'draft'], true)) {
                throw ValidationException::withMessages([
                    'scheduled_at' => 'This announcement is already posted.',
                ]);
            }

            if ($posted && ! empty($data['also_class_ids'])) {
                throw ValidationException::withMessages([
                    'also_class_ids' => 'Only an announcement that isn’t posted yet can go to other classes.',
                ]);
            }

            if (! $posted && ! empty($data['pinned'])) {
                throw ValidationException::withMessages([
                    'pinned' => 'Post the announcement before pinning it.',
                ]);
            }

            $values = [];

            if ($body !== null && $body !== $post->body) {
                $values['body'] = $body;

                if ($posted) {
                    $values['edited_at'] = now()->utc();
                }
            }

            if (array_key_exists('comments_enabled', $data)) {
                $values['comments_enabled'] = (bool) $data['comments_enabled'];
            }

            if ($posted && array_key_exists('pinned', $data)) {
                $values['pinned_at'] = $data['pinned']
                    ? ($post->pinned_at ?? now()->utc())
                    : null;
            }

            if (! $posted && $intent === 'draft') {
                $values['scheduled_at'] = null;
            }

            if ($values !== []) {
                DB::table('class_announcements')
                    ->where('id', $id)
                    ->update([...$values, 'updated_at' => now()]);
            }

            // Posting and scheduling happen once the copies are made.
            return ! $posted && in_array($intent, ['post', 'schedule'], true);
        });

        $copies = $release
            ? $this->publishAnnouncement(
                $drive,
                $service,
                $id,
                $scheduledAt,
                $this->checkTargets($request, $classId, $data['also_class_ids'] ?? [])
            )
            : [];

        return response()->json(['id' => $id, 'copies' => $copies]);
    }

    /** Deletes an announcement; its files go to the Drive trash. */
    public function destroyAnnouncement(
        Request $request,
        ClassworkDrive $drive,
        ClassAnnouncements $service,
        int $classId,
        int $id
    ) {
        $this->teacher($request, $classId);
        $this->item($classId, 'announcements', $id);

        return response()->json([
            'deleted' => true,
            'files_not_trashed' => $this->deleteAnnouncements($drive, $service, [$id]),
        ]);
    }

    /** Which students have seen a posted announcement, for its teacher. */
    public function announcementSeen(
        Request $request,
        ClassAnnouncements $service,
        int $classId,
        int $id
    ) {
        $this->teacher($request, $classId);

        abort_unless($this->item($classId, 'announcements', $id)->published, 404);

        return response()->json($service->seenBy($id));
    }

    /** Marks the signed-in user's notifications about this class's posts read. */
    public function readAnnouncements(Request $request, ClassAnnouncements $service, int $classId)
    {
        if (! $this->isTeacher($request, $classId)) {
            $this->enrollment($request, $classId);
        }

        return response()->json([
            'updated' => $service->markClassRead((int) $request->user()->id, $classId),
        ]);
    }

    /** How many of this class's announcements the signed-in user hasn't seen. */
    public function unreadAnnouncements(Request $request, ClassAnnouncements $service, int $classId)
    {
        if (! $this->isTeacher($request, $classId)) {
            $this->enrollment($request, $classId);
        }

        $service->releaseDue($classId);

        return response()->json([
            'count' => $service->unreadByClass((int) $request->user()->id, [$classId])[$classId] ?? 0,
        ]);
    }

    // ---- Announcement comments ----

    /**
     * A posted announcement the user may read, and whether they teach the
     * class. Drafts and scheduled posts have no comments.
     */
    private function commentable(Request $request, int $classId, int $id): array
    {
        $teacher = $this->isTeacher($request, $classId);

        if (! $teacher) {
            $this->enrollment($request, $classId);
        }

        $post = $this->item($classId, 'announcements', $id);

        abort_unless($post->published, 404);

        return [$post, $teacher];
    }

    public function announcementComments(Request $request, int $classId, int $id)
    {
        [$post, $teacher] = $this->commentable($request, $classId, $id);

        $userId = (string) $request->user()->id;
        $facultyId = (string) DB::table('year_section_subjects')->where('id', $classId)->value('faculty_id');

        $rows = DB::table('class_announcement_comments as c')
            ->leftJoin('user_information as info', 'info.user_id', '=', 'c.user_id')
            ->where('c.announcement_id', $id)
            ->orderBy('c.id')
            ->get([
                'c.id',
                'c.user_id',
                'c.body',
                'c.created_at',
                'info.first_name',
                'info.middle_name',
                'info.last_name',
            ]);

        return response()->json([
            'items' => $rows->map(fn($row) => [
                'id' => (int) $row->id,
                'body' => $row->body,
                'author' => $row->user_id ? [
                    'first_name' => $row->first_name,
                    'middle_name' => $row->middle_name,
                    'last_name' => $row->last_name,
                ] : null,
                'is_teacher' => $row->user_id !== null && (string) $row->user_id === $facultyId,
                'mine' => (string) $row->user_id === $userId,
                'can_delete' => $teacher || (string) $row->user_id === $userId,
                'created_at' => $this->isoTime($row->created_at, config('app.timezone')),
            ])->values(),
            // Teachers can always reply; students only while comments are on.
            'can_comment' => $teacher || (bool) $post->comments_enabled,
        ]);
    }

    public function storeAnnouncementComment(
        Request $request,
        ClassAnnouncements $service,
        int $classId,
        int $id
    ) {
        [$post, $teacher] = $this->commentable($request, $classId, $id);

        abort_unless(
            $teacher || $post->comments_enabled,
            403,
            'Comments are turned off for this announcement.'
        );

        $data = $request->validate([
            'body' => ['required', 'string', 'max:' . self::COMMENT_MAX_LENGTH],
        ], [
            'body.required' => 'Write a comment first.',
            'body.max' => 'Keep comments under 1,000 characters.',
        ]);

        $body = trim(str_replace("\u{00A0}", ' ', $data['body']));

        if ($body === '') {
            throw ValidationException::withMessages(['body' => 'Write a comment first.']);
        }

        $commentId = DB::table('class_announcement_comments')->insertGetId([
            'announcement_id' => $id,
            'user_id' => $request->user()->id,
            'body' => $body,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (! $teacher) {
            $service->notifyComment($post, (int) $request->user()->id, $body);
        }

        return response()->json(['id' => $commentId], 201);
    }

    /** Teachers remove any comment on their posts; others only their own. */
    public function destroyAnnouncementComment(Request $request, int $classId, int $id, int $commentId)
    {
        [, $teacher] = $this->commentable($request, $classId, $id);

        $comment = DB::table('class_announcement_comments')
            ->where('id', $commentId)
            ->where('announcement_id', $id)
            ->first();

        abort_unless($comment, 404);

        abort_unless(
            $teacher || (string) $comment->user_id === (string) $request->user()->id,
            403,
            'You can only delete your own comments.'
        );

        DB::table('class_announcement_comments')->where('id', $commentId)->delete();

        return response()->json(['deleted' => true]);
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
        ];

        $data = $request->validate(
            $rules + ($kind === 'materials' ? [
                'description' => ['nullable', 'string', 'max:20000'],
                'material_ids' => ['prohibited'],
                'submission_settings' => ['prohibited'],
                'questions' => ['prohibited'],
            ] : [
                'questions' => ['sometimes', 'array', 'max:50'],
                'questions.*' => ['array'],
                'questions.*.id' => ['nullable', 'integer', 'min:1', 'distinct'],
                'questions.*.type' => ['required', Rule::in(self::QUESTION_TYPES)],
                'questions.*.prompt' => ['required', 'string', 'max:2000'],
                'questions.*.required' => ['sometimes', 'boolean'],

                // The type decides everything; the enabled and required
                // flags are derived from it.
                'submission_settings' => ['sometimes', 'array'],
                'submission_settings.type' => ['required_with:submission_settings', Rule::in(self::SUBMISSION_TYPES)],
                'submission_settings.files' => ['sometimes', 'array'],
                'submission_settings.files.types' => ['sometimes', Rule::in(['any', 'documents', 'images', 'media', 'custom'])],
                'submission_settings.files.extensions' => ['sometimes', 'array', 'max:20'],
                'submission_settings.files.extensions.*' => ['string', 'regex:/^\.?[A-Za-z0-9]{1,10}$/'],
                'submission_settings.links' => ['sometimes', 'array'],
                'submission_settings.links.domain' => ['nullable', 'string', 'max:255'],
                'submission_settings.links.max_links' => ['sometimes', 'integer', 'min:1', 'max:10'],

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
            ]),
            [
                'submission_settings.type.required_with' => 'Choose how students hand in their work.',
                'submission_settings.type.in' => 'Choose file upload, questions or links.',
                'questions.max' => 'An assignment can have up to 50 questions.',
                'questions.*.prompt.required' => 'Every question needs a prompt.',
                'questions.*.prompt.max' => 'Keep each question under 2,000 characters.',
            ]
        );

        // Omitting questions keeps the saved ones.
        $syncQuestions = $kind === 'assignments'
            && array_key_exists('questions', $data);

        $questions = array_map(fn($question) => [
            'id' => isset($question['id']) ? (int) $question['id'] : null,
            'type' => $question['type'],
            'prompt' => trim($question['prompt']),
            'required' => (bool) ($question['required'] ?? false),
        ], array_values($data['questions'] ?? []));

        unset($data['questions']);

        $settings = null;

        if (array_key_exists('submission_settings', $data)) {
            $raw = $data['submission_settings'];
            $settings = $this->normalizeSubmissionSettings($raw);

            // Only the chosen type's options are checked.
            if (
                $settings['type'] === 'files'
                && ($raw['files']['types'] ?? null) === 'custom'
                && $settings['files']['extensions'] === []
            ) {
                throw ValidationException::withMessages([
                    'submission_settings.files.extensions' => 'List at least one file type, such as pdf.',
                ]);
            }

            if (
                $settings['type'] === 'links'
                && filled($raw['links']['domain'] ?? null)
                && ! $settings['links']['domain']
            ) {
                throw ValidationException::withMessages([
                    'submission_settings.links.domain' => 'Enter a domain such as github.com.',
                ]);
            }

            if ($syncQuestions && $settings['type'] !== 'questions') {
                // Switching away from questions removes them; answers that
                // were turned in stay visible.
                $questions = [];
            } elseif ($syncQuestions && $questions === []) {
                throw ValidationException::withMessages([
                    'questions' => 'Add at least one question.',
                ]);
            }

            $data['submission_settings'] = json_encode($settings);
        }

        // Questions saved without a question list still get one answer box,
        // so students always have something to answer.
        $ensureQuestion = $kind === 'assignments'
            && ! $syncQuestions
            && ($settings['type'] ?? null) === 'questions';

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
            $materialIds,
            $syncQuestions,
            $questions,
            $ensureQuestion
        ) {
            DB::table('year_section_subjects')
                ->where('id', $classId)
                ->lockForUpdate()
                ->first();

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

            // The editor sends these ids with its next save, so the same
            // questions are updated rather than added again.
            if ($syncQuestions) {
                return [
                    'id' => $id,
                    'question_ids' => $this->syncQuestions($id, $questions),
                ];
            }

            if ($ensureQuestion && $this->questionList($id)->isEmpty()) {
                $this->syncQuestions($id, [[
                    'id' => null,
                    'type' => 'essay',
                    'prompt' => 'Your answer',
                    'required' => true,
                ]]);
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
                's.links',
                's.submitted_at',
                's.feedback',
                's.reviewed_at',
                'score.score',
            ]);

        // Unfinished answers remain private to the student.
        $rows->each(function ($row) {
            if (! $row->submitted_at) {
                $row->submission_id = null;
                $row->links = null;
            }

            $this->presentSubmission($row);
        });

        // Answers include those to questions removed after turn-in, flagged
        // so the grading panel can show them apart.
        $answers = DB::table('class_submission_answers as answer')
            ->join(
                'class_assignment_questions as question',
                'question.id',
                '=',
                'answer.question_id'
            )
            ->whereIn('answer.submission_id', $rows->pluck('submission_id')->filter()->values())
            ->where('question.assignment_id', $id)
            ->orderBy('question.position')
            ->orderBy('question.id')
            ->get([
                'answer.submission_id',
                'answer.question_id',
                'answer.answer',
                'question.type',
                'question.prompt',
                'question.deleted_at',
            ])
            ->groupBy('submission_id');

        $rows->each(function ($row) use ($answers) {
            $row->answers = $answers
                ->get($row->submission_id, collect())
                ->map(fn($answer) => [
                    'question_id' => (int) $answer->question_id,
                    'answer' => $answer->answer,
                    'type' => $answer->type,
                    'prompt' => $answer->prompt,
                    'removed' => $answer->deleted_at !== null,
                ])
                ->values()
                ->all();
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

        if ($submission) {
            $this->presentSubmission($submission);
            $submission->answers = (object) $this->answersFor($submission->id);
            $submission->removed_answers = $submission->submitted_at
                ? $this->removedAnswers($submission->id)
                : [];
        }

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
        // Autosave sends answers (question id => text) and links; the first
        // call also creates the draft. Requirements are checked only when the
        // work is turned in, so unfinished work can still be saved.
        $data = $request->validate([
            'answers' => ['sometimes', 'array', 'max:50'],
            'answers.*' => ['nullable', 'string', 'max:20000'],
            'links' => ['sometimes', 'array', 'max:10'],
            'links.*' => ['nullable', 'string', 'max:2048'],
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

            $settings = $this->submissionSettings($assignment);
            $values = [];
            $answers = null;

            if (array_key_exists('answers', $data) && $settings['type'] === 'questions') {
                $answers = $this->cleanAnswers($data['answers'], $this->questionList($id));
            }

            if (array_key_exists('links', $data) && $settings['links']['enabled']) {
                $values['links'] = json_encode(array_slice(
                    $this->cleanLinks($data['links']),
                    0,
                    $settings['links']['max_links']
                ));
            }

            $existing = $query->first();

            if (! $existing) {
                DB::table('class_submissions')->insert([
                    'assignment_id' => $id,
                    'student_subject_id' => $studentSubjectId,
                    ...$values,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($existing->submitted_at) {
                // Turned-in work is final; late autosaves are ignored.
                return $existing;
            } elseif ($values || $answers !== null) {
                $query->update([
                    ...$values,
                    'updated_at' => now(),
                ]);
            }

            $submission = $query->first();

            if ($answers) {
                $this->saveAnswers($submission->id, $answers);
            }

            return $submission;
        });

        $submission = $this->presentSubmission($submission);
        $submission->answers = (object) $this->answersFor($submission->id);

        return response()->json($submission);
    }

    public function submit(
        Request $request,
        int $classId,
        int $id
    ) {
        $data = $request->validate([
            'answers' => ['sometimes', 'array', 'max:50'],
            'answers.*' => ['nullable', 'string', 'max:20000'],
            'links' => ['sometimes', 'array', 'max:10'],
            'links.*' => ['nullable', 'string', 'max:2048'],
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

            // Check the work against the assignment's submission settings.
            $settings = $this->submissionSettings($assignment);
            $questions = $settings['type'] === 'questions' ? $this->questionList($id) : collect();

            // Answers sent now win over autosaved ones.
            $incoming = array_key_exists('answers', $data)
                ? $this->cleanAnswers($data['answers'], $questions)
                : [];
            $answers = array_replace($this->answersFor($submission->id), $incoming);

            $hasAnswer = false;
            $unanswered = [];

            foreach ($questions->values() as $index => $question) {
                $text = $this->answerText($answers[$question->id] ?? null);

                if ($text !== '') {
                    $hasAnswer = true;
                } elseif ($question->required) {
                    $unanswered[] = $index + 1;
                }
            }

            $links = $settings['links']['enabled'] ? $this->cleanLinks($data['links'] ?? []) : [];

            $fileCount = DB::table('classwork_files')
                ->where('submission_id', $submission->id)
                ->count();

            $errors = [];

            foreach ($links as $link) {
                if ($problem = $this->linkProblem($link, $settings['links'])) {
                    $errors['links'] = $problem;
                    break;
                }
            }

            if (count($links) > $settings['links']['max_links']) {
                $errors['links'] = "Add up to {$settings['links']['max_links']} links.";
            }

            if ($unanswered) {
                $errors['answers'] = match (true) {
                    $questions->count() === 1 => 'Answer the question.',
                    count($unanswered) === 1 => "Answer question {$unanswered[0]}.",
                    default => 'Answer questions ' . implode(', ', $unanswered) . '.',
                };
            }

            if ($settings['files']['required'] && $fileCount === 0) {
                $errors['file'] = 'Attach at least one file to turn this in.';
            }

            if ($settings['links']['required'] && $links === []) {
                $errors['links'] ??= 'Add a link to turn this in.';
            }

            // With questions, at least one answer makes the work complete.
            if ($settings['type'] === 'questions' && ! $hasAnswer && ! $unanswered) {
                $errors['answers'] = $questions->count() === 1
                    ? 'Answer the question.'
                    : 'Answer at least one question.';
            }

            if ($errors) {
                throw ValidationException::withMessages($errors);
            }

            // Draft answers to questions removed before turn-in are dropped.
            DB::table('class_submission_answers')
                ->where('submission_id', $submission->id)
                ->whereNotIn('question_id', $questions->pluck('id')->all())
                ->delete();

            $this->saveAnswers($submission->id, $incoming);

            $query->update([
                'links' => $links ? json_encode($links) : null,
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
                match ($kind) {
                    'materials' => 'material_id',
                    'announcements' => 'announcement_id',
                    default => 'assignment_id',
                },
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
        [, $owned] = $this->owner(
            $request,
            $classId,
            $kind,
            $id,
            true
        );

        // Any file up to 100 MB. Students attach up to 5, of the types the
        // assignment allows.
        $rules = ['required', 'file', 'max:' . (self::MAX_UPLOAD_MB * 1024)];
        $messages = [];
        $maxFiles = null;

        if ($kind === 'submissions') {
            $files = $this->submissionSettings(
                $this->item($classId, 'assignments', $owned->assignment_id)
            )['files'];

            if (! $files['enabled']) {
                throw ValidationException::withMessages([
                    'file' => 'This assignment does not accept files.',
                ]);
            }

            $messages['file.max'] = 'Each file can be up to ' . self::MAX_UPLOAD_MB . ' MB.';

            if ($allowed = $this->allowedExtensions($files)) {
                $rules[] = 'extensions:' . implode(',', $allowed);
                $messages['file.extensions'] = 'Allowed file types: ' . implode(', ', $allowed) . '.';
            }

            $maxFiles = self::SUBMISSION_MAX_FILES;
        }

        $request->validate(['file' => $rules], $messages);

        if (
            $maxFiles !== null
            && DB::table('classwork_files')->where('submission_id', $id)->count() >= $maxFiles
        ) {
            throw ValidationException::withMessages([
                'file' => "You can attach up to {$maxFiles} file" . ($maxFiles === 1 ? '' : 's') . '.',
            ]);
        }

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
                $remote,
                $maxFiles
            ) {
                // Recheck permissions and submission state after upload.
                [$column, $locked] = $this->owner(
                    $request,
                    $classId,
                    $kind,
                    $id,
                    true,
                    true
                );

                // Recount under the lock, so parallel uploads cannot pass
                // the file limit; the Drive copy is trashed if this fails.
                if (
                    $maxFiles !== null
                    && DB::table('classwork_files')->where('submission_id', $id)->count() >= $maxFiles
                ) {
                    throw ValidationException::withMessages([
                        'file' => "You can attach up to {$maxFiles} file" . ($maxFiles === 1 ? '' : 's') . '.',
                    ]);
                }

                $name = preg_replace(
                    '/[\x00-\x1F\x7F\/\\\\]/u',
                    '_',
                    $file->getClientOriginalName()
                );

                $this->markAnnouncementEdited($kind, $locked);

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

    /** The item a stored file belongs to, as [kind, id]. */
    private function fileOwner(object $file): array
    {
        return match (true) {
            (bool) $file->material_id => ['materials', (int) $file->material_id],
            (bool) $file->assignment_id => ['assignments', (int) $file->assignment_id],
            // empty(): the column only exists once announcements are migrated.
            ! empty($file->announcement_id) => ['announcements', (int) $file->announcement_id],
            default => ['submissions', (int) $file->submission_id],
        };
    }

    // A posted announcement whose files change shows as edited to students.
    private function markAnnouncementEdited(string $kind, object $item): void
    {
        if ($kind === 'announcements' && $item->published) {
            DB::table('class_announcements')
                ->where('id', $item->id)
                ->update(['edited_at' => now()->utc(), 'updated_at' => now()]);
        }
    }

    /**
     * Removes one attachment, with the same rules as uploading: teachers
     * remove files from their materials and assignments, students from
     * their own work until they turn it in. The Drive copy goes to the
     * trash after the database commit.
     */
    public function deleteFile(
        Request $request,
        ClassworkDrive $drive,
        int $classId,
        int $fileId
    ) {
        $driveId = DB::transaction(function () use ($request, $classId, $fileId) {
            $file = DB::table('classwork_files')->find($fileId);

            abort_unless($file, 404);

            [$kind, $ownerId] = $this->fileOwner($file);

            // Locks the submission (or item) row, so a removal and a
            // turn-in never interleave.
            [, $owned] = $this->owner($request, $classId, $kind, $ownerId, true, true);

            abort_unless(
                DB::table('classwork_files')->where('id', $fileId)->delete(),
                404
            );

            $this->markAnnouncementEdited($kind, $owned);

            return $file->drive_file_id;
        });

        $trashed = true;

        try {
            $drive->trash($driveId);
        } catch (Throwable $error) {
            // The file is already gone from the app; only Drive keeps a copy.
            report($error);
            $trashed = false;
        }

        return response()->json([
            'deleted' => true,
            'trashed' => $trashed,
        ]);
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

        [$kind, $ownerId] = $this->fileOwner($file);

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

}
