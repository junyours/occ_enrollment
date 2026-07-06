<?php

namespace App\Http\Controllers\NstpDirector;

use App\Http\Controllers\Controller;
use App\Mail\EvaluatorCredentialsMail;
use App\Models\EnrolledStudent;
use App\Models\NstpComponent;
use App\Models\NstpSection;
use App\Models\NstpSectionSchedule;
use App\Models\Room;
use App\Models\SchoolYear;
use App\Models\StudentSubject;
use App\Models\StudentSubjectNstpSchedule;
use App\Models\SubjectSecondarySchedule;
use App\Models\User;
use App\Models\UserInformation;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

class ComponentController extends Controller
{

    public function viewDashboard()
    {
        return Inertia::render('NstpDirector/Dashboard/Index');
    }

    public function getDashboardData(Request $request)
    {
        $schoolYearId = $request->schoolYearId;

        // 1. Component Stats (Optimized)
        $componentStats = DB::table('nstp_components as c')
            ->leftJoin('nstp_sections as s', function ($join) use ($schoolYearId) {
                $join->on('s.nstp_component_id', '=', 'c.id')
                    ->where('s.school_year_id', '=', $schoolYearId);
            })
            ->leftJoin('nstp_section_schedules as ss', 'ss.nstp_section_id', '=', 's.id')
            ->leftJoin('student_subject_nstp_schedule as sns', 'sns.nstp_section_schedule_id', '=', 'ss.id')
            ->groupBy('c.id', 'c.component_name')
            ->select(
                'c.component_name',
                DB::raw('COUNT(sns.id) as total_students'),
                DB::raw('COUNT(DISTINCT s.id) as total_sections')
            )
            ->get();

        // 2. Summary Stats (Combined into one query where possible)
        $facultyQuery = DB::table('nstp_section_schedules as ss')
            ->join('nstp_sections as s', 'ss.nstp_section_id', '=', 's.id')
            ->where('s.school_year_id', $schoolYearId)
            ->selectRaw("
            COUNT(CASE WHEN ss.faculty_id IS NOT NULL THEN 1 END) as assigned,
            COUNT(CASE WHEN ss.faculty_id IS NULL THEN 1 END) as unassigned
        ")
            ->first();

        $totalStudents = $componentStats->sum('total_students');
        $totalSections = $componentStats->sum('total_sections');

        // 3. Section Utilization
        $sectionUtilization = DB::table('nstp_sections as s')
            ->leftJoin('nstp_section_schedules as ss', 'ss.nstp_section_id', '=', 's.id')
            ->leftJoin('student_subject_nstp_schedule as sns', 'sns.nstp_section_schedule_id', '=', 'ss.id')
            ->join('nstp_components as c', 's.nstp_component_id', '=', 'c.id') // Join components here
            ->where('s.school_year_id', $schoolYearId)
            ->groupBy('s.id', 's.section', 's.max_students', 'c.component_name')
            ->select(
                's.section',
                's.max_students',
                'c.component_name', // Select this for filtering
                DB::raw('COUNT(sns.id) as enrolled')
            )
            ->get();

        // 4. Gender (Filtered by School Year)
        $genderStats = DB::table('student_subject_nstp_schedule as sns')
            ->join('nstp_section_schedules as ss', 'sns.nstp_section_schedule_id', '=', 'ss.id')
            ->join('nstp_sections as s', 'ss.nstp_section_id', '=', 's.id')
            ->join('nstp_components as c', 's.nstp_component_id', '=', 'c.id') // JOIN COMPONENTS
            ->join('student_subjects as subj', 'subj.id', '=', 'sns.student_subject_id')
            ->join('enrolled_students as es', 'es.id', '=', 'subj.enrolled_students_id')
            ->join('user_information as ui', 'ui.user_id', '=', 'es.student_id')
            ->where('s.school_year_id', $schoolYearId)
            ->groupBy('c.component_name', 'ui.gender') // GROUP BY BOTH
            ->select('c.component_name', 'ui.gender', DB::raw('COUNT(*) as total'))
            ->get();

        $nstpEnrolledStudents = StudentSubject::join('year_section_subjects', 'student_subjects.year_section_subjects_id', '=', 'year_section_subjects.id')
            ->join('year_section', 'year_section_subjects.year_section_id', '=', 'year_section.id')
            ->join(('subjects'), 'year_section_subjects.subject_id', '=', 'subjects.id')
            ->where('year_section.school_year_id', $schoolYearId)
            ->where('subjects.type', 'nstp')
            ->count();

        return response()->json([
            'summary' => [
                'nstpEnrolledStudents' => $nstpEnrolledStudents,
                'totalStudents' => $totalStudents,
                'totalSections' => $totalSections,
                'assignedFaculty' => $facultyQuery->assigned ?? 0,
                'unassignedFaculty' => $facultyQuery->unassigned ?? 0,
            ],
            'components' => $componentStats,
            'sections' => $sectionUtilization,
            'gender' => $genderStats,
        ]);
    }

    public function viewStudents(Request $request)
    {
        $tab = $request->tab;
        $search = $request->search;

        return Inertia::render('NstpDirector/Students/Index', [
            'tab' => $tab,
            'search' => $search,
        ]);
    }

    public function getStudentsData(Request $request)
    {
        $tab = $request->tab;
        $search = $request->search;
        $schoolYearId = $request->schoolYearId;

        if ($tab == 'enrolled') {
            return $this->getEnrolledStudents($schoolYearId, $search);
        } elseif ($tab == 'not-enrolled') {
            return $this->getNotEnrolledStudents($schoolYearId, $search);
        }

        return $this->getEnrolledStudents($schoolYearId, $search);
    }

    private function getEnrolledStudents($schoolYearId, $search)
    {
        return StudentSubjectNstpSchedule::join('nstp_section_schedules', 'student_subject_nstp_schedule.nstp_section_schedule_id', '=', 'nstp_section_schedules.id')
            ->join('nstp_sections', 'nstp_section_schedules.nstp_section_id', '=', 'nstp_sections.id')
            ->join('nstp_components', 'nstp_components.id', '=', 'nstp_sections.nstp_component_id')
            ->where('nstp_sections.school_year_id', $schoolYearId)
            ->join('student_subjects', 'student_subjects.id', '=', 'student_subject_nstp_schedule.student_subject_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'user_information.user_id', '=', 'users.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->where(function ($query) use ($search) {
                if ($search) {
                    $query->where('users.user_id_no', 'like', "%{$search}%")
                        ->orWhere('user_information.first_name', 'like', "%{$search}%")
                        ->orWhere('user_information.last_name', 'like', "%{$search}%");
                }
            })
            ->select(
                'users.user_id_no',
                'user_information.first_name',
                'user_information.middle_name',
                'user_information.last_name',
                'enrolled_students.id as enrolled_student_id',
                'nstp_sections.section as nstp_section',
                'component_name',
                'student_subject_nstp_schedule.created_at as enrolled_date',
                'course_name_abbreviation as course',
                'year_section.section as course_section',
                'year_level_id',
            )
            ->orderBy('enrolled_date', 'DESC')
            ->distinct()
            ->paginate(10)
            ->withQueryString();
    }

    private function getNotEnrolledStudents($schoolYearId, $search)
    {
        return StudentSubject::join('year_section_subjects', 'student_subjects.year_section_subjects_id', '=', 'year_section_subjects.id')
            ->join('year_section', 'year_section_subjects.year_section_id', '=', 'year_section.id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->join('subjects', 'year_section_subjects.subject_id', '=', 'subjects.id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'user_information.user_id', '=', 'users.id')
            ->leftJoin('student_subject_nstp_schedule', 'student_subject_nstp_schedule.student_subject_id', '=', 'student_subjects.id')
            ->where('year_section.school_year_id', $schoolYearId)
            ->where('subjects.type', 'nstp')
            ->where(function ($query) use ($search) {
                if ($search) {
                    $query->where('users.user_id_no', 'like', "%{$search}%")
                        ->orWhere('user_information.first_name', 'like', "%{$search}%")
                        ->orWhere('user_information.last_name', 'like', "%{$search}%");
                }
            })
            ->whereNull('student_subject_nstp_schedule.id')
            ->select(
                'users.user_id_no',
                'user_information.first_name',
                'user_information.middle_name',
                'user_information.last_name',
                'enrolled_students.id as enrolled_student_id',
                'course_name_abbreviation as course',
                'year_section.section as course_section',
                'year_level_id',
                'contact_number'
            )
            ->orderBy('last_name', 'ASC')
            ->distinct()
            ->paginate(10)
            ->withQueryString();
    }

    public function viewSections($component)
    {
        return Inertia::render('NstpDirector/ComponentSection/Index', [
            'component' => $component
        ]);
    }

    public function getSections($component, Request $request)
    {
        $componentId = NstpComponent::where('component_name', $component)->first()->id;

        $sections = NstpSection::where('nstp_component_id', $componentId)
            ->where('school_year_id', $request->schoolYearId)
            ->with([
                'schedule.instructor.InstructorInfo',
                'schedule.room',
            ])
            ->withCount('students')
            ->get();

        return response()->json($sections);
    }

    public function addSection($schoolYearId, Request $request)
    {
        $componentId = NstpComponent::where('component_name', $request->component)->value('id');

        $lastSection = NstpSection::where('nstp_component_id', $componentId)
            ->where('school_year_id', $schoolYearId)
            ->orderBy('section', 'desc')
            ->value('section');

        $nextSection = $lastSection
            ? chr(ord(strtoupper($lastSection)) + 1)
            : 'A';

        $nstpSection = NstpSection::create([
            'nstp_component_id' => $componentId,
            'school_year_id' => $request->schoolYearId,
            'section' => $nextSection,
            'max_students' => 50,
        ]);

        NstpSectionSchedule::create([
            'nstp_section_id' => $nstpSection->id,
            'day' => 'TBA',
            'start_time' => 'TBA',
            'end_time' => 'TBA',
        ]);
    }

    public function viewSectionStudents($component, $section)
    {
        return Inertia::render('NstpDirector/ComponentSection/StudentList/Index', [
            'component' => $component,
            'section' => $section
        ]);
    }

    public function getSectionSudents($component, $section, Request $request)
    {
        $componentId = NstpComponent::where('component_name', $request->component)->value('id');

        $students = NstpSection::select('student_subject_nstp_schedule.id', 'user_id_no', 'first_name', 'middle_name', 'last_name', 'course_name_abbreviation', 'year_section.section', 'year_level_id')
            ->where('nstp_sections.section', $section)
            ->where('nstp_component_id', $componentId)
            ->where('nstp_sections.school_year_id', $request->schoolYearId)
            ->join('nstp_section_schedules', 'nstp_section_schedules.nstp_section_id', '=', 'nstp_sections.id')
            ->join('student_subject_nstp_schedule', 'nstp_section_schedules.id', '=', 'student_subject_nstp_schedule.nstp_section_schedule_id')
            ->join('student_subjects', 'student_subjects.id', '=', 'student_subject_nstp_schedule.student_subject_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'user_information.user_id', '=', 'users.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->orderBy('last_name', 'asc')
            ->get();

        return response()->json($students);
    }

    public function downloadSectionStudents($component, $section, Request $request)
    {
        $schoolYear = SchoolYear::where('id', '=', $request->schoolYearId)->with('semester')->first();

        // Get component ID
        $componentId = NstpComponent::where('component_name', $component)->value('id');

        // Fetch students
        $students = NstpSection::select(
            'user_id_no',
            'serial_number',
            'last_name',
            'first_name',
            'middle_name',
            'course_name_abbreviation', // Selected Course abbreviation
            'gender',
            'birthday',
            'present_address',
            'contact_number',
            'users.email', // Added email to the select query
            'year_section.section as year_section_name',
            'year_level_id',
            'midterm_grade',
            'final_grade'
        )
            ->where('nstp_sections.section', $section)
            ->where('nstp_component_id', $componentId)
            ->where('nstp_sections.school_year_id', $request->schoolYearId)
            ->join('nstp_section_schedules', 'nstp_section_schedules.nstp_section_id', '=', 'nstp_sections.id')
            ->join('student_subject_nstp_schedule', 'nstp_section_schedules.id', '=', 'student_subject_nstp_schedule.nstp_section_schedule_id')
            ->join('student_subjects', 'student_subjects.id', '=', 'student_subject_nstp_schedule.student_subject_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'user_information.user_id', '=', 'users.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->orderBy('last_name', 'asc')
            ->get();

        // Initialize Spreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set Headers
        $sheet->setCellValue('A1', 'Serial Number');
        $sheet->setCellValue('B1', 'ID Number');
        $sheet->setCellValue('C1', 'Surname');
        $sheet->setCellValue('D1', 'First Name');
        $sheet->setCellValue('E1', 'Middle Name');
        $sheet->setCellValue('F1', 'Gender');
        $sheet->setCellValue('G1', 'Course/Program');
        $sheet->setCellValue('H1', 'Birthdate');
        $sheet->setCellValue('I1', 'Address');
        $sheet->setCellValue('J1', 'TELEPHONE/MOBILE NO.');
        $sheet->setCellValue('K1', 'Email Address');
        $sheet->setCellValue('L1', 'Final Grade');
        $sheet->setCellValue('M1', 'Remarks');

        // Make the header row bold
        $sheet->getStyle('A1:M1')->getFont()->setBold(true);

        // Set Column Widths
        $sheet->getColumnDimension('A')->setWidth(20);
        $sheet->getColumnDimension('B')->setWidth(20);
        $sheet->getColumnDimension('C')->setWidth(20);
        $sheet->getColumnDimension('D')->setWidth(20);
        $sheet->getColumnDimension('E')->setWidth(20);
        $sheet->getColumnDimension('F')->setWidth(20);
        $sheet->getColumnDimension('G')->setWidth(20);
        $sheet->getColumnDimension('H')->setWidth(20);
        $sheet->getColumnDimension('I')->setWidth(50);
        $sheet->getColumnDimension('J')->setWidth(25);
        $sheet->getColumnDimension('K')->setWidth(40);
        $sheet->getColumnDimension('L')->setWidth(15);
        $sheet->getColumnDimension('M')->setWidth(12);

        // Populate Data
        $row = 2;
        foreach ($students as $student) {
            $sheet->setCellValue('A' . $row, $student->serial_number); // Changed from id to serial_number
            $sheet->setCellValue('B' . $row, $student->user_id_no);
            $sheet->setCellValue('C' . $row, $student->last_name);
            $sheet->setCellValue('D' . $row, $student->first_name);
            $sheet->setCellValue('E' . $row, $student->middle_name);
            $sheet->setCellValue('F' . $row, $student->gender);

            // Combined course abbreviation with year and section (e.g. BSIT 3-A)
            $courseText = $student->course_name_abbreviation;
            $sheet->setCellValue('G' . $row, $courseText);

            // Format the birthday to "July 1, 2003"
            $formattedBirthday = $student->birthday
                ? \Carbon\Carbon::parse($student->birthday)->format('F j, Y')
                : ''; // fallback to empty string if birthday is null
            $sheet->setCellValue('H' . $row, $formattedBirthday);

            $sheet->setCellValue('I' . $row, $student->present_address);
            $sheet->setCellValue('J' . $row, $student->contact_number);
            $sheet->setCellValue('K' . $row, $student->email); // Maps to users.email

            $midterm = $student->midterm_grade;
            $final   = $student->final_grade;

            if ($midterm === null || $final === null) {
                // No grade yet → leave cell empty or mark as "N/A"
                $sheet->setCellValue("L{$row}", '');
                $sheet->setCellValue("M{$row}", '');
            } else if ($midterm == 0 || $final == 0) {
                // Force the "0.0" to be stored as Text
                $sheet->setCellValueExplicit("L{$row}", number_format(0, 1), DataType::TYPE_STRING);
                $sheet->setCellValue("M{$row}", 'DROPPED');

                // Make both the Grade (K) and Status (L) red for DROPPED
                $sheet->getStyle("L{$row}:M{$row}")->getFont()->getColor()->setARGB(Color::COLOR_RED);
            } else {
                $average = ($midterm + $final) / 2;

                if ($average >= 3.0 && $average <= 3.09) {
                    $averageFormat = 3.0;
                } elseif ($average >= 3.1) {
                    $averageFormat = 5.0;
                } else {
                    $averageFormat = $average;
                }

                // Force the formatted grade (e.g., "2.0") to be stored strictly as Text
                $sheet->setCellValueExplicit("L{$row}", number_format($averageFormat, 1), DataType::TYPE_STRING);

                // Column L: PASSED / FAILED
                if ($averageFormat >= 3.1) {
                    $sheet->setCellValue("M{$row}", 'FAILED');

                    // Make both the Grade (K) and Status (L) red for FAILED
                    $sheet->getStyle("L{$row}:M{$row}")->getFont()->getColor()->setARGB(Color::COLOR_RED);
                } else {
                    $sheet->setCellValue("M{$row}", 'PASSED');
                }
            }

            $row++;
        }

        // Prepare File for Download
        $filename = $schoolYear->start_year . '-' . $schoolYear->end_year . '_' . $schoolYear->semester->semester_name . '_Semester'  . '_' . strtoupper($component) . "_{$section}_Students.xlsx";
        $tempPath = tempnam(sys_get_temp_dir(), 'students_');

        // Save and Write
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        // Return Download Response and clean up temp file
        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }

    public function downloadStudents($component, Request $request)
    {
        $schoolYear = SchoolYear::where('id', '=', $request->schoolYearId)->with('semester')->first();

        // Get component ID
        $componentId = NstpComponent::where('component_name', $component)->value('id');

        // Fetch students
        $students = NstpSection::select(
            'user_id_no',
            'serial_number',
            'last_name',
            'first_name',
            'middle_name',
            'course_name_abbreviation', // Selected Course abbreviation
            'gender',
            'birthday',
            'present_address',
            'contact_number',
            'users.email', // Added email to the select query
            'year_section.section as year_section_name',
            'year_level_id',
            'midterm_grade',
            'final_grade',
            'gender'
        )
            ->where('nstp_component_id', $componentId)
            ->where('nstp_sections.school_year_id', $request->schoolYearId)
            ->join('nstp_section_schedules', 'nstp_section_schedules.nstp_section_id', '=', 'nstp_sections.id')
            ->join('student_subject_nstp_schedule', 'nstp_section_schedules.id', '=', 'student_subject_nstp_schedule.nstp_section_schedule_id')
            ->join('student_subjects', 'student_subjects.id', '=', 'student_subject_nstp_schedule.student_subject_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'user_information.user_id', '=', 'users.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->orderBy('last_name', 'asc')
            ->get();

        // Initialize Spreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set Headers
        $sheet->setCellValue('A1', 'Serial Number');
        $sheet->setCellValue('B1', 'ID Number');
        $sheet->setCellValue('C1', 'Surname');
        $sheet->setCellValue('D1', 'First Name');
        $sheet->setCellValue('E1', 'Middle Name');
        $sheet->setCellValue('F1', 'Gender');
        $sheet->setCellValue('G1', 'Course/Program');
        $sheet->setCellValue('H1', 'Birthdate');
        $sheet->setCellValue('I1', 'Address');
        $sheet->setCellValue('J1', 'TELEPHONE/MOBILE NO.');
        $sheet->setCellValue('K1', 'Email Address');
        $sheet->setCellValue('L1', 'Final Grade');
        $sheet->setCellValue('M1', 'Remarks');

        // Make the header row bold
        $sheet->getStyle('A1:M1')->getFont()->setBold(true);

        // Set Column Widths
        $sheet->getColumnDimension('A')->setWidth(20);
        $sheet->getColumnDimension('B')->setWidth(20);
        $sheet->getColumnDimension('C')->setWidth(20);
        $sheet->getColumnDimension('D')->setWidth(20);
        $sheet->getColumnDimension('E')->setWidth(20);
        $sheet->getColumnDimension('F')->setWidth(20);
        $sheet->getColumnDimension('G')->setWidth(20);
        $sheet->getColumnDimension('H')->setWidth(20);
        $sheet->getColumnDimension('I')->setWidth(50);
        $sheet->getColumnDimension('J')->setWidth(25);
        $sheet->getColumnDimension('K')->setWidth(40);
        $sheet->getColumnDimension('L')->setWidth(15);
        $sheet->getColumnDimension('M')->setWidth(12);

        // Populate Data
        $row = 2;
        foreach ($students as $student) {
            $sheet->setCellValue('A' . $row, $student->serial_number); // Changed from id to serial_number
            $sheet->setCellValue('B' . $row, $student->user_id_no); // Changed from id to serial_number
            $sheet->setCellValue('C' . $row, $student->last_name);
            $sheet->setCellValue('D' . $row, $student->first_name);
            $sheet->setCellValue('E' . $row, $student->middle_name);
            $sheet->setCellValue('F' . $row, $student->gender);

            // Combined course abbreviation with year and section (e.g. BSIT 3-A)
            $courseText = $student->course_name_abbreviation;
            $sheet->setCellValue('G' . $row, $courseText);

            // Format the birthday to "July 1, 2003"
            $formattedBirthday = $student->birthday
                ? \Carbon\Carbon::parse($student->birthday)->format('F j, Y')
                : ''; // fallback to empty string if birthday is null
            $sheet->setCellValue('H' . $row, $formattedBirthday);

            $sheet->setCellValue('I' . $row, $student->present_address);
            $sheet->setCellValue('J' . $row, $student->contact_number);
            $sheet->setCellValue('K' . $row, $student->email);

            $midterm = $student->midterm_grade;
            $final   = $student->final_grade;

            if ($midterm === null || $final === null) {
                // No grade yet → leave cell empty or mark as "N/A"
                $sheet->setCellValue("L{$row}", '');
                $sheet->setCellValue("M{$row}", '');
            } else if ($midterm == 0 || $final == 0) {
                // Force the "0.0" to be stored as Text
                $sheet->setCellValueExplicit("L{$row}", number_format(0, 1), DataType::TYPE_STRING);
                $sheet->setCellValue("M{$row}", 'DROPPED');

                // Make both the Grade (K) and Status (L) red for DROPPED
                $sheet->getStyle("L{$row}:M{$row}")->getFont()->getColor()->setARGB(Color::COLOR_RED);
            } else {
                $average = ($midterm + $final) / 2;

                if ($average >= 3.0 && $average <= 3.09) {
                    $averageFormat = 3.0;
                } elseif ($average >= 3.1) {
                    $averageFormat = 5.0;
                } else {
                    $averageFormat = $average;
                }

                // Force the formatted grade (e.g., "2.0") to be stored strictly as Text
                $sheet->setCellValueExplicit("L{$row}", number_format($averageFormat, 1), DataType::TYPE_STRING);

                // Column L: PASSED / FAILED
                if ($averageFormat >= 3.1) {
                    $sheet->setCellValue("M{$row}", 'FAILED');

                    // Make both the Grade (K) and Status (L) red for FAILED
                    $sheet->getStyle("L{$row}:M{$row}")->getFont()->getColor()->setARGB(Color::COLOR_RED);
                } else {
                    $sheet->setCellValue("M{$row}", 'PASSED');
                }
            }

            $row++;
        }

        // Prepare File for Download
        $filename = $schoolYear->start_year . '-' . $schoolYear->end_year . '_' . $schoolYear->semester->semester_name . '_Semester' . '_' . strtoupper($component) . "_Students.xlsx";
        $tempPath = tempnam(sys_get_temp_dir(), 'students_');

        // Save and Write
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        // Return Download Response and clean up temp file
        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }

    public function removeSection(Request $request)
    {
        $request->validate([
            'id' => 'required|integer',
        ]);

        // Correct way: find() automatically looks at the 'id' column
        $section = NstpSection::find($request->id);

        if ($section) {
            // Delete related schedules first
            NstpSectionSchedule::where('nstp_section_id', $section->id)->delete();

            // Delete the section
            $section->delete();
        }
    }

    public function removeStudent(Request $request)
    {
        $request->validate([
            'id' => 'required|integer',
        ]);

        StudentSubjectNstpSchedule::where('id', $request->id)->delete();
    }

    public function moveStudent(Request $request)
    {
        $request->validate([
            'studentSubejctNstpSchedId' => 'required|integer',
            'nstpSectionSchedId' => 'required|integer',
        ]);

        StudentSubjectNstpSchedule::where('id', $request->studentSubejctNstpSchedId)->update([
            'nstp_section_schedule_id' => $request->nstpSectionSchedId
        ]);
    }

    public function changeSectionInfo(Request $request)
    {
        NstpSection::findOrFail($request->nstpSectionId)
            ->update([
                'max_students' => $request->maxStudent,
                'section' => $request->section
            ]);
    }

    public function getAllRooms()
    {
        $rooms = Room::all();

        return response()->json($rooms);
    }

    public function getAllInstructors()
    {
        $instructors = User::select('users.id', 'first_name', 'last_name', 'middle_name')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
            ->where('faculty.active', '=', 1)
            ->whereIn('users.user_role', ['faculty', 'program_head', 'registrar', 'evaluator'])
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($instructors);
    }

    public function updateSection(Request $request)
    {
        // Find the record by ID
        $class = NstpSectionSchedule::find($request->id);

        // Check if class exists
        if (!$class) {
            return response()->json(['message' => 'Class not found'], 404);
        }

        // Update the record
        $class->update([
            'day' => $request->day,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'room_id' => $request->room_id,
            'faculty_id' => $request->faculty_id,
        ]);
    }

    public function getRoomSchedules(Request $request)
    {
        // Primary Schedules (Main Schedule)
        $mainSched = YearSectionSubjects::select(
            'year_section_subjects.id',
            'day',
            'descriptive_title',
            'end_time',
            'year_section_subjects.faculty_id',
            'year_section_subjects.id',
            'room_id',
            'start_time',
            'subject_id',
            'year_section_id',
            'first_name',
            'middle_name',
            'last_name',
            'class_code',
            'school_year_id'
        )
            ->where('school_year_id', '=', $request->schoolYearID)
            ->where('room_id', '=', $request->roomID)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->get();

        // Secondary Schedules
        $secondSched = SubjectSecondarySchedule::select(
            'subject_secondary_schedule.id',
            'subject_secondary_schedule.day',
            'subject_secondary_schedule.room_id',
            'subject_secondary_schedule.start_time',
            'subject_secondary_schedule.end_time',
            'subject_secondary_schedule.year_section_subjects_id',
            'year_section.school_year_id',
            'descriptive_title',
            'year_section_subjects.faculty_id',
            'subject_id',
            'year_section_id',
            'first_name',
            'middle_name',
            'last_name',
            'class_code',
        )
            ->where('school_year_id', '=', $request->schoolYearID)
            ->where('subject_secondary_schedule.room_id', '=', $request->roomID)
            ->join('year_section_subjects', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->get();

        $nstpSched = NstpSectionSchedule::select(
            'nstp_section_schedules.id',
            'day',
            'end_time',
            'room_id',
            'start_time',
        )
            ->where('school_year_id', '=', $request->schoolYearID)
            ->where('room_id', '=', $request->roomID)
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.id')
            ->where('nstp_section_schedules.room_id', '=', $request->roomID)
            ->get();

        return response()->json(['main' => $mainSched, 'second' => $secondSched, 'nstp' => $nstpSched]);
    }

    public function getInstructorSchedules(Request $request)
    {
        $instructor = YearSectionSubjects::select(
            'year_section_subjects.id',
            'day',
            'descriptive_title',
            'end_time',
            'year_section_subjects.faculty_id',
            'year_section_subjects.id',
            'room_id',
            'start_time',
            'subject_id',
            'year_section_id',
            'first_name',
            'middle_name',
            'last_name',
            'class_code',
            'school_year_id'
        )
            ->where('school_year_id', '=', $request->schoolYearID)
            ->where('faculty_id', '=', $request->instructorId)
            ->with('SecondarySchedule')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->get();

        $nstpSched = NstpSectionSchedule::select(
            'nstp_section_schedules.id',
            'day',
            'end_time',
            'faculty_id',
            'start_time',
        )
            ->where('faculty_id', $request->instructorId)
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.id')
            ->where('school_year_id', $request->schoolYearID)
            ->get();

        return response()->json(['yearSectionSubjectsSched' => $instructor, 'nstpSched' => $nstpSched], 200);
    }

    public function viewRoomsSchedules()
    {
        return Inertia::render('NstpDirector/Schedules/Room/Index');
    }

    public function getRoomsSchedules(Request $request)
    {
        $rooms = Room::select('rooms.id', 'room_name')
            ->with([
                'Schedules' => function ($query) use ($request) {
                    // Primary schedules query
                    $query->select(
                        'day',
                        'descriptive_title',
                        'end_time',
                        'year_section_subjects.faculty_id',
                        'year_section_subjects.id',
                        'room_id',
                        'start_time',
                        'subject_id',
                        'year_section_id',
                        'first_name',
                        'middle_name',
                        'last_name',
                        'class_code',
                        'school_year_id'
                    )
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftjoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftjoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->where('school_year_id', '=', $request->schoolYearID);

                    // Secondary schedules query
                    $secondarySchedules = DB::table('subject_secondary_schedule')
                        ->select(
                            'subject_secondary_schedule.day',
                            'descriptive_title',
                            'subject_secondary_schedule.end_time',
                            'year_section_subjects.faculty_id',
                            'year_section_subjects.id',
                            'subject_secondary_schedule.room_id', // Correct room_id for secondary schedules
                            'subject_secondary_schedule.start_time',
                            'subject_id',
                            'year_section_id',
                            'first_name',
                            'middle_name',
                            'last_name',
                            'class_code',
                            'school_year_id'
                        )
                        ->join('year_section_subjects', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id') // Corrected join condition
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftjoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftjoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->where('school_year_id', '=', $request->schoolYearID);

                    // Combine primary and secondary schedules using union
                    $query->union($secondarySchedules);
                }
            ])
            ->orderBy('room_name', 'asc')
            ->get();

        $nstpSched = NstpSectionSchedule::select(
            'nstp_sections.id as nstp_section_id',
            'nstp_section_schedules.id',
            'component_name',
            'day',
            'end_time',
            'faculty_id',
            'room_id',
            'start_time',
            'room_name',
            'first_name',
            'middle_name',
            'last_name',
            'school_year_id',
            'section',
            DB::raw('3 as lecture_hours'),
            DB::raw('0 as laboratory_hours'),
            DB::raw('null as secondary_schedule'),
        )
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.nstp_section_id')
            ->join('nstp_components', 'nstp_components.id', '=', 'nstp_sections.nstp_component_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'nstp_section_schedules.room_id')
            ->leftJoin('users', 'users.id', '=', 'nstp_section_schedules.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->where('school_year_id', $request->schoolYearID)
            ->get();

        return response()->json(['yearSectionSubjectsSched' => $rooms, 'nstpSched' => $nstpSched]);
    }

    public function viewFacultiesSchedules()
    {
        return Inertia::render('NstpDirector/Schedules/Faculty/Index');
    }

    public function getFacultiesSchedules(Request $request)
    {
        $yearSectionSched = User::select('users.id', 'faculty_id', 'first_name', 'middle_name', 'last_name', 'faculty.active')
            ->with([
                'Schedules' => function ($query) use ($request) {
                    $query->select(
                        'room_name',
                        'day',
                        'descriptive_title',
                        'end_time',
                        'faculty_id',
                        'year_section_subjects.id',
                        'room_id',
                        'start_time',
                        'subject_id',
                        'year_section_id',
                        'class_code',
                        'school_year_id',
                        'lecture_hours',
                        'laboratory_hours',
                    )
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftjoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->with([
                            'SecondarySchedule' => function ($query) {
                                $query->select(
                                    'rooms.room_name',
                                    'subject_secondary_schedule.id',
                                    'year_section_subjects_id',
                                    'faculty_id',
                                    'room_id',
                                    'day',
                                    'start_time',
                                    'end_time',
                                    'room_name'
                                )
                                    ->leftjoin('rooms', 'rooms.id', '=', 'subject_secondary_schedule.room_id');
                            }
                        ])
                        ->withCount('SubjectEnrolledStudents as student_count')
                        ->where('school_year_id', '=', $request->schoolYearId);
                }
            ])
            ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->where('faculty.active', '=', 1)
            ->orderBy('last_name', 'asc')
            ->get();

        $nstpSched = NstpSectionSchedule::select(
            'nstp_sections.id as nstp_section_id',
            'nstp_section_schedules.id',
            'day',
            'end_time',
            'faculty_id',
            'start_time',
            'room_id',
            'school_year_id',
            'section',
            'room_name',
            'component_name',
            DB::raw('3 as lecture_hours'),
            DB::raw('0 as laboratory_hours'),
            DB::raw('null as secondary_schedule'),
        )
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.nstp_section_id')
            ->join('nstp_components', 'nstp_components.id', '=', 'nstp_sections.nstp_component_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'nstp_section_schedules.room_id')
            ->where('school_year_id', $request->schoolYearId)
            ->withCount([
                'studentSubjects as student_count'
            ])
            ->get();

        return response()->json(['yearSectionSubjectsSched' => $yearSectionSched, 'nstpSched' => $nstpSched]);
    }

    public function getAllComponentSections(Request $request)
    {
        return NstpSection::select(
            'nstp_sections.id',
            'nstp_component_id',
            'school_year_id',
            'section',
            'max_students',
            'component_name'
        )
            ->join('nstp_components', 'nstp_sections.nstp_component_id', '=', 'nstp_components.id')
            ->where('school_year_id', $request->schoolYearId)
            ->with('schedule')
            ->withCount('students')
            ->orderBy('nstp_component_id', 'asc')
            ->orderBy('section', 'asc')
            ->get();
    }

    public function getStudentsWithNstp(Request $request)
    {
        $schoolYearId = $request->schoolYearId;

        $student = User::select('id')
            ->orWhere('user_id_no', 'like', '%' . $request->studentId)
            ->first();

        // if student id not exist
        if (!$student) {
            return response()->json(['message' => 'No student found'], 400);
        }

        $studentInfo = User::where('users.id', $student->id)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->select('users.id', 'user_id_no', 'user_information.first_name', 'user_information.middle_name', 'user_information.last_name')
            ->first();

        $enrolled = EnrolledStudent::where('school_year_id', $schoolYearId)
            ->where('student_id', $student->id)
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->first();

        if (!$enrolled) {
            return response()->json(['message' => $studentInfo->first_name . ' ' . $studentInfo->middle_name . ' ' . $studentInfo->last_name . ' is not enrolled.'], 400);
        }

        $enrolledStudent = EnrolledStudent::select('enrolled_students.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('school_year_id', '=', $request->schoolYearId)
            ->where('student_id', '=', $student->id)
            ->first();

        if (!$enrolledStudent) {
            return response()->json([
                'error' => 'You are not currently enrolled in this school year.',
            ], 403);
        }

        $classes = YearSectionSubjects::where('enrolled_students_id', $enrolledStudent->id)
            ->join('student_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')

            // NSTP joins
            ->leftJoin('student_subject_nstp_schedule as nstp_schedule', 'nstp_schedule.student_subject_id', '=', 'student_subjects.id')
            ->leftJoin('nstp_section_schedules', 'nstp_section_schedules.id', '=', 'nstp_schedule.nstp_section_schedule_id')
            ->leftJoin('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.nstp_section_id')
            ->leftJoin('nstp_components', 'nstp_components.id', '=', 'nstp_sections.nstp_component_id')
            ->leftJoin('rooms as nstp_rooms', 'nstp_rooms.id', '=', 'nstp_section_schedules.room_id')
            ->leftJoin('users as nstp_faculty', 'nstp_faculty.id', '=', 'nstp_section_schedules.faculty_id')
            ->leftJoin('user_information as nstp_faculty_information', 'nstp_faculty.id', '=', 'nstp_faculty_information.user_id')
            ->selectRaw('
                        nstp_schedule.id as nstp_student_schedule_id,
                        enrolled_students_id,
                        student_subjects.id as student_subject_id,
                        year_section_subjects.id,
                        descriptive_title,
                        subjects.type,
                        component_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN nstp_faculty_information.first_name
                            ELSE user_information.first_name
                        END as first_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN nstp_faculty_information.last_name
                            ELSE user_information.last_name
                        END as last_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN nstp_faculty_information.middle_name
                            ELSE user_information.middle_name
                        END as middle_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN COALESCE(nstp_rooms.room_name, rooms.room_name)
                            ELSE rooms.room_name
                        END as room_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN COALESCE(nstp_section_schedules.start_time, year_section_subjects.start_time)
                            ELSE year_section_subjects.start_time
                        END as start_time,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN COALESCE(nstp_section_schedules.end_time, year_section_subjects.end_time)
                            ELSE year_section_subjects.end_time
                        END as end_time,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN COALESCE(nstp_section_schedules.day, year_section_subjects.day)
                            ELSE year_section_subjects.day
                        END as day
                    ')

            ->with(['SecondarySchedule' => function ($query) {
                $query->select(
                    'subject_secondary_schedule.id',
                    'year_section_subjects_id',
                    'faculty_id',
                    'room_id',
                    'day',
                    'start_time',
                    'end_time',
                    'rooms.room_name'
                )->leftJoin('rooms', 'rooms.id', '=', 'subject_secondary_schedule.room_id');
            }])
            ->get();

        $hasNstp = collect($classes)->contains('type', 'nstp');

        if (!$hasNstp) {
            return response()->json(['message' => $studentInfo->first_name . ' ' . $studentInfo->middle_name . ' ' . $studentInfo->last_name . ' has no NSTP subject.'], 400);
        }

        return response()->json([
            'message' => 'success',
            'studentInfo' => $studentInfo,
            'classes' => $classes
        ]);
    }

    public function enrollStudent(Request $request)
    {
        StudentSubjectNstpSchedule::create([
            'nstp_section_schedule_id' => $request->nstpSectionScheduleId,
            'student_subject_id' => $request->studentNstpSubjectId,
        ]);
    }

    public function downloadEnrolledStudent(Request $request)
    {
        $schoolYear = SchoolYear::where('id', '=', $request->schoolYearId)
            ->with('Semester')
            ->first();

        $students = StudentSubjectNstpSchedule::join('nstp_section_schedules', 'student_subject_nstp_schedule.nstp_section_schedule_id', '=', 'nstp_section_schedules.id')
            ->join('nstp_sections', 'nstp_section_schedules.nstp_section_id', '=', 'nstp_sections.id')
            ->join('nstp_components', 'nstp_components.id', '=', 'nstp_sections.nstp_component_id')
            ->where('nstp_sections.school_year_id', $request->schoolYearId)
            ->join('student_subjects', 'student_subjects.id', '=', 'student_subject_nstp_schedule.student_subject_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'user_information.user_id', '=', 'users.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->select(
                'users.user_id_no',
                'user_information.first_name',
                'user_information.middle_name',
                'user_information.last_name',
                'enrolled_students.id as enrolled_student_id',
                'nstp_sections.section as nstp_section',
                'component_name',
                'student_subject_nstp_schedule.created_at as enrolled_date',
                'course_name_abbreviation as course',
                'year_section.section as course_section',
                'year_level_id',
            )
            ->orderBy('last_name', 'ASC')
            ->distinct()
            ->get();

        // 2. Initialize Spreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // 3. Set Headers
        $headers = ['Student ID', 'Name', 'Course', 'NSTP Section', 'Date Enrolled'];
        $sheet->fromArray($headers, NULL, 'A1');

        // Style the header (Optional but recommended)
        $sheet->getStyle('A1:E1')->getFont()->setBold(true);

        $sheet->getColumnDimension('A')->setWidth(25);
        $sheet->getColumnDimension('B')->setWidth(30);
        $sheet->getColumnDimension('C')->setWidth(25);
        $sheet->getColumnDimension('D')->setWidth(20);
        $sheet->getColumnDimension('E')->setWidth(30);

        // 4. Fill Data
        $row = 2;
        foreach ($students as $student) {
            // Format Name: Lastname, Firstname MI.
            $mi = $student->middle_name ? strtoupper(substr($student->middle_name, 0, 1)) . '.' : '';
            $fullName = "{$student->last_name}, {$student->first_name} {$mi}";

            // Format Course: {course}-{year}{section}
            $courseDisplay = "{$student->course}-{$student->year_level_id}{$student->course_section}";

            // Format NSTP: {COMPONENT}-{section}
            $nstpDisplay = strtoupper($student->component_name) . "-{$student->nstp_section}";

            // Date enrolled
            $formattedDate = date('d-m-Y', strtotime($student->enrolled_date));

            $sheet->setCellValue('A' . $row, $student->user_id_no);
            $sheet->setCellValue('B' . $row, $fullName);
            $sheet->setCellValue('C' . $row, $courseDisplay);
            $sheet->setCellValue('D' . $row, $nstpDisplay);
            $sheet->setCellValue('E' . $row, $formattedDate);
            $row++;
        }

        // 5. Stream the response to the browser
        $writer = new Xlsx($spreadsheet);
        $fileName = 'NSTP - Enrolled Students_' . $schoolYear->start_year . '-' . $schoolYear->end_year . '_' . $schoolYear->Semester->semester_name . '_Semester-' . now() . '.xlsx';

        return new StreamedResponse(function () use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function downloadNotEnrolledStudent(Request $request)
    {
        $schoolYear = SchoolYear::where('id', '=', $request->schoolYearId)
            ->with('Semester')
            ->first();

        $students = StudentSubject::join('year_section_subjects', 'student_subjects.year_section_subjects_id', '=', 'year_section_subjects.id')
            ->join('year_section', 'year_section_subjects.year_section_id', '=', 'year_section.id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->join('subjects', 'year_section_subjects.subject_id', '=', 'subjects.id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'user_information.user_id', '=', 'users.id')
            ->leftJoin('student_subject_nstp_schedule', 'student_subject_nstp_schedule.student_subject_id', '=', 'student_subjects.id')
            ->where('year_section.school_year_id', $request->schoolYearId)
            ->where('subjects.type', 'nstp')
            ->whereNull('student_subject_nstp_schedule.id')
            ->select(
                'users.user_id_no',
                'user_information.first_name',
                'user_information.middle_name',
                'user_information.last_name',
                'enrolled_students.id as enrolled_student_id',
                'course_name_abbreviation as course',
                'year_section.section as course_section',
                'year_level_id',
                'contact_number'
            )
            ->orderBy('last_name', 'ASC')
            ->distinct()
            ->get();

        // 2. Initialize Spreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // 3. Set Headers
        $headers = ['Student ID', 'Name', 'Course', 'Contact No.'];
        $sheet->fromArray($headers, NULL, 'A1');

        // Style the header (Optional but recommended)
        $sheet->getStyle('A1:E1')->getFont()->setBold(true);

        $sheet->getColumnDimension('A')->setWidth(25);
        $sheet->getColumnDimension('B')->setWidth(30);
        $sheet->getColumnDimension('C')->setWidth(25);
        $sheet->getColumnDimension('D')->setWidth(20);

        // 4. Fill Data
        $row = 2;
        foreach ($students as $student) {
            // Format Name: Lastname, Firstname MI.
            $mi = $student->middle_name ? strtoupper(substr($student->middle_name, 0, 1)) . '.' : '';
            $fullName = "{$student->last_name}, {$student->first_name} {$mi}";

            // Format Course: {course}-{year}{section}
            $courseDisplay = "{$student->course}-{$student->year_level_id}{$student->course_section}";

            // Format NSTP: {COMPONENT}-{section}
            $nstpDisplay = strtoupper($student->component_name) . "-{$student->nstp_section}";

            // Date enrolled
            $formattedDate = date('d-m-Y', strtotime($student->enrolled_date));

            $sheet->setCellValue('A' . $row, $student->user_id_no);
            $sheet->setCellValue('B' . $row, $fullName);
            $sheet->setCellValue('C' . $row, $courseDisplay);
            $sheet->setCellValue('D' . $row, $student->contact_number);
            $row++;
        }

        // 5. Stream the response to the browser
        $writer = new Xlsx($spreadsheet);
        $fileName = 'NSTP - Not Enrolled Students_' . $schoolYear->start_year . '-' . $schoolYear->end_year . '_' . $schoolYear->Semester->semester_name . '_Semester-' . now() . '.xlsx';

        return new StreamedResponse(function () use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    public function nstpEvaluators()
    {
        return Inertia::render('NstpDirector/Evaluators/Index');
    }

    public function getEvaluators(Request $request)
    {
        $search = $request->search;

        return User::select('users.id', 'user_id_no', 'first_name', 'middle_name', 'last_name', 'email', 'users.active', 'user_role')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->whereIn('users.user_role', ['cwts_evaluator', 'rotc_evaluator', 'lts_evaluator'])
            ->orderByDesc('users.created_at')
            ->where(function ($query) use ($search) {
                if ($search) {
                    $query->where('users.user_id_no', 'like', "%{$search}%")
                        ->orWhere('user_information.first_name', 'like', "%{$search}%")
                        ->orWhere('user_information.last_name', 'like', "%{$search}%");
                }
            })
            ->paginate(10);
    }

    public function createEvaluator(Request $request)
    {
        $validated = $request->validate([
            'user_role' => 'required|string',
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'email' => 'required|email',
        ]);

        //  Check Email
        $emailExists = User::where('email', $validated['email'])->first();

        if ($emailExists) {
            return response()->json(['message' => 'Email already exists.', 'errors' => ['email' => 'Email already exists.']], 400);
        }

        // Generate Password
        $password = $this->generateRandomPassword();

        // Create id number
        $prefix = match ($validated['user_role']) {
            'cwts_evaluator' => 'CWTS',
            'rotc_evaluator' => 'ROTC',
            default => 'LTS',
        };

        // Get the max numeric suffix from user_id_no that starts with this prefix
        $latestNumber = User::where('user_id_no', 'like', $prefix . '%')
            ->selectRaw("MAX(CAST(SUBSTRING(user_id_no, " . (strlen($prefix) + 1) . ") AS UNSIGNED)) as max_number")
            ->value('max_number');

        $newNumber = str_pad(($latestNumber ?? 0) + 1, 3, '0', STR_PAD_LEFT);

        $userIdNo = $prefix . $newNumber;

        $user = User::create([
            'user_id_no' => $userIdNo,
            'user_role' => $validated['user_role'],
            'email' => $validated['email'],
            'password' =>  Hash::make($password),
        ]);

        UserInformation::create([
            'user_id' => $user->id,
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email_address' => $validated['email']
        ]);

        Mail::to($validated['email'])->send(new EvaluatorCredentialsMail($userIdNo, $password, $validated));

        return response()->json([
            'success' => 'Evaluator created successfully!',
            'credentials' => [
                'user_id_no' => $userIdNo,
                'password' => $password,
            ],
        ]);
    }

    public function updateEvaluator(Request $request)
    {
        $evaluatorId = $request->id;

        $validated = $request->validate([
            'user_role' => 'required|string',
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'email' => 'required|email',
        ]);

        // Check Email
        $emailExists = User::where('email', $validated['email'])->whereNot('id', '=', $evaluatorId)->first();

        if ($emailExists) {
            return back()->withErrors(['email' => 'Email already exists.']);
        }

        $user = User::findOrFail($evaluatorId);
        $user->update([
            'user_role' => $validated['user_role'],
            'email' => $validated['email'],
        ]);

        UserInformation::where('user_id', $evaluatorId)->update([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email_address' => $validated['email'],
        ]);
    }

    private function generateRandomPassword()
    {
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $numbers = '0123456789';

        $password = $uppercase[random_int(0, strlen($uppercase) - 1)] .
            $lowercase[random_int(0, strlen($lowercase) - 1)] .
            $numbers[random_int(0, strlen($numbers) - 1)];

        $allCharacters = $uppercase . $lowercase . $numbers;
        for ($i = 3; $i < 8; $i++) {
            $password .= $allCharacters[random_int(0, strlen($allCharacters) - 1)];
        }

        return str_shuffle($password);
    }

    public function toggleActive(Request $request)
    {
        $user = User::where('id', $request->id)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->active = !$user->active;
        $user->save();

        return response()->json(['message' => 'Success']);
    }

    public function serialNumbering()
    {
        return Inertia::render('NstpDirector/SerialNumbering/Index');
    }

    public function serialChange(Request $request)
    {
        if (User::where('serial_number', $request->serialNumber)->where('id', '!=', $request->id)->exists()  && $request->serialNumber != "") {
            return response()->json(['message' => 'Serial number already exists'], 422);
        }

        User::where('id', '=', $request->id)
            ->update([
                'serial_number' => $request->serialNumber,
            ]);

        return response()->json(['message' => 'User ID number updated successfully']);
    }

    public function bulkUpload(Request $request)
    {
        $request->validate([
            'students' => 'required|array',
        ]);

        $students = $request->input('students', []);
        $errors = [];

        // 1. Gather all identifiers for fast batch querying
        $studentIds = collect($students)->pluck('Student ID')->filter()->toArray();
        $serialNumbers = collect($students)->pluck('Serial Number')->filter()->toArray();

        // Gather names for rows that are missing an ID
        $studentsWithoutId = collect($students)->filter(function ($row) {
            return empty($row['Student ID']) && !empty($row['Last Name']) && !empty($row['First Name']);
        });
        $lastNames = $studentsWithoutId->pluck('Last Name')->unique()->toArray();
        $firstNames = $studentsWithoutId->pluck('First Name')->unique()->toArray();

        // 2. Fetch existing records
        $existingUsersById = User::whereIn('user_id_no', $studentIds)->get()->keyBy('user_id_no');
        $existingSerials = User::whereIn('serial_number', $serialNumbers)->get()->keyBy('serial_number');

        // Fetch potential users by Name using the user_information table
        // *Replace 'userInformation' with your exact relationship method name if it differs*
        $existingUsersByName = collect();
        if (!empty($lastNames) && !empty($firstNames)) {
            $existingUsersByName = User::with('userInformation')
                ->whereHas('userInformation', function ($query) use ($lastNames, $firstNames) {
                    $query->whereIn('last_name', $lastNames)
                        ->whereIn('first_name', $firstNames);
                })->get();
        }

        DB::beginTransaction();

        try {
            foreach ($students as $index => $row) {
                $rowNum = $index + 2; // Offset for Excel header row

                $studentId = $row['Student ID'] ?? null;
                $lastName  = $row['Last Name'] ?? null;
                $firstName = $row['First Name'] ?? null;
                $serialNum = $row['Serial Number'] ?? null;

                $user = null;

                // 3. Find the user (by ID, then fallback to Name)
                if ($studentId) {
                    $user = $existingUsersById->get($studentId);
                    if (!$user) {
                        $errors[] = "Row {$rowNum}: Student ID '{$studentId}' not found in the system.";
                        continue;
                    }
                } elseif ($lastName && $firstName) {
                    // Find matching user by name (case-insensitive)
                    $matchedUsers = $existingUsersByName->filter(function ($u) use ($lastName, $firstName) {
                        $info = $u->userInformation;
                        if (!$info) return false;

                        return strtolower(trim($info->last_name)) === strtolower(trim($lastName)) &&
                            strtolower(trim($info->first_name)) === strtolower(trim($firstName));
                    });

                    if ($matchedUsers->isEmpty()) {
                        $errors[] = "Row {$rowNum}: Student '{$firstName} {$lastName}' not found in the system.";
                        continue;
                    }

                    // If multiple students share the exact same name, we can't safely assign it
                    if ($matchedUsers->count() > 1) {
                        $errors[] = "Row {$rowNum}: Multiple students found with the name '{$firstName} {$lastName}'. Please provide a Student ID to be specific.";
                        continue;
                    }

                    $user = $matchedUsers->first();
                } else {
                    $errors[] = "Row {$rowNum}: Must provide either Student ID, or BOTH Last Name and First Name.";
                    continue;
                }

                // 4. Check Serial Number Conflict
                if ($serialNum) {
                    $conflictUser = $existingSerials->get($serialNum);
                    if ($conflictUser && $conflictUser->id !== $user->id) {
                        // Safely get the names through the relationship
                        $conflictFirstName = $conflictUser->userInformation?->first_name ?? 'Unknown';
                        $conflictLastName  = $conflictUser->userInformation?->last_name ?? 'Unknown';

                        $errors[] = "Row {$rowNum}: Serial Number '{$serialNum}' is already assigned to {$conflictFirstName} {$conflictLastName} (ID: {$conflictUser->user_id_no}).";
                        continue;
                    }
                }       

                // 5. Stage user update
                $user->serial_number = $serialNum;
                $user->save();
            }

            // 6. Abort transaction if ANY errors exist
            if (count($errors) > 0) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Upload failed due to validation errors.',
                    'errors' => collect($errors)->take(30)
                ], 422);
            }

            // 7. Success
            DB::commit();
            return response()->json(['message' => 'Successfully uploaded serial numbers.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Server error occurred.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
