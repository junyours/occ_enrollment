<?php

namespace App\Http\Controllers\Curriculum;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Curriculum;
use App\Models\CurriculumTerm;
use App\Models\CurriculumTermSubject;
use App\Models\Faculty;
use App\Models\Subject;
use App\Models\YearLevel;
use Inertia\Inertia;
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
            'years' => $years
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
            ->with('CurriculumTerm.CurriculumTermSubject.PreRequisiteSubjects')
            ->with('CurriculumTerm.CurriculumTermSubject.Subject')
            ->get();

        return response([
            'curriculum' => $curData,
            'course_id' => $courseId,
            'curriculum_id' => $curriculumId,
            'course_info' => $course
        ]);
    }

    public function addSemester(Request $request)
    {
        CurriculumTerm::create([
            'semester_id' => $request->semester_id,
            'year_level_id' => $request->year_level_id,
            'curriculum_id' => $request->curr_id,
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
        CurriculumTerm::where('year_level_id', '=', $request->yearLevel)
            ->join('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
            ->where('curriculum.course_id', '=', $request->courseId)
            ->update(['active' => 0]);

        CurriculumTerm::where('year_level_id', '=', $request->yearLevel)
            ->join('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
            ->where('curriculum.id', '=', $request->curriculumId)
            ->update(['active' => 1]);
    }


    public function addSchoolYear(Request $request)
    {
        // You already have course_id as MD5(id), so match on that
        $exist = Curriculum::where('course_id', $request->course_id)
            ->where('school_year_start', $request->school_year_start)
            ->where('school_year_end', $request->school_year_end)
            ->first();

        if ($exist) {
            return Redirect::back()->withErrors([
                'school_year' => 'This curriculum school year already existed.'
            ]);
        }

        // Save the curriculum
        Curriculum::create([
            'course_id' => $request->course_id,
            'school_year_start' => $request->school_year_start,
            'school_year_end' => $request->school_year_end,
        ]);

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
        ])->validate();

        $this->authorizeCurriculumTerm($request, $validated['curriculum_term_id']);

        DB::transaction(function () use ($validated) {
            CurriculumTerm::whereKey($validated['curriculum_term_id'])->lockForUpdate()->firstOrFail();

            if ($validated['mode'] === 'existing') {
                $subject = Subject::findOrFail($validated['subject_id']);
            } else {
                $fields = $this->subjectFields($validated);
                if (Subject::where('subject_code', $fields['subject_code'])->exists()) {
                    throw ValidationException::withMessages([
                        'subject_code' => 'This code already exists. Choose Use existing subject to select its definition.',
                    ]);
                }
                $subject = Subject::create($fields);
            }

            $duplicate = CurriculumTermSubject::where('curriculum_term_id', $validated['curriculum_term_id'])
                ->whereHas('Subject', fn ($query) => $query->where('subject_code', $subject->subject_code))
                ->exists();
            if ($duplicate) {
                throw ValidationException::withMessages([
                    $validated['mode'] === 'existing' ? 'subject_id' : 'subject_code' => 'A subject with this code is already in this semester.',
                ]);
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

            $duplicateInTerm = CurriculumTermSubject::where('curriculum_term_id', $entry->curriculum_term_id)
                ->where('id', '!=', $entry->id)
                ->whereHas('Subject', fn ($query) => $query->where('subject_code', $fields['subject_code']))
                ->exists();
            $changedCodeExists = $fields['subject_code'] !== $subject->subject_code
                && Subject::where('subject_code', $fields['subject_code'])->exists();
            if ($duplicateInTerm || $changedCodeExists) {
                throw ValidationException::withMessages([
                    'subject_code' => 'This code already exists. Choose a different code or add the existing subject instead.',
                ]);
            }

            // A curriculum revision must never rewrite subject details used by past classes.
            $revisedSubject = Subject::create(['type' => $subject->type, ...$fields]);
            $entry->update(['subject_id' => $revisedSubject->id]);
        });

        return Redirect::back();
    }

    public function searchSubjects(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'q' => ['nullable', 'string', 'max:100'],
        ])->validate();
        $search = trim($validated['q'] ?? '');
        $subjects = Subject::select('id', 'subject_code', 'descriptive_title', 'credit_units', 'lecture_hours', 'laboratory_hours')
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
            'subjects' => $subjects->take(30)->values(),
            'truncated' => $subjects->count() > 30,
        ]);
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

    private function authorizeCurriculumTerm(Request $request, int $termId): void
    {
        $user = $request->user();
        $departmentId = $user ? Faculty::where('faculty_id', $user->id)->value('department_id') : null;
        $allowed = $departmentId !== null && CurriculumTerm::where('curriculum_term.id', $termId)
            ->join('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
            ->join('course', 'course.id', '=', 'curriculum.course_id')
            ->where('course.department_id', $departmentId)
            ->exists();

        if (!$allowed) {
            throw new AuthorizationException('You cannot change this curriculum.');
        }
    }
    public function deleteCurrSubject($id)
    {
        CurriculumTermSubject::where('id', '=', $id)
            ->delete();

        return response()->json(['message' => 'success'], 200);
    }
}
