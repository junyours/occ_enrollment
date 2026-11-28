<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Enrollment fixture on top of the curriculum fixture (BSIT curricula 1 = 2024-2025 and
 * 2 = 2018-2019), for the enrollment check and the curriculum view on Student Grades.
 *
 * IT201 needs IT102 and 2nd year standing; IT103 needs IT101. The student took IT101 (1.5)
 * and MATH101 (5.0) in 1st sem 2024-2025, then IT102 (2.0) and IT103 (no grade yet) in
 * 2nd sem, and is now being enrolled in 2nd year, 1st sem 2025-2026 (school year 12).
 */
abstract class EnrollmentTestCase extends CurriculumTestCase
{
    protected User $student;

    /** @var array<string, int> section name => year_section.id */
    protected array $sections = [];

    private int $nextClassId = 1000;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('year_section_subjects');
        Schema::create('year_section_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('year_section_id');
            $table->unsignedBigInteger('faculty_id')->nullable();
            $table->unsignedBigInteger('room_id')->nullable();
            $table->unsignedBigInteger('subject_id');
            $table->string('class_code')->nullable();
            $table->string('day')->default('TBA');
            $table->string('start_time')->default('TBA');
            $table->string('end_time')->default('TBA');
            $table->timestamps();
        });
        Schema::create('school_years', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('semester_id');
            $table->integer('start_year');
            $table->integer('end_year');
            $table->date('start_date')->nullable();
            $table->timestamps();
        });
        Schema::create('year_section', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('school_year_id');
            $table->unsignedBigInteger('course_id');
            $table->unsignedBigInteger('year_level_id');
            $table->string('section')->default('A');
            $table->integer('max_students')->default(50);
            $table->timestamps();
        });
        Schema::create('enrolled_students', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('year_section_id');
            $table->unsignedBigInteger('student_type_id')->nullable();
            $table->unsignedBigInteger('evaluator_id')->nullable();
            $table->string('registration_number')->nullable();
            $table->string('enroll_type')->nullable();
            $table->dateTime('date_enrolled')->nullable();
            $table->boolean('evaluated')->default(false);
            $table->timestamps();
        });
        Schema::create('student_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('enrolled_students_id');
            $table->unsignedBigInteger('year_section_subjects_id');
            $table->boolean('dropped')->default(false);
            $table->double('midterm_grade')->nullable();
            $table->double('final_grade')->nullable();
            $table->string('final_rating')->nullable();
            $table->string('remarks')->nullable();
            $table->timestamps();
        });
        Schema::create('student_grades', function (Blueprint $table) {
            $table->id();
            $table->string('school_year')->nullable();
            $table->string('semester')->nullable();
            $table->string('id_no');
            $table->string('subject_code')->nullable();
            $table->string('subject')->nullable();
            $table->integer('units')->nullable();
            $table->string('grade')->nullable();
        });
        Schema::create('fes_student_grades', function (Blueprint $table) {
            $table->id();
            $table->string('id_no');
            $table->string('subject_code')->nullable();
            $table->string('subject')->nullable();
            $table->string('school_year')->nullable();
            $table->string('semester')->nullable();
            $table->double('midterm')->nullable();
            $table->double('final')->nullable();
            $table->double('finalGrade')->nullable();
        });
        Schema::create('academic_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->string('record_type');
            $table->string('school_name')->nullable();
            $table->string('school_year')->nullable();
            $table->string('semester')->nullable();
            $table->timestamps();
        });
        Schema::create('academic_record_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('academic_record_id');
            $table->string('subject_code')->nullable();
            $table->string('descriptive_title')->nullable();
            $table->string('grade')->nullable();
            $table->string('re_exam')->nullable();
            $table->integer('units')->nullable();
            $table->timestamps();
        });
        Schema::create('user_information', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->timestamps();
        });
        (require database_path('migrations/2026_11_28_170000_create_student_curricula.php'))->up();
        (require database_path('migrations/2026_11_28_190000_create_student_grade_matches.php'))->up();

        // IT201 needs IT102 and 2nd year standing; IT103 needs IT101 (curriculum 1).
        $this->needs('IT201', 'IT102');
        $this->needs('IT103', 'IT101');
        DB::table('curriculum_term_subjects')->where('id', $this->entries['IT201'])->update(['required_year_level_id' => 2]);
        // Curriculum 1 is the one new BSIT classes are made from.
        DB::table('curriculum_term')->where('curriculum_id', 1)->update(['active' => true]);

        foreach ([10 => [1, 2024], 11 => [2, 2024], 12 => [1, 2025]] as $id => [$semester, $start]) {
            DB::table('school_years')->insert(['id' => $id, 'semester_id' => $semester, 'start_year' => $start, 'end_year' => $start + 1]);
        }
        $this->sections = [
            'Y1-first' => DB::table('year_section')->insertGetId(['school_year_id' => 10, 'course_id' => 1, 'year_level_id' => 1]),
            'Y1-second' => DB::table('year_section')->insertGetId(['school_year_id' => 11, 'course_id' => 1, 'year_level_id' => 1]),
            'Y2-now' => DB::table('year_section')->insertGetId(['school_year_id' => 12, 'course_id' => 1, 'year_level_id' => 2]),
            'Y1-now' => DB::table('year_section')->insertGetId(['school_year_id' => 12, 'course_id' => 1, 'year_level_id' => 1]),
        ];

        $this->student = $this->makeUser('student', '2024-1-0001');
        $this->enroll('Y1-first', ['IT101' => [1.4, 1.6], 'MATH101' => [5.0, 5.0]]);
        $this->enroll('Y1-second', ['IT102' => [2.0, 2.0], 'IT103' => [null, null]]);
    }

    protected function subjectId(string $code): int
    {
        return (int) DB::table('curriculum_term_subjects')->where('id', $this->entries[$code])->value('subject_id');
    }

    protected function needs(string $code, string $required): void
    {
        DB::table('pre_requisite_subjects')->insert(['curriculum_term_subjects_id' => $this->entries[$code], 'required_term_subject_id' => $this->entries[$required]]);
    }

    protected function makeClass(string $section, int $subjectId): int
    {
        $id = $this->nextClassId++;
        DB::table('year_section_subjects')->insert(['id' => $id, 'year_section_id' => $this->sections[$section], 'subject_id' => $subjectId]);

        return $id;
    }

    /** @param array<string, array{0: ?float, 1: ?float}> $grades code => [midterm, final] */
    protected function enroll(string $section, array $grades, ?User $student = null): int
    {
        $enrollment = DB::table('enrolled_students')->insertGetId(['student_id' => ($student ?? $this->student)->id, 'year_section_id' => $this->sections[$section]]);
        foreach ($grades as $code => [$midterm, $final]) {
            DB::table('student_subjects')->insert([
                'enrolled_students_id' => $enrollment,
                'year_section_subjects_id' => $this->makeClass($section, $this->subjectId($code)),
                'midterm_grade' => $midterm,
                'final_grade' => $final,
            ]);
        }

        return $enrollment;
    }

    protected function addSubject(string $code, string $title): int
    {
        return DB::table('subjects')->insertGetId(['subject_code' => $code, 'descriptive_title' => $title]);
    }
}
