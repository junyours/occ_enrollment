<?php

namespace Database\Seeders;

use Illuminate\Database\Connection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Synthetic academic fixtures for screenshots in the isolated manual-demo database.
 * Run after ManualDemoUsersSeeder; deliberately excluded from DatabaseSeeder.
 * All mutable rows belong to DEMO natural keys or to their foreign-key descendants.
 */
class ManualDemoAcademicSeeder extends Seeder
{
    private const STAMP = '2026-01-01 09:00:00';
    private const START_YEAR = 2099;
    private const END_YEAR = 2100;

    private Connection $db;

    public function run(): void
    {
        // This shared guard checks opt-in, local environment, exact database,
        // loopback host, port 13307, and absence of a DB URL before a connection.
        [$connectionName] = ManualDemoUsersSeeder::assertSafeEnvironment();
        $this->db = DB::connection($connectionName);

        $this->db->transaction(function (): void {
            $department = $this->requireId('department', ['department_name_abbreviation' => 'DEMO']);
            $course = $this->requireId('course', [
                'course_name_abbreviation' => 'DEMO-MANUAL',
                'department_id' => $department,
            ]);
            $student = $this->demoUser('student');
            $evaluator = $this->demoUser('evaluator');
            $semester = $this->requireId('semesters', ['semester_name' => 'First']);
            $yearLevel = $this->requireId('year_level', ['year_level' => '1']);
            $studentType = $this->requireId('student_type', ['student_type_name' => 'Freshman']);

            // Never reset somebody else's current school year.
            if ($this->db->table('school_years')->where('is_current', true)
                ->where(function ($query) use ($semester): void {
                    $query->where('start_year', '<>', self::START_YEAR)
                        ->orWhere('end_year', '<>', self::END_YEAR)
                        ->orWhere('semester_id', '<>', $semester);
                })->exists()) {
                throw new RuntimeException('A non-demo school year is current; academic fixtures were not changed.');
            }

            $today = Carbon::today(config('app.timezone'));
            $schoolYear = $this->put('school_years', [
                'semester_id' => $semester,
                'start_year' => self::START_YEAR,
                'end_year' => self::END_YEAR,
            ], [
                'start_date' => $today->copy()->subDays(30)->toDateString(),
                'end_date' => $today->copy()->addDays(120)->toDateString(),
                'is_current' => true,
                'allow_enrollment' => true,
                'allowed_enrollment_roles' => json_encode(['registrar', 'program_head', 'evaluator'], JSON_THROW_ON_ERROR),
                'evaluating' => true,
                'allow_upload_midterm' => true,
                'allow_upload_final' => true,
            ]);
            $curriculum = $this->put('curriculum', [
                'course_id' => $course,
                'school_year_start' => (string) self::START_YEAR,
                'school_year_end' => (string) self::END_YEAR,
            ]);
            $term = $this->put('curriculum_term', [
                'curriculum_id' => $curriculum,
                'year_level_id' => $yearLevel,
                'semester_id' => $semester,
            ], ['active' => true]);
            $section = $this->put('year_section', [
                'school_year_id' => $schoolYear,
                'course_id' => $course,
                'year_level_id' => $yearLevel,
                'section' => 'A',
            ], ['max_students' => 40]);
            $room = $this->put('rooms', ['room_name' => 'DEMO Classroom 101'], ['department_id' => $department]);
            $laboratory = $this->put('rooms', ['room_name' => 'DEMO Computer Laboratory'], ['department_id' => $department]);

            $this->studentProfile($student);
            $enrollment = $this->put('enrolled_students', [
                'student_id' => $student,
                'year_section_id' => $section,
            ], [
                'student_type_id' => $studentType,
                'evaluator_id' => $evaluator,
                'registration_number' => 'DEMO-REG-0001',
                'enroll_type' => 'on-time',
                'date_enrolled' => $today->copy()->subDays(20)->toDateString(),
                'evaluated' => false,
            ]);

            $definitions = [
                ['DEMO101', 'DEMO Introduction to Computing', 'faculty', 'Monday', '08:00', '09:30', 'deployed', 'submitted'],
                ['DEMO102', 'DEMO Academic Communication', 'evaluator', 'Tuesday', '08:00', '09:30', 'verified', 'draft'],
                ['DEMO103', 'DEMO Quantitative Reasoning', 'program_head', 'Wednesday', '08:00', '09:30', 'submitted', 'draft'],
                ['DEMO104', 'DEMO Community and Ethics', 'faculty', 'Thursday', '08:00', '09:30', 'rejected', 'draft'],
                ['DEMO105', 'DEMO Information Literacy', 'registrar', 'Friday', '08:00', '09:30', 'draft', 'draft'],
            ];
            $studentSubjects = [];
            foreach ($definitions as $index => [$code, $title, $role, $day, $start, $end, $midtermStatus, $finalStatus]) {
                $teacher = $this->demoUser($role);
                $subject = $this->put('subjects', ['subject_code' => $code], [
                    'descriptive_title' => $title,
                    'credit_units' => 3,
                    'lecture_hours' => 3,
                    'laboratory_hours' => $index === 0 ? 1 : 0,
                    'type' => in_array($index, [1, 3], true) ? 'gened' : null,
                ]);
                $this->put('curriculum_term_subjects', ['curriculum_term_id' => $term, 'subject_id' => $subject], ['pre_requisite_name' => null]);
                $class = $this->put('year_section_subjects', ['class_code' => 'DEMO-CLASS-'.($index + 1)], [
                    'year_section_id' => $section,
                    'faculty_id' => $teacher,
                    'room_id' => $room,
                    'subject_id' => $subject,
                    'day' => $day,
                    'start_time' => $start,
                    'end_time' => $end,
                ]);
                $studentSubject = $this->put('student_subjects', [
                    'enrolled_students_id' => $enrollment,
                    'year_section_subjects_id' => $class,
                ], [
                    'dropped' => false,
                    'midterm_grade' => $this->gradeEquivalent(91 - $index * 2),
                    'final_grade' => $index === 0 ? $this->gradeEquivalent(93) : null,
                    'remarks' => null,
                ]);
                $studentSubjects[] = $studentSubject;
                $this->regularSubmission($class, $midtermStatus, $finalStatus);
                $this->gradeBook($class, $studentSubject, 'midterm', 91 - $index * 2);
                if ($index === 0) {
                    $this->gradeBook($class, $studentSubject, 'final', 93);
                    $this->put('subject_secondary_schedule', ['year_section_subjects_id' => $class], [
                        'faculty_id' => $teacher,
                        'room_id' => $laboratory,
                        'day' => 'Wednesday',
                        'start_time' => '10:00',
                        'end_time' => '11:00',
                    ]);
                }
                $this->attendance($class, $studentSubject, $teacher, $index);
            }

            $this->nstp($schoolYear, $section, $term, $enrollment, $room);
            $this->evaluation($schoolYear, $student, $studentSubjects[0], $today);
        });

        $this->command?->info('Synthetic DEMO academics ready: 5 regular classes, 1 NSTP class, enrollment, grades, attendance, and evaluation.');
    }

    private function studentProfile(int $student): void
    {
        $this->put('student', ['student_id' => $student], ['application_no' => 'DEMO-APP-0001']);
        // Keep the UsersSeeder's synthetic names; complete only non-name fields.
        $this->put('user_information', ['user_id' => $student], [
            'civil_status' => 'Single',
            'gender' => 'Female',
            'birthday' => '2005-01-01',
            'nationality' => 'Filipino',
            'religion' => 'Demo / unspecified',
            'contact_number' => '00000000000',
            'email_address' => 'demo-student@example.invalid',
            'present_address' => 'DEMO Street, DEMO Barangay, DEMO City',
            'zip_code' => '0000',
            'place_of_birth' => 'DEMO City',
        ]);
        $this->put('user_parents', ['user_id' => $student], [
            'father_first_name' => 'DEMO Father',
            'father_last_name' => 'Synthetic',
            'father_middle_name' => null,
            'father_suffix' => null,
            'father_contact_number' => '00000000000',
            'mother_first_name' => 'DEMO Mother',
            'mother_maiden_last_name' => 'Synthetic',
            'mother_middle_name' => null,
            'mother_suffix' => null,
            'mother_contact_number' => '00000000000',
        ]);
        $this->put('user_present_address', ['user_id' => $student], [
            'street' => 'DEMO Street',
            'barangay' => 'DEMO Barangay', 'barangay_code' => 'DEMO-BARANGAY',
            'city' => 'DEMO City', 'city_code' => 'DEMO-CITY',
            'province' => 'DEMO Province', 'province_code' => 'DEMO-PROVINCE',
            'region' => 'DEMO Region', 'region_code' => 'DEMO-REGION',
            'zip_code' => '0000',
        ]);
        $this->put('preliminary_educations', ['user_id' => $student], [
            'elementary_name' => 'DEMO Elementary School',
            'elementary_address' => 'DEMO City',
            'elementary_year' => '2017',
            'secondary_name' => 'DEMO Secondary School',
            'secondary_address' => 'DEMO City',
            'secondary_year' => '2023',
        ]);
    }

    private function regularSubmission(int $class, string $midterm, string $final): void
    {
        $this->put('grade_submissions', ['year_section_subjects_id' => $class], array_merge(
            [
                'is_submitted' => $midterm !== 'draft',
                'submitted_at' => $midterm !== 'draft' ? self::STAMP : null,
                'is_verified' => in_array($midterm, ['verified', 'deployed'], true),
                'verified_at' => in_array($midterm, ['verified', 'deployed'], true) ? self::STAMP : null,
                'is_rejected' => $midterm === 'rejected',
                'rejection_message' => $midterm === 'rejected' ? 'DEMO: review the synthetic grade entries.' : null,
                'is_deployed' => $midterm === 'deployed',
                'deployed_at' => $midterm === 'deployed' ? self::STAMP : null,
            ],
            $this->periodStatus('midterm', $midterm),
            $this->periodStatus('final', $final)
        ));
    }

    private function periodStatus(string $period, string $status): array
    {
        return [
            $period.'_status' => $status,
            $period.'_submitted_at' => $status !== 'draft' ? self::STAMP : null,
            $period.'_verified_at' => in_array($status, ['verified', 'deployed'], true) ? self::STAMP : null,
            $period.'_rejection_message' => $status === 'rejected' ? 'DEMO: review the synthetic grade entries.' : null,
            $period.'_deployed_at' => $status === 'deployed' ? self::STAMP : null,
        ];
    }

    private function gradeBook(int $class, int $studentSubject, string $period, int $percentage): void
    {
        foreach (['DEMO Exercises', 'DEMO Projects'] as $position => $name) {
            $category = $this->put('grading_categories', [
                'year_section_subject_id' => $class, 'period' => $period, 'name' => $name,
            ], ['weight' => 50, 'sort_order' => $position, 'deleted_at' => null]);
            $assessment = $this->put('assessments', [
                'grading_category_id' => $category, 'name' => $name.' 1',
            ], ['max_score' => 100, 'sort_order' => 0, 'deleted_at' => null]);
            $this->put('assessment_scores', ['assessment_id' => $assessment, 'student_subject_id' => $studentSubject], [
                'score' => $percentage, 'deleted_at' => null,
            ]);
        }
        $exam = $this->put('exams', ['year_section_subject_id' => $class, 'period' => $period], [
            'name' => 'DEMO '.ucfirst($period).' Examination', 'max_score' => 100, 'deleted_at' => null,
        ]);
        $this->put('exam_scores', ['exam_id' => $exam, 'student_subject_id' => $studentSubject], [
            'score' => $percentage, 'deleted_at' => null,
        ]);
    }

    private function gradeEquivalent(int $percentage): float
    {
        return $percentage >= 95 ? 1.0 : ($percentage < 75 ? 5.0 : (105 - $percentage) / 10);
    }

    private function attendance(int $class, int $studentSubject, int $teacher, int $index): void
    {
        // Fixed synthetic Mondays through Fridays keep reruns idempotent even
        // when the seeder is run on another day; no meetings accumulate.
        $lastMeeting = Carbon::parse('2026-11-02', config('app.timezone'))->addDays($index);
        foreach (['present', 'late', 'absent'] as $meeting => $status) {
            $date = $lastMeeting->copy()->subDays(14 - $meeting * 7)->toDateString();
            $session = $this->put('attendance_sessions', [
                'year_section_subject_id' => $class, 'attendance_date' => $date, 'session_number' => 1,
            ], [
                'period' => 'midterm', 'status' => 'open', 'created_by' => $teacher,
                'lock_version' => 0, 'roster_initialized_at' => self::STAMP,
                'locked_at' => null, 'locked_by' => null,
            ]);
            // One exception demonstrates excused attendance without inventing students.
            $mark = $index === 1 && $meeting === 2 ? 'excused' : $status;
            $this->put('attendance_records', ['attendance_session_id' => $session, 'student_subject_id' => $studentSubject], [
                'status' => $mark, 'remarks' => 'DEMO synthetic attendance',
                'marked_by' => $teacher, 'marked_at' => $date.' 09:00:00',
                'time_in' => $mark === 'present' ? '08:00:00' : ($mark === 'late' ? '08:15:00' : null),
            ]);
        }
    }

    private function nstp(int $schoolYear, int $section, int $term, int $enrollment, int $room): void
    {
        $teacher = $this->demoUser('nstp_faculty');
        $subject = $this->put('subjects', ['subject_code' => 'DEMO-NSTP1'], [
            'descriptive_title' => 'DEMO National Service Training Program 1',
            'credit_units' => 3, 'lecture_hours' => 3, 'laboratory_hours' => 0, 'type' => 'nstp',
        ]);
        $this->put('curriculum_term_subjects', ['curriculum_term_id' => $term, 'subject_id' => $subject], ['pre_requisite_name' => null]);
        $class = $this->put('year_section_subjects', ['class_code' => 'DEMO-CLASS-NSTP1'], [
            'year_section_id' => $section, 'subject_id' => $subject,
            'faculty_id' => null, 'room_id' => null, 'day' => 'TBA', 'start_time' => 'TBA', 'end_time' => 'TBA',
        ]);
        $studentSubject = $this->put('student_subjects', [
            'enrolled_students_id' => $enrollment, 'year_section_subjects_id' => $class,
        ], ['dropped' => false, 'midterm_grade' => 1.5, 'final_grade' => null, 'remarks' => null]);

        // Components are immutable migration lookups; only DEMO sections are changed.
        foreach (['cwts', 'rotc', 'lts'] as $componentName) {
            $component = $this->requireId('nstp_components', ['component_name' => $componentName]);
            $nstpSection = $this->put('nstp_sections', [
                'nstp_component_id' => $component, 'school_year_id' => $schoolYear, 'section' => 'DEMO-A',
            ], ['max_students' => 40]);
            $schedule = $this->put('nstp_section_schedules', ['nstp_section_id' => $nstpSection], [
                'faculty_id' => $componentName === 'cwts' ? $teacher : null,
                'room_id' => $room, 'day' => 'Saturday',
                'start_time' => $componentName === 'cwts' ? '08:00' : '13:00',
                'end_time' => $componentName === 'cwts' ? '11:00' : '16:00',
            ]);
            $this->put('nstp_grade_submissions', ['nstp_section_id' => $nstpSection], array_merge(
                $this->periodStatus('midterm', $componentName === 'cwts' ? 'submitted' : 'draft'),
                $this->periodStatus('final', 'draft')
            ));
            if ($componentName === 'cwts') {
                $this->put('student_subject_nstp_schedule', ['student_subject_id' => $studentSubject], ['nstp_section_schedule_id' => $schedule]);
            }
        }
    }

    private function evaluation(int $schoolYear, int $student, int $studentSubject, Carbon $today): void
    {
        $evaluation = $this->put('evaluation', ['school_year_id' => $schoolYear], [
            'start_date' => $today->copy()->subDays(7)->toDateString(),
            'end_date' => $today->copy()->addDays(30)->toDateString(),
            'status' => 'active', 'deleted_at' => null,
        ]);
        $criteria = $this->put('criterias', ['title' => 'DEMO Teaching and Learning'], [
            'recommendation' => 'DEMO synthetic criterion for manual testing.',
            'suggestion' => 'DEMO synthetic suggestion.', 'position' => 1, 'deleted_at' => null,
        ]);
        foreach (['DEMO: The instructor explains the lesson clearly.', 'DEMO: Learning activities support the lesson.'] as $position => $text) {
            $question = $this->put('questions', ['criteria_id' => $criteria, 'text' => $text], ['position' => $position + 1, 'deleted_at' => null]);
            $snapshot = $this->put('evaluation_questions', ['evaluation_session_id' => $evaluation, 'question_id' => $question], [
                'criteria_id' => $criteria, 'question_text' => $text, 'question_position' => $position + 1,
                'criteria_title' => 'DEMO Teaching and Learning', 'criteria_position' => 1,
            ]);
            $this->put('student_answers', [
                'evaluation_question_id' => $snapshot, 'student_id' => $student, 'student_subject_id' => $studentSubject,
            ], ['rating' => $position === 0 ? 5 : 4, 'anonymous' => true]);
        }
        $this->put('evaluation_feedback', [
            'evaluation_session_id' => $evaluation, 'student_subject_id' => $studentSubject, 'student_id' => $student,
        ], [
            'strengths' => 'DEMO synthetic feedback: clear examples and organized lessons.',
            'weaknesses' => 'DEMO synthetic feedback: allow more time for practice.',
            'sentiment' => 'positive', 'sentiment_score' => 1, 'anonymous' => true,
        ]);
    }

    private function demoUser(string $role): int
    {
        return $this->requireId('users', ['user_id_no' => ManualDemoUsersSeeder::loginId($role), 'user_role' => $role]);
    }

    private function requireId(string $table, array $key): int
    {
        $id = $this->db->table($table)->where($key)->value('id');
        if ($id === null) {
            throw new RuntimeException('Missing manual-demo prerequisite in '.$table.'. Run migrations and ManualDemoUsersSeeder first.');
        }

        return (int) $id;
    }

    private function put(string $table, array $key, array $values = []): int
    {
        $query = $this->db->table($table)->where($key);
        $existing = $query->first(['id']);
        if ($existing !== null) {
            $query->update(array_merge($values, ['updated_at' => self::STAMP]));

            return (int) $existing->id;
        }

        return (int) $this->db->table($table)->insertGetId(array_merge($key, $values, [
            'created_at' => self::STAMP, 'updated_at' => self::STAMP,
        ]));
    }
}
