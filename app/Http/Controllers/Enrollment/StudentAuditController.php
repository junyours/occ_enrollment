<?php

namespace App\Http\Controllers\Enrollment;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Models\StudentGradeMatch;
use App\Services\CurriculumAudit;
use App\Services\GradeRecords;
use App\Services\StudentCurricula;
use App\Services\SubjectGroups;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * The curriculum view on Student Grades: a student's grades laid over their curriculum, and
 * grades matched to subjects by hand. A program head's match counts at once; the registrar's
 * and evaluators' wait until a program head of the program approves them.
 */
class StudentAuditController extends Controller
{
    private const YEAR_ORDER = 'sy.start_year desc, sy.semester_id desc, es.id desc';

    public function __construct(
        private StudentCurricula $curricula,
        private GradeRecords $records,
        private CurriculumAudit $audit,
    ) {
    }

    public function audit(Request $request)
    {
        $validated = Validator::make($request->all(), ['id_no' => ['required', 'string', 'max:255']])->validate();
        $student = $this->student($validated['id_no']);

        return response()->json($this->overview($request, $student));
    }

    /** Count a grade for a curriculum subject (or for none), for this student or, as the same subject, for everyone. */
    public function match(Request $request, SubjectGroups $groups)
    {
        $validated = Validator::make($request->all(), [
            'id_no' => ['required', 'string', 'max:255'],
            'course_id' => ['required', 'integer', 'exists:course,id'],
            'source_type' => ['required', 'in:'.implode(',', [GradeRecords::CLASS_TYPE, GradeRecords::OLD, GradeRecords::FES, GradeRecords::RECORD])],
            'source_id' => ['required', 'integer'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'scope' => ['required', 'in:student,everyone'],
            'note' => ['nullable', 'string', 'max:500'],
        ])->validate();

        $student = $this->student($validated['id_no']);
        $courseId = (int) $validated['course_id'];
        if (!$this->canMatch($request, $courseId)) {
            throw new AuthorizationException('Only the registrar, or a program head or evaluator of this program’s department, can match grades.');
        }

        $ref = "{$validated['source_type']}:{$validated['source_id']}";
        $record = collect($this->records->forStudent($student->id))->firstWhere('ref', $ref);
        if ($record === null) {
            throw ValidationException::withMessages(['source_id' => 'That grade isn’t one of this student’s.']);
        }

        $subjectId = isset($validated['subject_id']) ? (int) $validated['subject_id'] : null;
        $curriculum = $this->curricula->resolve($student->id, $courseId);
        if ($subjectId !== null && ($curriculum === null || !collect($this->audit->entries($curriculum['id']))->contains('subject_id', $subjectId))) {
            throw ValidationException::withMessages(['subject_id' => 'Pick a subject from the student’s curriculum.']);
        }

        if ($validated['scope'] === 'everyone') {
            $this->sameForEveryone($request, $groups, $courseId, $record, $subjectId);
            StudentGradeMatch::where('student_id', $student->id)->where('source_type', $record['source_type'])->where('source_id', $record['source_id'])->delete();

            return response()->json($this->overview($request, $student));
        }

        $approve = $this->canApprove($request, $courseId);
        StudentGradeMatch::updateOrCreate(
            ['student_id' => $student->id, 'source_type' => $record['source_type'], 'source_id' => $record['source_id']],
            [
                'course_id' => $courseId,
                'subject_id' => $subjectId,
                'status' => $approve ? StudentGradeMatch::APPROVED : StudentGradeMatch::PENDING,
                'note' => $validated['note'] ?? null,
                'requested_by' => $request->user()->id,
                'decided_by' => $approve ? $request->user()->id : null,
                'decided_at' => $approve ? now() : null,
            ],
        );

        return response()->json($this->overview($request, $student));
    }

    public function approve(Request $request, int $match)
    {
        $row = $this->pendingMatch($match);
        $this->authorizeApprover($request, (int) $row->course_id);

        $row->update(['status' => StudentGradeMatch::APPROVED, 'decided_by' => $request->user()->id, 'decided_at' => now()]);

        return response()->json(['message' => 'approved']);
    }

    public function reject(Request $request, int $match)
    {
        $validated = Validator::make($request->all(), [
            'reason' => ['required', 'string', 'max:500'],
        ], ['reason.required' => 'Say why the match is rejected, so the person who asked can fix it.'])->validate();

        $row = $this->pendingMatch($match);
        $this->authorizeApprover($request, (int) $row->course_id);

        $row->update(['status' => StudentGradeMatch::REJECTED, 'note' => $validated['reason'], 'decided_by' => $request->user()->id, 'decided_at' => now()]);

        return response()->json(['message' => 'rejected']);
    }

    /** Takes a match back: a program head of the program, or whoever asked while it's still pending. */
    public function undo(Request $request, int $match)
    {
        $row = StudentGradeMatch::findOrFail($match);
        $own = $row->status === StudentGradeMatch::PENDING && (int) $row->requested_by === (int) $request->user()->id;
        if (!$own && !$this->canApprove($request, (int) $row->course_id)) {
            throw new AuthorizationException('Only a program head of this program can undo this match.');
        }

        $row->delete();

        return response()->json(['message' => 'undone']);
    }

    /** Matches waiting for the program head's approval, across their department's students. */
    public function pending(Request $request)
    {
        $departmentId = $this->departmentId($request);
        if ($request->user()?->user_role !== 'program_head' || $departmentId === null) {
            return response()->json(['can_approve' => false, 'matches' => []]);
        }

        $rows = DB::table('student_grade_matches as m')
            ->join('course as c', 'c.id', '=', 'm.course_id')
            ->join('users as u', 'u.id', '=', 'm.student_id')
            ->where('m.status', StudentGradeMatch::PENDING)
            ->where('c.department_id', $departmentId)
            ->orderBy('m.created_at')
            ->get(['m.*', 'u.user_id_no', 'c.course_name_abbreviation']);

        $names = $this->names([...$rows->pluck('student_id')->all(), ...$rows->pluck('requested_by')->all()]);
        $this->audit->reset();
        $matches = [];
        foreach ($rows->groupBy('student_id') as $studentId => $studentRows) {
            $records = collect($this->records->forStudent((int) $studentId))->keyBy('ref');
            foreach ($studentRows as $row) {
                $record = $records->get("{$row->source_type}:{$row->source_id}");
                $matches[] = [
                    'id' => (int) $row->id,
                    'student' => ['id_no' => $row->user_id_no, 'name' => $names[(int) $row->student_id] ?? $row->user_id_no],
                    'program' => $row->course_name_abbreviation,
                    'grade' => $record === null ? null : $this->recordView($record),
                    'target' => $row->subject_id === null ? null : $this->audit->label((int) $row->subject_id),
                    'note' => $row->note,
                    'requested_by' => $names[(int) $row->requested_by] ?? null,
                    'requested_at' => $row->created_at,
                ];
            }
        }

        return response()->json(['can_approve' => true, 'matches' => $matches]);
    }

    // ---- The audit, as the page shows it ----

    private function overview(Request $request, object $student): array
    {
        $this->audit->reset();
        $base = [
            'student' => ['id' => (int) $student->id, 'id_no' => $student->user_id_no, 'name' => $this->names([$student->id])[(int) $student->id] ?? $student->user_id_no],
            'program' => null,
            'curriculum' => null,
        ];

        $latest = DB::table('enrolled_students as es')
            ->join('year_section as ys', 'ys.id', '=', 'es.year_section_id')
            ->join('school_years as sy', 'sy.id', '=', 'ys.school_year_id')
            ->where('es.student_id', $student->id)
            ->orderByRaw(self::YEAR_ORDER)
            ->first(['ys.course_id', 'ys.year_level_id']);
        $courseId = $latest ? (int) $latest->course_id : (int) DB::table('student_curricula')->where('student_id', $student->id)->orderByDesc('updated_at')->value('course_id');
        if (!$courseId) {
            return $base + ['message' => 'This student has no enrollment in this system yet, so their program isn’t known.'];
        }

        $course = DB::table('course')->where('id', $courseId)->first(['id', 'course_name', 'course_name_abbreviation']);
        $curriculum = $this->curricula->resolve($student->id, $courseId, $latest ? (int) $latest->year_level_id : null);
        $base['program'] = ['id' => (int) $course->id, 'abbreviation' => $course->course_name_abbreviation, 'name' => $course->course_name];
        $base['curriculum'] = $curriculum;
        $base['curricula'] = array_values(array_map(fn ($c) => ['id' => $c['id'], 'label' => $c['label']], $this->curricula->curricula($courseId)));
        $base['permissions'] = [
            'change_curriculum' => $this->canMatch($request, $courseId),
            'match' => $this->canMatch($request, $courseId),
            'approve' => $this->canApprove($request, $courseId),
        ];
        if ($curriculum === null) {
            return $base + ['message' => 'This program has no curriculum yet.'];
        }

        $records = $this->records->forStudent($student->id);
        $matches = $this->audit->matches($student->id);
        $result = $this->audit->audit($curriculum['id'], $records, $matches);
        $names = $this->names(collect($matches)->flatMap(fn ($m) => [$m['requested_by'], $m['decided_by']])->all());
        $userId = (int) $request->user()->id;

        $terms = [];
        $summary = ['units_earned' => 0, 'units_total' => 0, 'subjects' => 0, 'passed' => 0, 'in_progress' => 0, 'failed' => 0, 'not_taken' => 0, 'check' => 0, 'pending' => 0];
        foreach ($result['entries'] as $entryResult) {
            $entry = $entryResult['entry'];
            $summary['subjects']++;
            $summary['units_total'] += $entry['units'];
            $status = $entryResult['status'];
            if ($status === 'passed') {
                $summary['passed']++;
                $summary['units_earned'] += $entry['units'];
            } elseif ($status === 'in_progress') {
                $summary['in_progress']++;
            } elseif ($status === 'not_taken') {
                $summary['not_taken']++;
            } else {
                $summary['failed']++;
            }
            if ($entryResult['how'] === CurriculumAudit::CHECK && $status === 'passed') {
                $summary['check']++;
            }
            $summary['pending'] += count($entryResult['pending']);

            $key = "{$entry['year_level_id']}-{$entry['semester_id']}";
            $terms[$key] ??= ['year_level_id' => $entry['year_level_id'], 'semester_id' => $entry['semester_id'], 'subjects' => []];
            $terms[$key]['subjects'][] = [
                'entry_id' => $entry['id'],
                'subject_id' => $entry['subject_id'],
                'code' => $entry['code'],
                'title' => $entry['title'],
                'units' => $entry['units'],
                'status' => $status,
                'how' => $entryResult['how'],
                'record' => $entryResult['best'] === null ? null : $this->recordView($entryResult['best'], $entryResult['match'], $names, $userId),
                'attempts' => count($entryResult['records']),
                'pending' => array_map(fn ($r) => $this->recordView($r, $r['match'], $names, $userId), $entryResult['pending']),
            ];
        }

        return $base + [
            'summary' => $summary,
            'terms' => array_values($terms),
            'others' => array_map(fn ($r) => $this->recordView($r, $r['match'], $names, $userId) + ['suggestions' => $r['suggestions']], $result['others']),
            'hidden' => array_map(fn ($r) => $this->recordView($r, $r['match'], $names, $userId), $result['hidden']),
        ];
    }

    private function recordView(array $record, ?array $match = null, array $names = [], ?int $userId = null): array
    {
        return [
            'ref' => $record['ref'],
            'source_type' => $record['source_type'],
            'source_id' => $record['source_id'],
            'subject_id' => $record['subject_id'],
            'code' => $record['code'],
            'title' => $record['title'],
            'units' => $record['units'],
            'status' => $record['status'],
            'grade' => $record['grade'],
            'term' => $record['term'],
            'transferee' => $record['transferee'],
            'match' => $match === null ? null : [
                'id' => $match['id'],
                'status' => $match['status'],
                'subject_id' => $match['subject_id'],
                'target' => $match['subject_id'] === null ? null : $this->audit->label($match['subject_id']),
                'note' => $match['note'],
                'requested_by' => $names[$match['requested_by']] ?? null,
                'decided_by' => $names[$match['decided_by']] ?? null,
                'decided_at' => $match['decided_at'],
                'mine' => $userId !== null && $match['requested_by'] === $userId,
            ],
        ];
    }

    /** "The same subject for everyone": put the class's subject and the curriculum subject in one same-subject group. */
    private function sameForEveryone(Request $request, SubjectGroups $groups, int $courseId, array $record, ?int $subjectId): void
    {
        if (!$this->canApprove($request, $courseId)) {
            throw new AuthorizationException('Only a program head can make two subjects the same subject for everyone.');
        }
        if ($record['subject_id'] === null || $subjectId === null) {
            throw ValidationException::withMessages(['scope' => 'Only a class taken in this system can be made the same subject for everyone; use “this student only” instead.']);
        }

        $index = $groups->index();
        $own = DB::table('subjects')->whereIn('id', [$record['subject_id'], $subjectId])->get(['id', 'subject_code', 'descriptive_title'])->keyBy('id');
        $groupOf = fn (int $id) => SubjectGroups::groupIn($index, $id, (string) $own[$id]->subject_code, (string) $own[$id]->descriptive_title);
        $a = $groupOf($record['subject_id']);
        $b = $groupOf($subjectId);
        $departmentId = (int) $this->departmentId($request);
        $userId = (int) $request->user()->id;

        if ($a !== null && $b !== null && $a !== $b) {
            throw ValidationException::withMessages(['scope' => 'These two subjects are already in different same-subject groups. Combine them on the Same subjects page.']);
        }
        if ($a === null && $b === null) {
            $groups->create((string) $own[$subjectId]->descriptive_title, [$record['subject_id'], $subjectId], $userId, $departmentId);
        } elseif ($a !== $b) {
            $groups->addMembers($a ?? $b, [$a === null ? $record['subject_id'] : $subjectId], $userId, $departmentId);
        }
    }

    // ---- People ----

    private function student(string $idNo): object
    {
        $student = DB::table('users')->where('user_id_no', $idNo)->where('user_role', 'student')->first(['id', 'user_id_no']);
        if ($student === null) {
            throw ValidationException::withMessages(['id_no' => 'No student has that ID number.']);
        }

        return $student;
    }

    private function pendingMatch(int $id): StudentGradeMatch
    {
        $row = StudentGradeMatch::findOrFail($id);
        if ($row->status !== StudentGradeMatch::PENDING) {
            throw ValidationException::withMessages(['match' => 'This match was already decided. Refresh the page.']);
        }

        return $row;
    }

    private function departmentId(Request $request): ?int
    {
        $user = $request->user();
        $departmentId = $user ? Faculty::where('faculty_id', $user->id)->value('department_id') : null;

        return $departmentId === null ? null : (int) $departmentId;
    }

    private function courseInDepartment(int $courseId, ?int $departmentId): bool
    {
        return $departmentId !== null && DB::table('course')->where('id', $courseId)->where('department_id', $departmentId)->exists();
    }

    /** The registrar, or a program head or evaluator of the program's department. */
    private function canMatch(Request $request, int $courseId): bool
    {
        $role = $request->user()?->user_role;

        return $role === 'registrar'
            || (in_array($role, ['program_head', 'evaluator'], true) && $this->courseInDepartment($courseId, $this->departmentId($request)));
    }

    /** A program head of the program's department. */
    private function canApprove(Request $request, int $courseId): bool
    {
        return $request->user()?->user_role === 'program_head' && $this->courseInDepartment($courseId, $this->departmentId($request));
    }

    private function authorizeApprover(Request $request, int $courseId): void
    {
        if (!$this->canApprove($request, $courseId)) {
            throw new AuthorizationException('Only a program head of this program can approve or reject this match.');
        }
    }

    /** @return array<int, string> user id => "First Last" */
    private function names(array $userIds): array
    {
        $ids = array_values(array_filter(array_unique(array_map('intval', $userIds))));
        if ($ids === [] || !DB::getSchemaBuilder()->hasTable('user_information')) {
            return [];
        }

        return DB::table('user_information')->whereIn('user_id', $ids)->get(['user_id', 'first_name', 'last_name'])
            ->mapWithKeys(fn ($u) => [(int) $u->user_id => trim("{$u->first_name} {$u->last_name}")])->all();
    }
}
