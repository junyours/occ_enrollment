<?php

namespace App\Http\Controllers\AcademicDean;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GradeSubmissionController extends Controller
{
    public function index(Request $request): Response
    {
        $inspector = $request->user()->activityLogIdentity();
        log_activity(
            'grade_submissions.viewed',
            $request->user(),
            $this->identityLabel($inspector).' opened the faculty grade submission report.',
            ['inspector' => $inspector],
        );

        return Inertia::render('Schedules/GradeSubmissions');
    }

    public function data(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'search' => ['nullable', 'string', 'max:200'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $schoolYear = SchoolYear::findOrFail($validated['school_year_id']);
        $search = trim($validated['search'] ?? '');

        $query = User::query()
            ->select('users.id', 'users.user_id_no', 'users.user_role', 'info.first_name', 'info.middle_name', 'info.last_name')
            ->leftJoin('user_information as info', 'info.user_id', '=', 'users.id')
            ->leftJoinSub($this->regularClasses($schoolYear->id), 'regular', 'regular.faculty_id', '=', 'users.id')
            ->leftJoinSub($this->nstpClasses($schoolYear->id), 'nstp', 'nstp.faculty_id', '=', 'users.id')
            ->whereIn('users.user_role', ['faculty', 'program_head', 'evaluator', 'registrar', 'nstp_faculty'])
            ->where(function ($query) {
                $query->whereNotNull('regular.faculty_id')->orWhereNotNull('nstp.faculty_id');
            })
            ->selectRaw('COALESCE(regular.classes, 0) as regular_classes, COALESCE(nstp.classes, 0) as nstp_classes')
            ->selectRaw('COALESCE(regular.classes, 0) + COALESCE(nstp.classes, 0) as total_classes')
            ->selectRaw('COALESCE(regular.midterm_submitted, 0) as regular_midterm_submitted, COALESCE(nstp.midterm_submitted, 0) as nstp_midterm_submitted')
            ->selectRaw('COALESCE(regular.final_submitted, 0) as regular_final_submitted, COALESCE(nstp.final_submitted, 0) as nstp_final_submitted')
            ->selectRaw('COALESCE(regular.midterm_submitted, 0) + COALESCE(nstp.midterm_submitted, 0) as midterm_submitted')
            ->selectRaw('COALESCE(regular.final_submitted, 0) + COALESCE(nstp.final_submitted, 0) as final_submitted');

        // Match full names in either order, as well as IDs and role names.
        foreach (preg_split('/\s+/', $search, -1, PREG_SPLIT_NO_EMPTY) as $term) {
            $query->where(function ($query) use ($term) {
                $pattern = '%'.mb_strtolower($term).'%';
                $query->whereRaw('LOWER(users.user_id_no) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(users.user_role) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(info.first_name) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(info.middle_name) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(info.last_name) LIKE ?', [$pattern]);
            });
        }

        $users = $query->orderBy('info.last_name')->orderBy('info.first_name')->orderBy('users.id')
            ->paginate($validated['per_page'] ?? 10)
            ->withQueryString();

        $users->through(function (User $user) {
            $row = $user->toArray();
            foreach (['regular_classes', 'nstp_classes', 'total_classes', 'regular_midterm_submitted',
                'nstp_midterm_submitted', 'regular_final_submitted', 'nstp_final_submitted',
                'midterm_submitted', 'final_submitted'] as $field) {
                $row[$field] = (int) $row[$field];
            }

            return $row;
        });

        $inspector = $request->user()->activityLogIdentity();
        $schoolYearDetails = $this->schoolYearIdentity($schoolYear);
        log_activity(
            'grade_submissions.inspected',
            $schoolYear,
            $this->identityLabel($inspector).' inspected grade submission progress for '.$users->total()
                .' faculty members for '.$schoolYearDetails['label'].'.',
            [
                'school_year_id' => $schoolYear->id,
                'school_year' => $schoolYearDetails,
                'inspector' => $inspector,
                'search' => $search,
                'page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'result_count' => $users->total(),
            ],
        );

        return response()->json($users);
    }

    public function subjects(Request $request, User $user): JsonResponse
    {
        abort_unless(in_array($user->user_role, ['faculty', 'program_head', 'evaluator', 'registrar', 'nstp_faculty'], true), 404);

        $validated = $request->validate([
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'search' => ['nullable', 'string', 'max:200'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $schoolYearId = (int) $validated['school_year_id'];
        $search = trim($validated['search'] ?? '');

        $regular = DB::table('year_section_subjects as classes')
            ->join('year_section as sections', 'sections.id', '=', 'classes.year_section_id')
            ->join('subjects', 'subjects.id', '=', 'classes.subject_id')
            ->leftJoin('grade_submissions as submissions', 'submissions.year_section_subjects_id', '=', 'classes.id')
            ->where('classes.faculty_id', $user->id)
            ->where('sections.school_year_id', $schoolYearId)
            ->where(function (Builder $query) {
                $query->whereNull('subjects.type')->orWhereRaw("LOWER(TRIM(subjects.type)) <> 'nstp'");
            })
            ->select('classes.id as class_id', 'subjects.subject_code', 'subjects.descriptive_title', 'classes.class_code', 'sections.section')
            ->groupBy('classes.id', 'subjects.subject_code', 'subjects.descriptive_title', 'classes.class_code', 'sections.section');

        $nstp = DB::table('nstp_section_schedules as schedules')
            ->join('nstp_sections as sections', 'sections.id', '=', 'schedules.nstp_section_id')
            ->leftJoin('nstp_components as components', 'components.id', '=', 'sections.nstp_component_id')
            ->leftJoin('nstp_grade_submissions as submissions', 'submissions.nstp_section_id', '=', 'sections.id')
            ->where('schedules.faculty_id', $user->id)
            ->where('sections.school_year_id', $schoolYearId)
            ->select('sections.id as class_id', 'components.component_name', 'sections.section')
            ->groupBy('sections.id', 'components.component_name', 'sections.section');

        // Merge only this teacher's selected-term classes, with one row per class.
        $classes = $this->withSubmissionStatuses($regular)->get()->map(fn ($class) => [
            'id' => 'regular-'.$class->class_id,
            'subject_code' => $class->subject_code,
            'descriptive_title' => $class->descriptive_title,
            'class_code' => $class->class_code,
            'section' => $class->section,
            'midterm_status' => $class->midterm_status,
            'final_status' => $class->final_status,
        ])->concat($this->withSubmissionStatuses($nstp)->get()->map(function ($class) {
            $subject = $class->component_name ? 'NSTP-'.mb_strtoupper($class->component_name) : 'NSTP';

            return [
                'id' => 'nstp-'.$class->class_id,
                'subject_code' => $subject,
                'descriptive_title' => $subject,
                'class_code' => null,
                'section' => $class->section,
                'midterm_status' => $class->midterm_status,
                'final_status' => $class->final_status,
            ];
        }));

        foreach (preg_split('/\s+/', mb_strtolower($search), -1, PREG_SPLIT_NO_EMPTY) as $term) {
            $classes = $classes->filter(function (array $class) use ($term) {
                $text = implode(' ', array_map(fn ($field) => $class[$field] ?? '', [
                    'subject_code', 'descriptive_title', 'class_code', 'section', 'midterm_status', 'final_status',
                ]));

                return str_contains(mb_strtolower($text), $term);
            });
        }

        $classes = $classes->sortBy([
            ['subject_code', 'asc'], ['class_code', 'asc'], ['section', 'asc'], ['id', 'asc'],
        ])->values();
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 10);
        $subjects = new LengthAwarePaginator(
            $classes->forPage($page, $perPage)->values(),
            $classes->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        $inspector = $request->user()->activityLogIdentity();
        $teacher = $user->activityLogIdentity();
        $schoolYearDetails = $this->schoolYearIdentity(SchoolYear::findOrFail($schoolYearId));
        log_activity(
            'grade_submissions.subjects_inspected',
            $user,
            $this->identityLabel($inspector).' inspected '.$this->identityLabel($teacher)
                .'\'s subjects and midterm/final grade submission statuses for '.$schoolYearDetails['label']
                .', showing '.$subjects->total().' matching classes.',
            [
                'school_year_id' => $schoolYearId,
                'school_year' => $schoolYearDetails,
                'teacher_id' => $user->id,
                'teacher' => $teacher,
                'inspector' => $inspector,
                'search' => $search,
                'page' => $page,
                'per_page' => $perPage,
                'result_count' => $subjects->total(),
            ],
        );

        return response()->json($subjects);
    }

    private function identityLabel(array $identity): string
    {
        return $identity['name'].($identity['user_id_no'] && $identity['name'] !== $identity['user_id_no']
            ? ' ('.$identity['user_id_no'].')' : '');
    }

    private function schoolYearIdentity(SchoolYear $schoolYear): array
    {
        $schoolYear->loadMissing('Semester:id,semester_name');
        $semester = trim((string) $schoolYear->Semester?->semester_name);
        $label = $schoolYear->start_year && $schoolYear->end_year
            ? $schoolYear->start_year.'–'.$schoolYear->end_year : 'School year #'.$schoolYear->id;
        if ($semester !== '') {
            $label .= ' · '.$semester.(stripos($semester, 'semester') === false ? ' Semester' : '');
        }

        return [
            'id' => $schoolYear->id,
            'start_year' => $schoolYear->start_year,
            'end_year' => $schoolYear->end_year,
            'semester_name' => $semester,
            'label' => $label,
        ];
    }

    private function withSubmissionStatuses(Builder $query): Builder
    {
        foreach (['midterm', 'final'] as $period) {
            // Duplicate legacy rows must not duplicate classes; retain the furthest submitted state.
            $query->selectRaw("CASE MAX(CASE submissions.{$period}_status
                WHEN 'deployed' THEN 4 WHEN 'verified' THEN 3 WHEN 'submitted' THEN 2 WHEN 'rejected' THEN 1 ELSE 0 END)
                WHEN 4 THEN 'deployed' WHEN 3 THEN 'verified' WHEN 2 THEN 'submitted' WHEN 1 THEN 'rejected' ELSE 'draft' END as {$period}_status");
        }

        return $query;
    }

    private function regularClasses(int $schoolYearId): Builder
    {
        return DB::table('year_section_subjects as classes')
            ->join('year_section as sections', 'sections.id', '=', 'classes.year_section_id')
            ->join('subjects', 'subjects.id', '=', 'classes.subject_id')
            ->leftJoin('grade_submissions as submissions', 'submissions.year_section_subjects_id', '=', 'classes.id')
            ->where('sections.school_year_id', $schoolYearId)
            ->whereNotNull('classes.faculty_id')
            ->where(function (Builder $query) {
                // NSTP subject placeholders are represented by their actual NSTP sections below.
                $query->whereNull('subjects.type')->orWhereRaw("LOWER(TRIM(subjects.type)) <> 'nstp'");
            })
            ->groupBy('classes.faculty_id')
            ->select('classes.faculty_id')
            ->selectRaw('COUNT(DISTINCT classes.id) as classes')
            ->selectRaw("COUNT(DISTINCT CASE WHEN submissions.midterm_status IN ('submitted', 'verified', 'deployed') THEN classes.id END) as midterm_submitted")
            ->selectRaw("COUNT(DISTINCT CASE WHEN submissions.final_status IN ('submitted', 'verified', 'deployed') THEN classes.id END) as final_submitted");
    }

    private function nstpClasses(int $schoolYearId): Builder
    {
        return DB::table('nstp_section_schedules as schedules')
            ->join('nstp_sections as sections', 'sections.id', '=', 'schedules.nstp_section_id')
            // This foreign key references the section, not the schedule ID.
            ->leftJoin('nstp_grade_submissions as submissions', 'submissions.nstp_section_id', '=', 'sections.id')
            ->where('sections.school_year_id', $schoolYearId)
            ->whereNotNull('schedules.faculty_id')
            ->groupBy('schedules.faculty_id')
            ->select('schedules.faculty_id')
            ->selectRaw('COUNT(DISTINCT sections.id) as classes')
            ->selectRaw("COUNT(DISTINCT CASE WHEN submissions.midterm_status IN ('submitted', 'verified', 'deployed') THEN sections.id END) as midterm_submitted")
            ->selectRaw("COUNT(DISTINCT CASE WHEN submissions.final_status IN ('submitted', 'verified', 'deployed') THEN sections.id END) as final_submitted");
    }
}
