<?php

namespace Tests\Feature;

use App\Http\Middleware\DatabaseBasedMaintenance;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogAuthenticatedUserActivity;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AcademicDeanGradeSubmissionsTest extends TestCase
{
    private User $dean;

    protected function setUp(): void
    {
        parent::setUp();

        // Use a fresh, minimal database; never migrate or connect to the school's database.
        config([
            'app.key' => str_repeat('a', 32),
            'database.default' => 'sqlite',
            'database.connections.sqlite' => [
                'driver' => 'sqlite', 'url' => null, 'database' => ':memory:',
                'prefix' => '', 'foreign_key_constraints' => true,
            ],
            'session.driver' => 'array',
            'cache.default' => 'array',
            'mail.default' => 'array',
            'hashing.bcrypt.rounds' => 4,
        ]);
        DB::purge('sqlite');
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
        $this->withoutMiddleware([
            DatabaseBasedMaintenance::class,
            EnsurePasswordChanged::class,
            HandleInertiaRequests::class,
            LogAuthenticatedUserActivity::class,
        ]);
        $this->withoutVite();
        $this->createSchema();
        DB::table('semesters')->insert(['id' => 1, 'semester_name' => 'First Semester']);
        DB::table('school_years')->insert([
            ['id' => 1, 'semester_id' => 1, 'start_year' => 2026, 'end_year' => 2027, 'is_current' => 1],
            ['id' => 2, 'semester_id' => 1, 'start_year' => 2025, 'end_year' => 2026, 'is_current' => 0],
        ]);
        DB::table('nstp_components')->insert(['id' => 1, 'component_name' => 'cwts']);
        $this->dean = $this->user('academic_dean', 'DEAN-001', 'Academic', 'Dean');
    }

    private function createSchema(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('user_id_no')->unique();
            $table->string('user_role');
            $table->string('email')->nullable();
            $table->string('password');
            $table->boolean('password_change')->default(true);
            $table->boolean('active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('user_information', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
        });
        Schema::create('semesters', function (Blueprint $table) {
            $table->id();
            $table->string('semester_name');
        });
        Schema::create('school_years', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('semester_id');
            $table->integer('start_year');
            $table->integer('end_year');
            $table->boolean('is_current')->default(false);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();
        });
        Schema::create('year_section', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('school_year_id');
            $table->string('section')->default('A');
        });
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('type')->nullable();
            $table->string('subject_code')->default('TEST101');
            $table->string('descriptive_title')->default('Test Subject');
        });
        Schema::create('year_section_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('year_section_id');
            $table->unsignedBigInteger('subject_id');
            $table->unsignedBigInteger('faculty_id')->nullable();
            $table->string('class_code')->default('CLASS-A');
        });
        Schema::create('subject_secondary_schedule', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('year_section_subjects_id');
            $table->unsignedBigInteger('faculty_id')->nullable();
        });
        Schema::create('grade_submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('year_section_subjects_id');
            $table->string('midterm_status')->default('draft');
            $table->string('final_status')->default('draft');
        });
        Schema::create('nstp_components', function (Blueprint $table) {
            $table->id();
            $table->string('component_name');
        });
        Schema::create('nstp_sections', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('school_year_id');
            $table->unsignedBigInteger('nstp_component_id')->default(1);
            $table->string('section')->default('CWTS-A');
        });
        Schema::create('nstp_section_schedules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('nstp_section_id')->unique();
            $table->unsignedBigInteger('faculty_id')->nullable();
        });
        Schema::create('nstp_grade_submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('nstp_section_id')->unique();
            $table->string('midterm_status')->default('draft');
            $table->string('final_status')->default('draft');
        });
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action');
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->text('description')->nullable();
            $table->json('properties')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });
    }

    private function user(string $role, string $number, string $first = 'Test', string $last = 'Teacher'): User
    {
        $user = User::create([
            'user_id_no' => $number, 'user_role' => $role,
            'password' => 'unused-test-password', 'password_change' => true,
        ]);
        DB::table('user_information')->insert([
            'user_id' => $user->id, 'first_name' => $first,
            'middle_name' => null, 'last_name' => $last,
        ]);

        return $user;
    }

    private function regular(User $teacher, int $year = 1, ?string $type = 'major'): int
    {
        $sectionId = DB::table('year_section')->insertGetId(['school_year_id' => $year]);
        $subjectId = DB::table('subjects')->insertGetId(['type' => $type]);

        return DB::table('year_section_subjects')->insertGetId([
            'year_section_id' => $sectionId, 'subject_id' => $subjectId,
            'faculty_id' => $teacher->id,
        ]);
    }

    private function nstp(User $teacher, int $sectionId, int $scheduleId, int $year = 1): void
    {
        DB::table('nstp_sections')->insert(['id' => $sectionId, 'school_year_id' => $year]);
        DB::table('nstp_section_schedules')->insert([
            'id' => $scheduleId, 'nstp_section_id' => $sectionId, 'faculty_id' => $teacher->id,
        ]);
    }

    private function url(array $query = []): string
    {
        return '/academic-dean/grade-submissions/data?'.http_build_query([
            'school_year_id' => 1, ...$query,
        ]);
    }

    private function subjectsUrl(User $teacher, array $query = []): string
    {
        return '/academic-dean/grade-submissions/users/'.$teacher->id.'/subjects?'.http_build_query([
            'school_year_id' => 1, ...$query,
        ]);
    }

    public function test_counts_regular_and_nstp_classes_and_current_submissions_without_join_multiplication(): void
    {
        $teacher = $this->user('faculty', 'FAC-001', 'Ada', 'Faculty');
        $first = $this->regular($teacher);
        $this->regular($teacher, type: null);
        $this->regular($teacher, type: 'NSTP'); // Enrollment placeholder is not another teaching class.
        $this->regular($teacher, year: 2);
        DB::table('grade_submissions')->insert([
            ['year_section_subjects_id' => $first, 'midterm_status' => 'submitted', 'final_status' => 'verified'],
            ['year_section_subjects_id' => $first, 'midterm_status' => 'deployed', 'final_status' => 'deployed'],
        ]);
        DB::table('subject_secondary_schedule')->insert([
            ['year_section_subjects_id' => $first, 'faculty_id' => $teacher->id],
            ['year_section_subjects_id' => $first, 'faculty_id' => $teacher->id],
        ]);
        $this->nstp($teacher, sectionId: 801, scheduleId: 101);
        $this->nstp($teacher, sectionId: 802, scheduleId: 102);
        $this->nstp($teacher, sectionId: 803, scheduleId: 103, year: 2);
        DB::table('nstp_grade_submissions')->insert([
            ['nstp_section_id' => 801, 'midterm_status' => 'verified', 'final_status' => 'submitted'],
            ['nstp_section_id' => 802, 'midterm_status' => 'draft', 'final_status' => 'deployed'],
            ['nstp_section_id' => 803, 'midterm_status' => 'submitted', 'final_status' => 'submitted'],
        ]);

        $this->actingAs($this->dean)->getJson($this->url())
            ->assertOk()->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $teacher->id)
            ->assertJsonPath('data.0.regular_classes', 2)
            ->assertJsonPath('data.0.nstp_classes', 2)
            ->assertJsonPath('data.0.total_classes', 4)
            ->assertJsonPath('data.0.regular_midterm_submitted', 1)
            ->assertJsonPath('data.0.regular_final_submitted', 1)
            ->assertJsonPath('data.0.nstp_midterm_submitted', 1)
            ->assertJsonPath('data.0.nstp_final_submitted', 2)
            ->assertJsonPath('data.0.midterm_submitted', 2)
            ->assertJsonPath('data.0.final_submitted', 3);
    }

    public function test_lists_nstp_only_teachers_and_keeps_missing_draft_and_rejected_submissions_at_zero(): void
    {
        $teacher = $this->user('nstp_faculty', 'NSTP-001');
        $this->nstp($teacher, sectionId: 900, scheduleId: 200);
        $this->nstp($teacher, sectionId: 901, scheduleId: 201);
        DB::table('nstp_grade_submissions')->insert([
            'nstp_section_id' => 900, 'midterm_status' => 'rejected', 'final_status' => 'draft',
        ]);

        $this->actingAs($this->dean)->getJson($this->url())
            ->assertOk()->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.regular_classes', 0)
            ->assertJsonPath('data.0.nstp_classes', 2)
            ->assertJsonPath('data.0.midterm_submitted', 0)
            ->assertJsonPath('data.0.final_submitted', 0);
    }

    public function test_omits_users_without_teaching_classes_and_student_assignments(): void
    {
        $this->user('faculty', 'NO-CLASSES');
        $historical = $this->user('faculty', 'OLD-CLASSES');
        $this->regular($historical, year: 2);
        $student = $this->user('student', 'STUDENT-001');
        $this->regular($student);
        $teacher = $this->user('registrar', 'REGISTRAR-001');
        $this->regular($teacher);

        $this->actingAs($this->dean)->getJson($this->url())
            ->assertOk()->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $teacher->id);
    }

    public function test_searches_names_id_numbers_and_roles_and_paginates_users(): void
    {
        $ada = $this->user('faculty', 'FAC-ALPHA', 'Ada', 'Alpha');
        $ben = $this->user('evaluator', 'EVAL-BETA', 'Ben', 'Beta');
        $cy = $this->user('program_head', 'HEAD-GAMMA', 'Cy', 'Gamma');
        foreach ([$ada, $ben, $cy] as $teacher) {
            $this->regular($teacher);
        }
        $this->actingAs($this->dean);
        foreach (['Ada', 'FAC-ALPHA', 'faculty'] as $search) {
            $this->getJson($this->url(['search' => $search]))
                ->assertOk()->assertJsonPath('total', 1)
                ->assertJsonPath('data.0.id', $ada->id);
        }
        $this->getJson($this->url(['per_page' => 1, 'page' => 2]))
            ->assertOk()->assertJsonPath('total', 3)
            ->assertJsonPath('per_page', 1)->assertJsonPath('current_page', 2)
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ben->id);
        $this->getJson($this->url(['search' => 'not-a-matching-user']))
            ->assertOk()->assertJsonPath('total', 0)->assertJsonCount(0, 'data');
    }

    public function test_requires_an_existing_school_year_and_bounded_page_size(): void
    {
        $this->actingAs($this->dean);
        $this->getJson('/academic-dean/grade-submissions/data')
            ->assertUnprocessable()->assertJsonValidationErrors('school_year_id');
        $this->getJson($this->url(['school_year_id' => 999]))
            ->assertUnprocessable()->assertJsonValidationErrors('school_year_id');
        foreach ([0, 101] as $perPage) {
            $this->getJson($this->url(['per_page' => $perPage]))
                ->assertUnprocessable()->assertJsonValidationErrors('per_page');
        }
        $this->assertSame(0, ActivityLog::count());
    }

    public function test_dean_can_open_the_report_and_the_visit_is_logged(): void
    {
        $this->actingAs($this->dean)->get('/academic-dean/grade-submissions')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->component('Schedules/GradeSubmissions'));
        $log = ActivityLog::sole();
        $this->assertSame($this->dean->id, $log->user_id);
        $this->assertSame('academic_dean.grade_submissions.viewed', $log->action);
    }

    public function test_inspection_is_logged_with_school_year_and_request_context(): void
    {
        $this->actingAs($this->dean)->getJson($this->url(['search' => 'faculty', 'per_page' => 5]))->assertOk();
        $log = ActivityLog::sole();
        $this->assertSame($this->dean->id, $log->user_id);
        $this->assertSame('academic_dean.grade_submissions.inspected', $log->action);
        $this->assertSame(1, $log->properties['school_year_id']);
        $this->assertSame('faculty', $log->properties['search']);
        $this->assertSame(5, $log->properties['per_page']);
    }

    public function test_impersonated_dean_can_inspect_without_creating_activity_logs(): void
    {
        $this->actingAs($this->dean)->withSession(['impersonator_id' => 12345]);
        $this->get('/academic-dean/grade-submissions')->assertOk();
        $this->getJson($this->url())->assertOk();
        $this->assertSame(0, ActivityLog::count());
    }

    public function test_guest_and_other_roles_cannot_inspect_or_generate_report_activity(): void
    {
        $this->getJson($this->url())->assertUnauthorized();
        $this->get('/academic-dean/grade-submissions')->assertRedirect(route('login'));
        $other = $this->user('faculty', 'FAC-NOT-DEAN');
        $this->actingAs($other)->getJson($this->url())->assertNotFound();
        $this->get('/academic-dean/grade-submissions')->assertNotFound();
        $this->assertSame(0, ActivityLog::count());
    }

    public function test_subject_list_has_regular_and_nstp_statuses_for_only_the_selected_teacher_and_school_year(): void
    {
        $teacher = $this->user('faculty', 'SUBJECT-TEACHER');
        $regularId = $this->regular($teacher);
        $missingId = $this->regular($teacher, type: null);
        $this->regular($teacher, type: 'NSTP');
        $this->regular($teacher, year: 2);
        $other = $this->user('faculty', 'OTHER-TEACHER');
        $this->regular($other);
        DB::table('grade_submissions')->insert([
            ['year_section_subjects_id' => $regularId, 'midterm_status' => 'submitted', 'final_status' => 'rejected'],
            ['year_section_subjects_id' => $regularId, 'midterm_status' => 'deployed', 'final_status' => 'verified'],
        ]);
        $this->nstp($teacher, sectionId: 700, scheduleId: 300);
        $this->nstp($teacher, sectionId: 701, scheduleId: 301, year: 2);
        $this->nstp($other, sectionId: 702, scheduleId: 302);
        DB::table('nstp_grade_submissions')->insert([
            'nstp_section_id' => 700, 'midterm_status' => 'rejected', 'final_status' => 'submitted',
        ]);

        $response = $this->actingAs($this->dean)->getJson($this->subjectsUrl($teacher))
            ->assertOk()->assertJsonPath('total', 3)->assertJsonStructure([
                'data' => [['id', 'subject_code', 'descriptive_title', 'class_code', 'section', 'midterm_status', 'final_status']],
            ]);
        $subjects = collect($response->json('data'))->keyBy('id');
        $this->assertSame('deployed', $subjects['regular-'.$regularId]['midterm_status']);
        $this->assertSame('verified', $subjects['regular-'.$regularId]['final_status']);
        $this->assertSame('draft', $subjects['regular-'.$missingId]['midterm_status']);
        $this->assertSame('draft', $subjects['regular-'.$missingId]['final_status']);
        $this->assertSame('NSTP-CWTS', $subjects['nstp-700']['subject_code']);
        $this->assertSame('CWTS-A', $subjects['nstp-700']['section']);
        $this->assertSame('rejected', $subjects['nstp-700']['midterm_status']);
        $this->assertSame('submitted', $subjects['nstp-700']['final_status']);
    }

    public function test_subject_list_searches_subjects_and_paginates_without_duplicate_classes(): void
    {
        $teacher = $this->user('evaluator', 'SEARCH-SUBJECTS');
        $this->regular($teacher);
        $second = $this->regular($teacher);
        $subjectId = DB::table('year_section_subjects')->where('id', $second)->value('subject_id');
        DB::table('subjects')->where('id', $subjectId)->update([
            'subject_code' => 'MATH101', 'descriptive_title' => 'College Mathematics',
        ]);
        $this->nstp($teacher, sectionId: 750, scheduleId: 350);
        $this->actingAs($this->dean);
        foreach (['MATH101', 'Mathematics'] as $search) {
            $this->getJson($this->subjectsUrl($teacher, ['search' => $search]))
                ->assertOk()->assertJsonPath('total', 1)
                ->assertJsonPath('data.0.id', 'regular-'.$second);
        }
        $this->getJson($this->subjectsUrl($teacher, ['search' => 'CWTS']))
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', 'nstp-750');
        $firstPage = $this->getJson($this->subjectsUrl($teacher, ['per_page' => 1]))
            ->assertOk()->assertJsonPath('total', 3)->assertJsonCount(1, 'data')->json('data.0.id');
        $secondPage = $this->getJson($this->subjectsUrl($teacher, ['per_page' => 1, 'page' => 2]))
            ->assertOk()->assertJsonPath('current_page', 2)->assertJsonCount(1, 'data')->json('data.0.id');
        $this->assertNotSame($firstPage, $secondPage);
        $this->getJson($this->subjectsUrl($teacher, ['search' => 'No such subject']))
            ->assertOk()->assertJsonPath('total', 0)->assertJsonCount(0, 'data');
    }

    public function test_subject_list_validates_filters_and_returns_empty_for_a_teacher_without_classes(): void
    {
        $teacher = $this->user('registrar', 'NO-SUBJECTS');
        $this->actingAs($this->dean);
        $this->getJson('/academic-dean/grade-submissions/users/'.$teacher->id.'/subjects')
            ->assertUnprocessable()->assertJsonValidationErrors('school_year_id');
        $this->getJson($this->subjectsUrl($teacher, ['school_year_id' => 999]))
            ->assertUnprocessable()->assertJsonValidationErrors('school_year_id');
        foreach ([0, 101] as $perPage) {
            $this->getJson($this->subjectsUrl($teacher, ['per_page' => $perPage]))
                ->assertUnprocessable()->assertJsonValidationErrors('per_page');
        }
        $this->assertSame(0, ActivityLog::count());
        $this->getJson($this->subjectsUrl($teacher))->assertOk()
            ->assertJsonPath('total', 0)->assertJsonCount(0, 'data');
    }

    public function test_subject_inspection_logs_the_target_teacher_and_filters_and_skips_impersonation(): void
    {
        $teacher = $this->user('nstp_faculty', 'LOG-SUBJECTS');
        $this->nstp($teacher, sectionId: 760, scheduleId: 360);
        $this->actingAs($this->dean)->getJson($this->subjectsUrl($teacher, ['search' => 'CWTS', 'per_page' => 5]))
            ->assertOk();
        $log = ActivityLog::sole();
        $this->assertSame('academic_dean.grade_submissions.subjects_inspected', $log->action);
        $this->assertSame($this->dean->id, $log->user_id);
        $this->assertSame(User::class, $log->subject_type);
        $this->assertSame($teacher->id, $log->subject_id);
        $this->assertSame($teacher->id, $log->properties['teacher_id']);
        $this->assertSame(1, $log->properties['school_year_id']);
        $this->assertSame('CWTS', $log->properties['search']);
        $this->assertSame(5, $log->properties['per_page']);
        $this->assertSame(1, $log->properties['result_count']);
        $this->withSession(['impersonator_id' => 12345])->getJson($this->subjectsUrl($teacher))->assertOk();
        $this->assertSame(1, ActivityLog::count());
    }

    public function test_subject_details_are_restricted_to_the_dean_and_teaching_role_targets(): void
    {
        $teacher = $this->user('faculty', 'PROTECTED-SUBJECTS');
        $this->getJson($this->subjectsUrl($teacher))->assertUnauthorized();
        $this->actingAs($teacher)->getJson($this->subjectsUrl($teacher))->assertNotFound();
        $student = $this->user('student', 'STUDENT-TARGET');
        $this->actingAs($this->dean)->getJson($this->subjectsUrl($student))->assertNotFound();
        $this->getJson('/academic-dean/grade-submissions/users/99999/subjects?school_year_id=1')->assertNotFound();
        $this->assertSame(0, ActivityLog::count());
    }
}
