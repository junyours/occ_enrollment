<?php

namespace App\Http\Controllers\Enrollment;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CurriculumTerm;
use App\Models\CurriculumTermSubject;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\SchoolYear;
use App\Models\Semester;
use App\Models\YearLevel;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Models\YearSection;
use App\Models\YearSectionSubjects;
use Illuminate\Support\Facades\Redirect;

class EnrollmentCourseSectionController extends Controller
{
    public function view($hashedCourseId)
    {
        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        if (!$course) {
            return Inertia::render('Enrollment/EnrollmentCourseSection', ['error' => true]);
        }

        return Inertia::render(
            'Enrollment/EnrollmentCourseSection',
            [
                'courseId' => $hashedCourseId,
                'course' => $course,
            ]
        );
    }

    public function addNewSection(Request $request)
    {
        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $request->course_id)
            ->first();

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $activeCurr = YearLevel::select(
            'year_level.year_level',
            'curriculum.id as curriculum_id'
        )
            ->leftJoin('curriculum_term', function ($join) {
                $join->on('curriculum_term.year_level_id', '=', 'year_level.id')
                    ->where('curriculum_term.active', 1);
            })
            ->leftJoin('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
            ->where('year_level.id', '=', $request->year_level_id)
            ->where(function ($query) use ($course) {
                $query->where('curriculum.course_id', '=', $course->id)
                    ->orWhereNull('curriculum.course_id');
            })
            ->first();

        // 🚨 If no curriculum is found, return an Inertia error response
        if (!$activeCurr || $activeCurr->curriculum_id === null) {
            return Redirect::back()->withErrors([
                'curriculum_id' => 'No active curriculum found for the selected year level.'
            ]);
        }

        $curriculumTerm = CurriculumTerm::where('semester_id', '=', $schoolYear->semester_id)
            ->where('curriculum_id', '=', $activeCurr->curriculum_id)
            ->where('active', '=', 1)
            ->where('year_level_id', '=', $request->year_level_id)
            ->first();

        // Get the semester name properly
        $semester = Semester::where('id', '=', $schoolYear->semester_id)->first();
        $semesterName = $semester ? $semester->semester_name . ' ' : ''; // Add space for readability

        // 🚨 If no curriculum is found, return an Inertia error response
        if (!$curriculumTerm) {
            return Redirect::back()->withErrors([
                'curriculum_id' => "Didn't find " . $semesterName . "semester with the active curriculum"
            ]);
        }

        $yearSection = YearSection::create([
            'school_year_id' => $schoolYear->id,
            'course_id' => $course->id,
            'year_level_id' => $request->year_level_id,
            'section' => $request->section,
            'max_students' => $request->max_students,
        ]);

        $subjects = CurriculumTermSubject::where('curriculum_term_id', '=', $curriculumTerm->id)->get();

        foreach ($subjects as $index => $subject) {
            YearSectionSubjects::create([
                'year_section_id' => $yearSection->id,
                'faculty_id' => null,
                'room_id' => null,
                'subject_id' => $subject->subject_id,
                'class_code' => $request->year_level_id . $request->section . $course->course_name_abbreviation . '-' . ($index + 1),
                'day' => 'TBA',
                'start_time' => 'TBA',
                'end_time' => 'TBA',
            ]);
        }
    }

    public function getEnrollmentCourseSections($hashedCourseId)
    {
        $course = DB::table('course')
            ->select('id')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        if (!$course) {
            return Inertia::render('Enrollment/EnrollmentCourseSection', ['error' => true]);
        }

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        return YearLevel::select('year_level.id', 'year_level_name')
            ->with([
                'YearSection' => function ($query) use ($schoolYear, $course) {
                    $query->select(
                        'year_section.id',
                        'year_section.school_year_id',
                        'year_section.course_id',
                        'year_section.year_level_id',
                        'year_section.section',
                        'year_section.max_students'
                    )
                        ->where('school_year_id', '=', $schoolYear->id)
                        ->where('course_id', '=', $course->id)
                        ->leftJoin('enrolled_students', 'year_section.id', '=', 'enrolled_students.year_section_id')
                        ->groupBy(
                            'year_section.id',
                            'year_section.school_year_id',
                            'year_section.course_id',
                            'year_section.year_level_id',
                            'year_section.section',
                            'year_section.max_students'
                        )
                        ->selectRaw('COUNT(enrolled_students.id) as student_count');
                }
            ])
            ->get();
    }

    public function viewClass($hashedCourseId, $yearlevel, Request $request)
    {
        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        $section = $request->query('section');

        $yearLevels = [
            'First-Year' => '1',
            'Second-Year' => '2',
            'Third-Year' => '3',
            'Fourth-Year' => '4'
        ];

        $yearLevelNumber = $yearLevels[$yearlevel] ?? '';

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $yearSection = YearSection::where('school_year_id', '=', $schoolYear->id)
            ->where('course_id', '=', $course->id)
            ->where('year_level_id', '=', $yearLevelNumber)
            ->where('section', '=', $section)
            ->first();

        return Inertia::render(
            'Enrollment/ClassScheduling/ClassScheduling',
            [
                'courseId' => $course->id,
                'yearlevel' => $yearLevelNumber,
                'section' => $section,
                'yearSectionId' =>  $yearSection->id,
                'courseName' => $course->course_name_abbreviation,
            ]
        );
    }

    public function viewStudents()
    {
        return Inertia::render('Enrollment/EnrolledStudentList');
    }

    public function enrollStudent($hashedCourseId, $yearlevel, Request $request)
    {
        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        $section = $request->query('section');

        $yearLevels = [
            'First-Year' => '1',
            'Second-Year' => '2',
            'Third-Year' => '3',
            'Fourth-Year' => '4'
        ];

        $yearLevelNumber = $yearLevels[$yearlevel] ?? '';

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $yearSection = YearSection::where('school_year_id', '=', $schoolYear->id)
            ->where('course_id', '=', $course->id)
            ->where('year_level_id', '=', $yearLevelNumber)
            ->where('section', '=', $section)
            ->first();
        return Inertia::render(
            'Enrollment/EnrollStudent',
            [
                'courseId' => $course->id,
                'yearlevel' => $yearLevelNumber,
                'section' => $section,
                'yearSectionId' =>  $yearSection->id,
                'courseName' => $course->course_name_abbreviation,
            ]
        );
    }

    private function getPreparingOrOngoingSchoolYear()
    {
        $today = Carbon::now(); // Get today's date
        $twoWeeksBeforeToday = $today->copy()->subWeeks(2); // 2 weeks before today, stored separately
        $twoWeeksAfterToday = $today->copy()->addWeeks(2); // 2 weeks after today, stored separately

        // Check if enrollment preparation is within 2 weeks before today and today
        $enrollmentPreparation = SchoolYear::whereDate('start_date', '>=', $today->toDateString())
            ->whereDate('start_date', '<=', $twoWeeksAfterToday->toDateString())
            ->first();

        // Check if enrollment is ongoing (start_date <= today <= end_date)
        $enrollmentOngoing = SchoolYear::whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->first();

        $schoolYear = null;
        $status = null;
        $preparation = false;

        // Determine the status and set the school year accordingly
        if ($enrollmentOngoing) {
            // If enrollment is ongoing, set preparation to false
            $status = 'ongoing';
            $schoolYear = $enrollmentOngoing;
            $preparation = false;
        } elseif ($enrollmentPreparation) {
            // If enrollment is in preparation, set status to preparing
            $status = 'preparing';
            $schoolYear = $enrollmentPreparation;
            $preparation = true;
        } else {
            // No enrollment preparation or ongoing, set status to false
            $status = false;
        }

        // Return status, preparation, and school year
        return [
            'status' => $status,
            'preparation' => $preparation,
            'school_year' => $schoolYear
        ];
    }
}
