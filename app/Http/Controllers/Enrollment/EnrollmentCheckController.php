<?php

namespace App\Http\Controllers\Enrollment;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Services\EnrollmentCheck;
use App\Services\StudentCurricula;
use App\Services\StudentTypes;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * The checks shown on the Enroll Student and Student Subjects pages (prerequisites,
 * already passed, the same subject twice), and the curriculum a student follows.
 */
class EnrollmentCheckController extends Controller
{
    public function check(Request $request, EnrollmentCheck $check)
    {
        $validated = Validator::make($request->all(), [
            'student_id_no' => ['required', 'string', 'max:255'],
            'year_section_id' => ['nullable', 'integer', 'exists:year_section,id', 'required_without:school_year_id'],
            'school_year_id' => ['nullable', 'integer', 'required_without:year_section_id'],
            'class_ids' => ['present', 'array', 'max:60'],
            'class_ids.*' => ['integer'],
            'new_class_ids' => ['nullable', 'array', 'max:60'],
            'new_class_ids.*' => ['integer'],
        ])->validate();

        $studentId = $this->studentId($validated['student_id_no']);
        $sectionId = $validated['year_section_id'] ?? $this->sectionFor($studentId, (int) $validated['school_year_id']);

        $result = $check->check($studentId, (int) $sectionId, $validated['class_ids'], $validated['new_class_ids'] ?? null);
        $result['can_change_curriculum'] = $this->canChangeCurriculum($request, $result['program']['id']);

        return response()->json($result);
    }

    /** Sets the curriculum a student follows in a program; null goes back to working it out. */
    public function setCurriculum(Request $request, StudentCurricula $curricula)
    {
        $validated = Validator::make($request->all(), [
            'student_id_no' => ['required', 'string', 'max:255'],
            'course_id' => ['required', 'integer', 'exists:course,id'],
            'curriculum_id' => ['nullable', 'integer', 'exists:curriculum,id'],
        ])->validate();

        $courseId = (int) $validated['course_id'];
        if (!$this->canChangeCurriculum($request, $courseId)) {
            throw new AuthorizationException('Only the registrar, or a program head or evaluator of this program’s department, can change a student’s curriculum.');
        }
        $curriculumId = isset($validated['curriculum_id']) ? (int) $validated['curriculum_id'] : null;
        if ($curriculumId !== null && !DB::table('curriculum')->where('id', $curriculumId)->where('course_id', $courseId)->exists()) {
            throw ValidationException::withMessages(['curriculum_id' => 'That curriculum belongs to another program.']);
        }

        $curricula->set($this->studentId($validated['student_id_no']), $courseId, $curriculumId, $request->user()->id);

        return response()->json(['message' => 'success']);
    }

    /**
     * The student picked on the Enroll Student page: their details, whether they're already
     * enrolled in the section's school year, and a suggested student type with the reason.
     */
    public function studentStatus(Request $request, StudentTypes $types)
    {
        $validated = Validator::make($request->all(), [
            'student_id' => ['required', 'integer'],
            'year_section_id' => ['required', 'integer', 'exists:year_section,id'],
        ])->validate();

        $student = DB::table('users')
            ->leftJoin('user_information as ui', 'ui.user_id', '=', 'users.id')
            ->where('users.id', $validated['student_id'])
            ->where('users.user_role', 'student')
            ->first(['users.id', 'users.user_id_no', 'ui.user_id', 'ui.first_name', 'ui.middle_name', 'ui.last_name']);
        if ($student === null) {
            throw ValidationException::withMessages(['student_id' => 'No student found.']);
        }

        $schoolYearId = (int) DB::table('year_section')->where('id', $validated['year_section_id'])->value('school_year_id');
        $enrolled = DB::table('enrolled_students as es')
            ->join('year_section as ys', 'ys.id', '=', 'es.year_section_id')
            ->where('es.student_id', $student->id)
            ->where('ys.school_year_id', $schoolYearId)
            ->exists();

        return response()->json([
            'student' => $student,
            'enrolled' => $enrolled,
            'suggested_type' => $types->suggest((int) $student->id, $schoolYearId),
        ]);
    }

    private function studentId(string $idNo): int
    {
        $id = DB::table('users')->where('user_id_no', $idNo)->value('id');
        if ($id === null) {
            throw ValidationException::withMessages(['student_id_no' => 'No student has that ID number.']);
        }

        return (int) $id;
    }

    private function sectionFor(int $studentId, int $schoolYearId): int
    {
        $id = DB::table('enrolled_students as es')
            ->join('year_section as ys', 'ys.id', '=', 'es.year_section_id')
            ->where('es.student_id', $studentId)
            ->where('ys.school_year_id', $schoolYearId)
            ->value('es.year_section_id');
        if ($id === null) {
            throw ValidationException::withMessages(['school_year_id' => 'The student is not enrolled in this school year.']);
        }

        return (int) $id;
    }

    /** The registrar, or a program head or evaluator of the program's department. */
    private function canChangeCurriculum(Request $request, int $courseId): bool
    {
        $user = $request->user();
        if ($user === null) {
            return false;
        }
        if ($user->user_role === 'registrar') {
            return true;
        }
        if (!in_array($user->user_role, ['program_head', 'evaluator'], true)) {
            return false;
        }
        $departmentId = Faculty::where('faculty_id', $user->id)->value('department_id');

        return $departmentId !== null && DB::table('course')->where('id', $courseId)->where('department_id', $departmentId)->exists();
    }
}
