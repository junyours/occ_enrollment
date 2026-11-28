<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Shared in-memory curriculum fixture for the curriculum tests.
 *
 * Lives in tests/Unit so Pest's RefreshDatabase (applied to tests/Feature)
 * never touches the real database. Everything here uses in-memory SQLite.
 *
 * Department 1 owns course 1 (BSIT) with curricula 1 (2024-2025) and 2 (2018-2019);
 * department 2 owns course 2 (BEED) with curriculum 3 (2024-2025).
 */
abstract class CurriculumTestCase extends TestCase
{
    protected User $programHead;

    /** @var array<string, int> subject code => curriculum_term_subjects.id */
    protected array $entries = [];

    /** @var array<string, int> term key => curriculum_term.id */
    protected array $termIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite' => [
                'driver' => 'sqlite', 'url' => null, 'database' => ':memory:',
                'prefix' => '', 'foreign_key_constraints' => true,
            ],
            'session.driver' => 'array', 'cache.default' => 'array',
        ]);
        DB::purge('sqlite');
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
        DB::connection()->getPdo()->sqliteCreateFunction('MD5', fn ($value) => md5((string) $value), 1);

        // Inertia's shared page data (menus, school year, notifications) needs many
        // unrelated tables; these tests only cover the curriculum endpoints.
        $this->withoutMiddleware(\App\Http\Middleware\HandleInertiaRequests::class);

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('user_id_no')->unique();
            $table->string('email')->nullable();
            $table->string('password');
            $table->string('user_role');
            $table->boolean('password_change')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('maintenance_mode')->default(false);
            $table->json('blocked_roles')->nullable();
            $table->timestamps();
        });
        Schema::create('user_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('method')->nullable();
            $table->string('endpoint')->nullable();
            $table->string('ip_address')->nullable();
            $table->integer('status_code')->nullable();
            $table->text('payload')->nullable();
            $table->timestamps();
        });
        Schema::create('faculty', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('faculty_id');
            $table->unsignedBigInteger('department_id');
            $table->timestamps();
        });
        Schema::create('course', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('department_id');
            $table->string('course_name')->nullable();
            $table->string('course_name_abbreviation')->nullable();
            $table->timestamps();
        });
        Schema::create('year_section_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('subject_id');
        });
        Schema::create('curriculum', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('course_id');
            $table->integer('school_year_start');
            $table->integer('school_year_end');
            $table->timestamps();
        });
        Schema::create('year_level', function (Blueprint $table) {
            $table->id();
            $table->string('year_level_name');
            $table->timestamps();
        });
        Schema::create('semesters', function (Blueprint $table) {
            $table->id();
            $table->string('semester_name');
            $table->timestamps();
        });
        Schema::create('curriculum_term', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('curriculum_id');
            $table->unsignedBigInteger('year_level_id');
            $table->unsignedBigInteger('semester_id');
            $table->boolean('active')->default(false);
            $table->timestamps();
        });
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('type')->nullable();
            $table->string('subject_code');
            $table->string('descriptive_title');
            $table->integer('credit_units')->default(3);
            $table->integer('lecture_hours')->default(3);
            $table->integer('laboratory_hours')->default(0);
            $table->timestamps();
        });
        Schema::create('curriculum_term_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('curriculum_term_id')->constrained('curriculum_term')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects');
            $table->string('pre_requisite_name')->nullable();
            $table->timestamps();
        });
        // Original table, as created by 2025_02_26_072040_create_pre_requisite_subjects_table.
        Schema::create('pre_requisite_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('curriculum_term_subjects_id')->nullable();
            $table->foreign('curriculum_term_subjects_id')->references('id')->on('curriculum_term_subjects')->onDelete('cascade');
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
            $table->timestamps();
        });

        // The migration under test.
        (require database_path('migrations/2026_11_27_120000_add_curriculum_prerequisite_links.php'))->up();
        (require database_path('migrations/2026_11_28_120000_add_unit_limits_to_course_and_curriculum.php'))->up();
        (require database_path('migrations/2026_11_28_150000_create_subject_groups.php'))->up();

        foreach ([1 => 'First Year', 2 => 'Second Year', 3 => 'Third Year', 4 => 'Fourth Year'] as $id => $name) {
            DB::table('year_level')->insert(['id' => $id, 'year_level_name' => $name]);
        }
        foreach ([1 => 'First', 2 => 'Second', 3 => 'Summer'] as $id => $name) {
            DB::table('semesters')->insert(['id' => $id, 'semester_name' => $name]);
        }

        $this->programHead = $this->makeUser('program_head', 'PH-1');
        DB::table('faculty')->insert(['faculty_id' => $this->programHead->id, 'department_id' => 1]);
        DB::table('course')->insert(['id' => 1, 'department_id' => 1, 'course_name' => 'BSIT', 'course_name_abbreviation' => 'BSIT']);
        DB::table('course')->insert(['id' => 2, 'department_id' => 2, 'course_name' => 'BEED', 'course_name_abbreviation' => 'BEED']);
        DB::table('curriculum')->insert(['id' => 1, 'course_id' => 1, 'school_year_start' => 2024, 'school_year_end' => 2025]);
        DB::table('curriculum')->insert(['id' => 2, 'course_id' => 1, 'school_year_start' => 2018, 'school_year_end' => 2019]);
        DB::table('curriculum')->insert(['id' => 3, 'course_id' => 2, 'school_year_start' => 2024, 'school_year_end' => 2025]);

        // Curriculum 1: 1st year 1st sem, 1st year 2nd sem, 1st year summer, 2nd year 1st sem, 4th year 1st sem.
        $terms = [
            'Y1S1' => [1, 1, 1], 'Y1S2' => [1, 1, 2], 'Y1SUM' => [1, 1, 3], 'Y2S1' => [1, 2, 1], 'Y4S1' => [1, 4, 1],
            'OLD' => [2, 1, 1],
        ];
        foreach ($terms as $key => [$curriculum, $year, $semester]) {
            $this->termIds[$key] = DB::table('curriculum_term')->insertGetId([
                'curriculum_id' => $curriculum, 'year_level_id' => $year, 'semester_id' => $semester,
            ]);
        }

        foreach ([
            'IT101' => 'Y1S1', 'MATH101' => 'Y1S1', 'IT102' => 'Y1S2', 'IT103' => 'Y1S2',
            'IT104' => 'Y1SUM', 'IT201' => 'Y2S1', 'OJT' => 'Y4S1', 'OLD101' => 'OLD',
        ] as $code => $term) {
            $subjectId = DB::table('subjects')->insertGetId(['subject_code' => $code, 'descriptive_title' => "$code title"]);
            $this->entries[$code] = DB::table('curriculum_term_subjects')->insertGetId([
                'curriculum_term_id' => $this->termIds[$term], 'subject_id' => $subjectId,
            ]);
        }
    }

    protected function makeUser(string $role, string $idNo): User
    {
        return User::create([
            'user_id_no' => $idNo,
            'password' => Hash::make('secret-password'),
            'user_role' => $role,
            'password_change' => true,
        ]);
    }
}
