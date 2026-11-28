<?php

namespace App\Http\Controllers\Curriculum;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Curriculum;
use App\Models\CurriculumTerm;
use App\Models\CurriculumTermSubject;
use App\Models\Faculty;
use App\Models\PreRequisiteSubjects;
use App\Models\Subject;
use App\Models\YearLevel;
use App\Services\CurriculumComparison;
use App\Services\CurriculumExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Validator;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

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
            'years' => $years,
            'course_hash' => $courseId,
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
            ->with('CurriculumTerm.CurriculumTermSubject.PreRequisiteSubjects.RequiredEntry.Subject')
            ->with('CurriculumTerm.CurriculumTermSubject.Subject')
            ->get();

        // Total units of every curriculum year of this program, so the page can tell when
        // one looks incomplete next to the others.
        $programTotals = DB::table('curriculum as c')
            ->leftJoin('curriculum_term as t', 't.curriculum_id', '=', 'c.id')
            ->leftJoin('curriculum_term_subjects as e', 'e.curriculum_term_id', '=', 't.id')
            ->leftJoin('subjects as s', 's.id', '=', 'e.subject_id')
            ->where('c.course_id', $course->id)
            ->groupBy('c.id', 'c.school_year_start', 'c.school_year_end')
            ->orderBy('c.school_year_start')
            ->selectRaw('c.id, c.school_year_start, c.school_year_end, coalesce(sum(s.credit_units), 0) as units')
            ->get()
            ->map(fn ($c) => ['id' => (int) $c->id, 'label' => "{$c->school_year_start}–{$c->school_year_end}", 'units' => (int) $c->units])
            ->values();

        return response([
            'curriculum' => $curData,
            'course_id' => $courseId,
            'curriculum_id' => $curriculumId,
            'course_info' => $course,
            'unit_limits' => [
                'max_semester_units' => $course->max_semester_units ?? null,
                'max_summer_units' => $course->max_summer_units ?? null,
                'required_total_units' => $curData->first()?->required_total_units,
                'default_semester_units' => self::DEFAULT_MAX_SEMESTER_UNITS,
                'default_summer_units' => self::DEFAULT_MAX_SUMMER_UNITS,
            ],
            'program_totals' => $programTotals,
        ]);
    }

    /**
     * One curriculum year as a document: "pdf" opens a printable PDF in the browser,
     * "xlsx" downloads an Excel file. Same content as the curriculum page.
     */
    public function exportCurriculum(Request $request, $courseId, $schoolYear, $format, CurriculumExport $export)
    {
        abort_unless(in_array($format, ['pdf', 'xlsx'], true), 404);

        $course = Course::where(DB::raw('MD5(id)'), '=', $courseId)->firstOrFail();
        $this->authorizeCourse($request, (int) $course->id, 'You can only export your department’s curricula.');

        [$start, $end] = array_pad(explode('-', (string) $schoolYear, 2), 2, null);
        $curriculum = Curriculum::where('course_id', $course->id)
            ->where('school_year_start', $start)
            ->where('school_year_end', $end)
            ->firstOrFail();

        $data = $export->build((int) $curriculum->id);
        $filename = trim(preg_replace('/[\\\\\/:*?"<>|]+/', ' ', "{$course->course_name_abbreviation} Curriculum {$start}-{$end}"));

        if ($format === 'pdf') {
            $logoPath = resource_path('images/OCC_LOGO.png');

            // Font subsetting embeds only the characters used: about 76 KB instead of ~930 KB.
            return Pdf::setOption('isFontSubsettingEnabled', true)->loadView('pdf.curriculum', $data + [
                'school_name' => CurriculumExport::SCHOOL_NAME,
                'school_address' => CurriculumExport::SCHOOL_ADDRESS,
                'printed_at' => now()->format('F j, Y'),
                'logoSrc' => file_exists($logoPath) ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath)) : null,
            ])->setPaper('a4', 'portrait')->stream("{$filename}.pdf");
        }

        $path = tempnam(sys_get_temp_dir(), 'curriculum_');
        (new Xlsx($export->spreadsheet($data)))->save($path);

        return response()->download($path, "{$filename}.xlsx")->deleteFileAfterSend(true);
    }

    /** Defaults for the unit-load warnings when a program hasn't set its own limits. */
    public const DEFAULT_MAX_SEMESTER_UNITS = 26;
    public const DEFAULT_MAX_SUMMER_UNITS = 9;

    /**
     * Saves the unit-load limits shown as warnings on the curriculum page: the program's
     * maximum units per regular semester and in summer (blank = default), and this
     * curriculum year's required total units (blank = no check).
     */
    public function setUnitLimits(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'curriculum_id' => ['required', 'integer', 'exists:curriculum,id'],
            'max_semester_units' => ['nullable', 'integer', 'min:1', 'max:60'],
            'max_summer_units' => ['nullable', 'integer', 'min:1', 'max:30'],
            'required_total_units' => ['nullable', 'integer', 'min:1', 'max:400'],
        ])->validate();

        $curriculum = Curriculum::findOrFail($validated['curriculum_id']);
        $this->authorizeCourse($request, (int) $curriculum->course_id);

        DB::transaction(function () use ($validated, $curriculum) {
            // Load limits are the program's policy; the required total belongs to this curriculum year.
            Course::whereKey($curriculum->course_id)->update([
                'max_semester_units' => $validated['max_semester_units'] ?? null,
                'max_summer_units' => $validated['max_summer_units'] ?? null,
            ]);
            $curriculum->update(['required_total_units' => $validated['required_total_units'] ?? null]);
        });

        return Redirect::back();
    }

    /** Compare page for one program's curriculum years ($courseId is MD5(course.id), as elsewhere). */
    public function compareView(Request $request, $courseId)
    {
        $course = Course::where(DB::raw('MD5(id)'), '=', $courseId)->firstOrFail();
        $this->authorizeCourse($request, (int) $course->id, 'You can only compare your department’s curricula.');

        $curricula = Curriculum::where('course_id', $course->id)
            ->orderByDesc('school_year_start')->orderByDesc('school_year_end')
            ->get(['id', 'school_year_start', 'school_year_end'])
            ->map(fn ($c) => ['id' => $c->id, 'label' => "{$c->school_year_start}–{$c->school_year_end}"])
            ->values();

        return Inertia::render('Curriculum/CurriculumCompare', [
            'course' => [
                'hashed_id' => $courseId,
                'name' => $course->course_name,
                'abbreviation' => $course->course_name_abbreviation,
            ],
            'curricula' => $curricula,
        ]);
    }

    /** Differences between two curriculum years of the same program, older -> newer. */
    public function compareData(Request $request, $courseId, CurriculumComparison $comparison)
    {
        $course = Course::where(DB::raw('MD5(id)'), '=', $courseId)->firstOrFail();
        $this->authorizeCourse($request, (int) $course->id, 'You can only compare your department’s curricula.');

        $validated = Validator::make($request->all(), [
            'from' => ['required', 'integer', 'exists:curriculum,id'],
            'to' => ['required', 'integer', 'exists:curriculum,id', 'different:from'],
        ], [
            'to.different' => 'Choose two different curriculum years.',
        ])->validate();

        $ownIds = Curriculum::where('course_id', $course->id)->whereIn('id', [$validated['from'], $validated['to']])->count();
        if ($ownIds !== 2) {
            throw ValidationException::withMessages(['from' => 'Both curriculum years must belong to this program.']);
        }

        return response()->json($comparison->compare((int) $validated['from'], (int) $validated['to']));
    }

    public function addSemester(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'curr_id' => ['required', 'integer', 'exists:curriculum,id'],
            'year_level_id' => ['required', 'integer', 'exists:year_level,id'],
            'semester_id' => ['required', 'integer', 'exists:semesters,id'],
        ])->validate();

        $this->authorizeCurriculum($request, (int) $validated['curr_id']);

        $exists = CurriculumTerm::where('curriculum_id', $validated['curr_id'])
            ->where('year_level_id', $validated['year_level_id'])
            ->where('semester_id', $validated['semester_id'])
            ->exists();
        if ($exists) {
            throw ValidationException::withMessages([
                'semester_id' => 'This semester already exists in this year level.',
            ]);
        }

        CurriculumTerm::create([
            'semester_id' => $validated['semester_id'],
            'year_level_id' => $validated['year_level_id'],
            'curriculum_id' => $validated['curr_id'],
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
        $validated = Validator::make($request->all(), [
            'courseId' => ['required', 'integer', 'exists:course,id'],
            'yearLevel' => ['required', 'integer', 'exists:year_level,id'],
            'curriculumId' => ['required', 'integer', 'exists:curriculum,id'],
        ])->validate();

        $this->authorizeCourse($request, (int) $validated['courseId']);

        $belongsToCourse = Curriculum::whereKey($validated['curriculumId'])
            ->where('course_id', $validated['courseId'])
            ->exists();
        if (!$belongsToCourse) {
            throw ValidationException::withMessages([
                'curriculumId' => 'This curriculum does not belong to the selected program.',
            ]);
        }

        DB::transaction(function () use ($validated) {
            CurriculumTerm::where('year_level_id', '=', $validated['yearLevel'])
                ->join('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
                ->where('curriculum.course_id', '=', $validated['courseId'])
                ->update(['active' => 0]);

            CurriculumTerm::where('year_level_id', '=', $validated['yearLevel'])
                ->join('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
                ->where('curriculum.id', '=', $validated['curriculumId'])
                ->update(['active' => 1]);
        });
    }


    public function addSchoolYear(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'course_id' => ['required', 'integer', 'exists:course,id'],
            'school_year_start' => ['required', 'integer', 'between:1900,2100'],
            'school_year_end' => ['required', 'integer'],
            // Optional: start from a copy of another curriculum year of the same program.
            'copy_from_curriculum_id' => ['nullable', 'integer', 'exists:curriculum,id'],
        ])->validate();

        $copyFromId = isset($validated['copy_from_curriculum_id']) ? (int) $validated['copy_from_curriculum_id'] : null;
        if ($copyFromId !== null && !Curriculum::whereKey($copyFromId)->where('course_id', $validated['course_id'])->exists()) {
            throw ValidationException::withMessages([
                'copy_from_curriculum_id' => 'You can only copy a curriculum of the same program.',
            ]);
        }

        if ((int) $validated['school_year_end'] !== (int) $validated['school_year_start'] + 1) {
            throw ValidationException::withMessages([
                'school_year' => 'The ending year must be the year after the starting year.',
            ]);
        }

        $this->authorizeCourse($request, (int) $validated['course_id']);
        $request->merge($validated);

        $exist = Curriculum::where('course_id', $request->course_id)
            ->where('school_year_start', $request->school_year_start)
            ->where('school_year_end', $request->school_year_end)
            ->first();

        if ($exist) {
            return Redirect::back()->withErrors([
                'school_year' => 'This curriculum school year already existed.'
            ]);
        }

        // Save the curriculum, copying another year's contents when asked; all or nothing.
        DB::transaction(function () use ($request, $copyFromId) {
            $curriculum = Curriculum::create([
                'course_id' => $request->course_id,
                'school_year_start' => $request->school_year_start,
                'school_year_end' => $request->school_year_end,
            ]);

            if ($copyFromId !== null) {
                $this->copyCurriculumContents($copyFromId, $curriculum->id);
            }
        });

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
        $request->mergeIfMissing(['mode' => 'new']);
        $validated = Validator::make($request->all(), [
            'mode' => ['required', 'in:existing,new'],
            'curriculum_term_id' => ['required', 'integer', 'exists:curriculum_term,id'],
            'subject_id' => ['exclude_unless:mode,existing', 'required', 'integer', 'exists:subjects,id'],
            ...$this->subjectRules('exclude_unless:mode,new'),
            // New mode, code already in the catalog with other details: create another version of it.
            'create_version' => ['sometimes', 'boolean'],
        ])->validate();

        $this->authorizeCurriculumTerm($request, $validated['curriculum_term_id']);

        DB::transaction(function () use ($validated) {
            CurriculumTerm::whereKey($validated['curriculum_term_id'])->lockForUpdate()->firstOrFail();
            $errorField = $validated['mode'] === 'existing' ? 'subject_id' : 'subject_code';

            if ($validated['mode'] === 'existing') {
                $subject = Subject::findOrFail($validated['subject_id']);
                $code = $subject->subject_code;
            } else {
                $fields = $this->subjectFields($validated);
                $code = $fields['subject_code'];
            }

            // Each code appears once per curriculum (not just per semester); "IT104-" counts as IT104.
            $existing = $this->curriculumEntryWithCode((int) $validated['curriculum_term_id'], $code);
            if ($existing) {
                throw ValidationException::withMessages([$errorField => $this->alreadyInCurriculumMessage($existing, $code)]);
            }

            if ($validated['mode'] === 'new') {
                // A code can have several versions: its title or units can differ between curriculum
                // years. An identical version is reused; a different one needs an explicit confirmation.
                $versions = Subject::where('subject_code', $code)->orderByDesc('id')->get();
                $identical = $versions->first(fn ($version) => self::sameSubjectDetails($version, $fields));
                if ($identical) {
                    $subject = $identical;
                } elseif ($versions->isNotEmpty() && !($validated['create_version'] ?? false)) {
                    throw ValidationException::withMessages([
                        'subject_code' => "{$code} already exists with different details. Use one of its versions, or confirm creating a new version for this curriculum.",
                    ]);
                } else {
                    // A new version keeps the kind of subject (type) of the code's latest version.
                    $subject = Subject::create([...($versions->isNotEmpty() ? ['type' => $versions->first()->type] : []), ...$fields]);
                }
            }

            CurriculumTermSubject::create([
                'curriculum_term_id' => $validated['curriculum_term_id'],
                'subject_id' => $subject->id,
            ]);
        });

        return Redirect::back();
    }

    public function editSubject(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'id' => ['required', 'integer', 'exists:curriculum_term_subjects,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            ...$this->subjectRules(),
        ])->validate();

        $entry = CurriculumTermSubject::findOrFail($validated['id']);
        $this->authorizeCurriculumTerm($request, $entry->curriculum_term_id);

        DB::transaction(function () use ($validated, $entry) {
            CurriculumTerm::whereKey($entry->curriculum_term_id)->lockForUpdate()->firstOrFail();
            $entry = CurriculumTermSubject::whereKey($entry->id)->lockForUpdate()->firstOrFail();
            if (isset($validated['subject_id']) && (int) $validated['subject_id'] !== (int) $entry->subject_id) {
                throw ValidationException::withMessages([
                    'subject_code' => 'This curriculum entry changed while you were editing. Refresh it and try again.',
                ]);
            }

            $subject = Subject::findOrFail($entry->subject_id);
            $fields = $this->subjectFields($validated);
            $unchanged = collect($fields)->every(fn ($value, $field) => (string) $subject->{$field} === (string) $value);
            if ($unchanged) {
                return;
            }

            // A new code must not already be in this curriculum ("IT104-" counts as IT104).
            // Revisions that keep the code are never blocked, so existing data can still be fixed.
            if ($fields['subject_code'] !== $subject->subject_code) {
                $existing = $this->curriculumEntryWithCode((int) $entry->curriculum_term_id, $fields['subject_code'], (int) $entry->id);
                if ($existing) {
                    throw ValidationException::withMessages(['subject_code' => $this->alreadyInCurriculumMessage($existing, $fields['subject_code'])]);
                }
            }

            // A curriculum revision must never rewrite subject details used by past classes:
            // point this entry at an identical existing version of the code, or at a new version.
            $identical = Subject::where('subject_code', $fields['subject_code'])
                ->where('id', '!=', $subject->id)
                ->orderByDesc('id')
                ->get()
                ->first(fn ($version) => self::sameSubjectDetails($version, $fields));
            $revisedSubject = $identical ?? Subject::create(['type' => $subject->type, ...$fields]);
            $entry->update(['subject_id' => $revisedSubject->id]);
        });

        return Redirect::back();
    }

    /**
     * Replaces a curriculum subject's prerequisites.
     *
     * Prerequisites must be subjects from an EARLIER term of the same curriculum
     * (earlier year, or same year and earlier semester; Summer comes after Second),
     * which also rules out self-references and circular chains. All listed
     * subjects are required (AND). Year standing is optional and can't be above
     * the subject's own year level.
     */
    public function setPrerequisites(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'id' => ['required', 'integer', 'exists:curriculum_term_subjects,id'],
            'prerequisite_ids' => ['present', 'array', 'max:20'],
            'prerequisite_ids.*' => ['integer', 'distinct'],
            'required_year_level_id' => ['nullable', 'integer', 'exists:year_level,id'],
        ], [
            'prerequisite_ids.max' => 'Choose at most 20 prerequisites.',
        ])->validate();

        $entry = CurriculumTermSubject::with('CurriculumTerm')->findOrFail($validated['id']);
        $this->authorizeCurriculumTerm($request, $entry->curriculum_term_id);

        $term = $entry->CurriculumTerm;
        $requiredIds = array_map('intval', $validated['prerequisite_ids']);

        $allowedIds = CurriculumTermSubject::query()
            ->join('curriculum_term', 'curriculum_term.id', '=', 'curriculum_term_subjects.curriculum_term_id')
            ->where('curriculum_term.curriculum_id', $term->curriculum_id)
            ->where(function ($query) use ($term) {
                $query->where('curriculum_term.year_level_id', '<', $term->year_level_id)
                    ->orWhere(function ($query) use ($term) {
                        $query->where('curriculum_term.year_level_id', $term->year_level_id)
                            ->where('curriculum_term.semester_id', '<', $term->semester_id);
                    });
            })
            ->whereIn('curriculum_term_subjects.id', $requiredIds ?: [0])
            ->pluck('curriculum_term_subjects.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($allowedIds) !== count($requiredIds)) {
            throw ValidationException::withMessages([
                'prerequisite_ids' => 'Prerequisites must be subjects from an earlier semester of this curriculum.',
            ]);
        }

        $yearStanding = $validated['required_year_level_id'] ?? null;
        if ($yearStanding !== null && (int) $yearStanding > (int) $term->year_level_id) {
            throw ValidationException::withMessages([
                'required_year_level_id' => 'Year standing can’t be higher than this subject’s own year level.',
            ]);
        }

        DB::transaction(function () use ($entry, $requiredIds, $yearStanding) {
            CurriculumTermSubject::whereKey($entry->id)->lockForUpdate()->firstOrFail();

            PreRequisiteSubjects::where('curriculum_term_subjects_id', $entry->id)->delete();
            foreach ($requiredIds as $requiredId) {
                PreRequisiteSubjects::create([
                    'curriculum_term_subjects_id' => $entry->id,
                    'required_term_subject_id' => $requiredId,
                ]);
            }

            $entry->update(['required_year_level_id' => $yearStanding]);
        });

        return Redirect::back();
    }

    public function searchSubjects(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'q' => ['nullable', 'string', 'max:100'],
            // Exact code lookup: every version of a code, plus old hyphenated variants (IT104-, IT104--).
            'code' => ['nullable', 'string', 'max:255'],
        ])->validate();
        $columns = ['id', 'subject_code', 'descriptive_title', 'credit_units', 'lecture_hours', 'laboratory_hours'];

        $code = trim($validated['code'] ?? '');
        if ($code !== '') {
            $key = self::subjectCodeKey($code);
            $prefix = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], rtrim($code, '-'));
            $versions = Subject::select($columns)
                ->where('subject_code', 'like', $prefix.'%')
                ->orderByDesc('id')
                ->limit(200)
                ->get()
                ->filter(fn ($subject) => self::subjectCodeKey($subject->subject_code) === $key)
                ->values();

            return response()->json(['subjects' => $this->withSubjectUsage($versions), 'truncated' => false]);
        }

        $search = trim($validated['q'] ?? '');
        $subjects = Subject::select($columns)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('subject_code', 'like', '%' . $search . '%')
                        ->orWhere('descriptive_title', 'like', '%' . $search . '%');
                });
            })
            ->orderBy('subject_code')
            ->orderByDesc('id')
            ->limit(31)
            ->get();

        return response()->json([
            'subjects' => $this->withSubjectUsage($subjects->take(30)->values()),
            'truncated' => $subjects->count() > 30,
        ]);
    }

    /** Adds where each subject version is used: curriculum years and number of classes. */
    private function withSubjectUsage($subjects)
    {
        $ids = $subjects->pluck('id')->all();
        if ($ids === []) {
            return $subjects;
        }

        $usedIn = DB::table('curriculum_term_subjects as e')
            ->join('curriculum_term as t', 't.id', '=', 'e.curriculum_term_id')
            ->join('curriculum as c', 'c.id', '=', 't.curriculum_id')
            ->join('course as co', 'co.id', '=', 'c.course_id')
            ->whereIn('e.subject_id', $ids)
            ->orderBy('c.school_year_start')
            ->get(['e.subject_id', 'co.course_name_abbreviation', 'c.school_year_start', 'c.school_year_end'])
            ->groupBy('subject_id')
            ->map(fn ($rows) => $rows
                ->map(fn ($r) => trim("{$r->course_name_abbreviation} {$r->school_year_start}–{$r->school_year_end}"))
                ->unique()->values()->all());

        $classes = DB::table('year_section_subjects')
            ->whereIn('subject_id', $ids)
            ->selectRaw('subject_id, count(*) as total')
            ->groupBy('subject_id')
            ->pluck('total', 'subject_id');

        return $subjects->map(fn ($subject) => [
            ...$subject->toArray(),
            'used_in' => $usedIn[$subject->id] ?? [],
            'classes' => (int) ($classes[$subject->id] ?? 0),
        ])->values();
    }

    private const YEAR_LEVEL_NAMES = [1 => 'First Year', 2 => 'Second Year', 3 => 'Third Year', 4 => 'Fourth Year'];
    private const SEMESTER_NAMES = [1 => '1st semester', 2 => '2nd semester', 3 => 'Summer'];

    /** A code as people mean it: case, spaces and trailing hyphens ignored ("it104-" is IT104). */
    private static function subjectCodeKey(string $code): string
    {
        return rtrim(strtoupper(preg_replace('/\s+/', '', $code)), '-');
    }

    /** The same subject: same code, title (ignoring case and spacing), units and hours. */
    private static function sameSubjectDetails(Subject $subject, array $fields): bool
    {
        $title = fn ($value) => strtolower(preg_replace('/\s+/', ' ', trim((string) $value)));

        return strcasecmp(trim((string) $subject->subject_code), $fields['subject_code']) === 0
            && $title($subject->descriptive_title) === $title($fields['descriptive_title'])
            && (int) $subject->credit_units === $fields['credit_units']
            && (int) $subject->lecture_hours === $fields['lecture_hours']
            && (int) $subject->laboratory_hours === $fields['laboratory_hours'];
    }

    /** Another entry of the same curriculum with the same code (see subjectCodeKey), or null. */
    private function curriculumEntryWithCode(int $termId, string $code, ?int $ignoreEntryId = null): ?CurriculumTermSubject
    {
        $curriculumId = CurriculumTerm::whereKey($termId)->value('curriculum_id');
        $key = self::subjectCodeKey($code);

        return CurriculumTermSubject::query()
            ->whereIn('curriculum_term_id', CurriculumTerm::where('curriculum_id', $curriculumId)->select('id'))
            ->when($ignoreEntryId !== null, fn ($query) => $query->where('id', '!=', $ignoreEntryId))
            ->with(['Subject', 'CurriculumTerm'])
            ->get()
            ->first(fn ($entry) => $entry->Subject && self::subjectCodeKey($entry->Subject->subject_code) === $key);
    }

    private function alreadyInCurriculumMessage(CurriculumTermSubject $existing, string $code): string
    {
        $term = $existing->CurriculumTerm;
        $year = self::YEAR_LEVEL_NAMES[(int) ($term?->year_level_id)] ?? null;
        $semester = self::SEMESTER_NAMES[(int) ($term?->semester_id)] ?? null;
        $where = $year && $semester ? " ({$year}, {$semester})" : '';
        $existingCode = $existing->Subject->subject_code;

        return strcasecmp($existingCode, $code) === 0
            ? "{$existingCode} is already in this curriculum{$where}."
            : "This curriculum already has {$existingCode}{$where}, which is the same code as {$code}.";
    }

    private function subjectRules(?string $condition = null): array
    {
        $prefix = $condition ? [$condition] : [];

        return [
            'subject_code' => [...$prefix, 'required', 'string', 'max:255', 'regex:/^\S+$/u'],
            'descriptive_title' => [...$prefix, 'required', 'string', 'max:255'],
            'credit_units' => [...$prefix, 'required', 'integer', 'min:0', 'max:99'],
            'lecture_hours' => [...$prefix, 'required', 'integer', 'min:0', 'max:168'],
            'laboratory_hours' => [...$prefix, 'required', 'integer', 'min:0', 'max:168'],
        ];
    }

    private function subjectFields(array $validated): array
    {
        return [
            'subject_code' => trim($validated['subject_code']),
            'descriptive_title' => trim($validated['descriptive_title']),
            'credit_units' => (int) $validated['credit_units'],
            'lecture_hours' => (int) $validated['lecture_hours'],
            'laboratory_hours' => (int) $validated['laboratory_hours'],
        ];
    }

    /**
     * Copies semesters, subjects, year standings and prerequisites from one curriculum
     * into another (empty) one. Subjects are shared, not duplicated: the new entries point
     * at the same subjects. Prerequisite links are re-pointed at the copied entries.
     * The copied semesters are not made active; that stays a separate, deliberate step.
     */
    private function copyCurriculumContents(int $fromCurriculumId, int $toCurriculumId): void
    {
        $entryMap = []; // source curriculum_term_subjects.id => copied id

        $terms = CurriculumTerm::where('curriculum_id', $fromCurriculumId)
            ->with('CurriculumTermSubject')
            ->orderBy('year_level_id')
            ->orderBy('semester_id')
            ->get();

        foreach ($terms as $term) {
            $newTerm = CurriculumTerm::create([
                'curriculum_id' => $toCurriculumId,
                'year_level_id' => $term->year_level_id,
                'semester_id' => $term->semester_id,
                'active' => 0,
            ]);

            foreach ($term->CurriculumTermSubject as $entry) {
                $copy = new CurriculumTermSubject([
                    'curriculum_term_id' => $newTerm->id,
                    'subject_id' => $entry->subject_id,
                    'required_year_level_id' => $entry->required_year_level_id,
                ]);
                // Older free-text prerequisite, if any (not mass-assignable).
                $copy->pre_requisite_name = $entry->pre_requisite_name;
                $copy->save();

                $entryMap[$entry->id] = $copy->id;
            }
        }

        if ($entryMap === []) {
            return;
        }

        $links = PreRequisiteSubjects::whereIn('curriculum_term_subjects_id', array_keys($entryMap))
            ->whereNotNull('required_term_subject_id')
            ->get();

        foreach ($links as $link) {
            $from = $entryMap[$link->curriculum_term_subjects_id] ?? null;
            $required = $entryMap[$link->required_term_subject_id] ?? null;
            if ($from !== null && $required !== null) {
                PreRequisiteSubjects::create([
                    'curriculum_term_subjects_id' => $from,
                    'required_term_subject_id' => $required,
                ]);
            }
        }
    }

    /** The signed-in program head's department, or null. */
    private function userDepartmentId(Request $request): ?int
    {
        $user = $request->user();
        $departmentId = $user ? Faculty::where('faculty_id', $user->id)->value('department_id') : null;

        return $departmentId === null ? null : (int) $departmentId;
    }

    /** Only a program head of the course's own department may change its curricula. */
    private function authorizeCourse(Request $request, int $courseId, string $message = 'You cannot change this curriculum.'): void
    {
        $departmentId = $this->userDepartmentId($request);
        $allowed = $departmentId !== null && Course::whereKey($courseId)->where('department_id', $departmentId)->exists();

        if (!$allowed) {
            throw new AuthorizationException($message);
        }
    }

    private function authorizeCurriculum(Request $request, int $curriculumId): void
    {
        $courseId = Curriculum::whereKey($curriculumId)->value('course_id');
        if ($courseId === null) {
            throw new AuthorizationException('You cannot change this curriculum.');
        }

        $this->authorizeCourse($request, (int) $courseId);
    }

    private function authorizeCurriculumTerm(Request $request, int $termId): void
    {
        $departmentId = $this->userDepartmentId($request);
        $allowed = $departmentId !== null && CurriculumTerm::where('curriculum_term.id', $termId)
            ->join('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
            ->join('course', 'course.id', '=', 'curriculum.course_id')
            ->where('course.department_id', $departmentId)
            ->exists();

        if (!$allowed) {
            throw new AuthorizationException('You cannot change this curriculum.');
        }
    }
    public function deleteCurrSubject(Request $request, $id)
    {
        $entry = CurriculumTermSubject::findOrFail($id);
        $this->authorizeCurriculumTerm($request, (int) $entry->curriculum_term_id);

        $entry->delete();

        return response()->json(['message' => 'success'], 200);
    }
}
