<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers the access-control fixes for the curriculum delete route, the mobile
 * class roster, the mobile/CSG login throttle and the CSG attendance API.
 *
 * Lives in tests/Unit so Pest's RefreshDatabase (applied to tests/Feature)
 * never runs against the real database. Everything here uses in-memory SQLite.
 */
class AccessControlFixesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite' => [
                'driver' => 'sqlite', 'url' => null, 'database' => ':memory:',
                'prefix' => '', 'foreign_key_constraints' => false,
            ],
            'session.driver' => 'array', 'cache.default' => 'array',
        ]);
        DB::purge('sqlite');
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());

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
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
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
        Schema::create('curriculum_term_subject', function (Blueprint $table) {
            $table->id();
        });
        Schema::create('year_section_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('faculty_id')->nullable();
        });
        Schema::create('enrolled_students', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
        });
        Schema::create('student_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('enrolled_students_id');
            $table->unsignedBigInteger('year_section_subjects_id');
            $table->string('midterm_grade')->nullable();
            $table->string('final_grade')->nullable();
        });
        Schema::create('user_information', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email_address')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('gender')->nullable();
        });

        // MySQL's SHA2() is used to look up hashed class ids.
        DB::connection()->getPdo()->sqliteCreateFunction(
            'SHA2',
            fn ($value, $bits) => hash('sha'.$bits, (string) $value),
            2
        );
    }

    private function makeUser(string $role, string $idNo): User
    {
        return User::create([
            'user_id_no' => $idNo,
            'password' => Hash::make('secret-password'),
            'user_role' => $role,
            'password_change' => true,
        ]);
    }

    public function test_guest_cannot_delete_curriculum_subject(): void
    {
        DB::table('curriculum_term_subject')->insert(['id' => 1]);

        $this->post('/api/delete/curr-subject/1')->assertRedirect('/login');

        $this->assertSame(1, DB::table('curriculum_term_subject')->count());
    }

    public function test_student_cannot_delete_curriculum_subject(): void
    {
        DB::table('curriculum_term_subject')->insert(['id' => 1]);

        $this->actingAs($this->makeUser('student', 'S-1'))
            ->post('/api/delete/curr-subject/1')
            ->assertStatus(403);

        $this->assertSame(1, DB::table('curriculum_term_subject')->count());
    }

    public function test_mobile_roster_is_limited_to_the_assigned_faculty(): void
    {
        $owner = $this->makeUser('faculty', 'F-1');
        $other = $this->makeUser('faculty', 'F-2');
        $student = $this->makeUser('student', 'S-1');

        DB::table('year_section_subjects')->insert(['id' => 7, 'faculty_id' => $owner->id]);
        DB::table('enrolled_students')->insert(['id' => 1, 'student_id' => $student->id]);
        DB::table('student_subjects')->insert([
            'enrolled_students_id' => 1, 'year_section_subjects_id' => 7, 'final_grade' => '1.25',
        ]);
        DB::table('user_information')->insert(['user_id' => $student->id, 'last_name' => 'Cruz']);

        $hash = hash('sha256', '7');
        $url = '/api/mobile/classes-classroom-students?hashed_year_section_subject_id='.$hash;

        Sanctum::actingAs($student);
        $this->getJson($url)->assertStatus(403);

        Sanctum::actingAs($other);
        $this->getJson($url)->assertStatus(403);

        Sanctum::actingAs($owner);
        $this->getJson($url)->assertOk()->assertJsonFragment(['last_name' => 'Cruz']);

        $this->getJson('/api/mobile/classes-classroom-students?hashed_year_section_subject_id=nope')
            ->assertNotFound();
    }

    public function test_mobile_and_csg_logins_are_throttled(): void
    {
        foreach (['/api/mobile/login', '/api/csg-attendance/login'] as $url) {
            for ($i = 0; $i < 10; $i++) {
                $this->postJson($url, ['user_id_no' => 'nobody', 'password' => 'x'])->assertStatus(422);
            }
            $this->postJson($url, ['user_id_no' => 'nobody', 'password' => 'x'])->assertStatus(429);

            // A different student on the same IP (shared campus Wi-Fi) is not locked out.
            $this->postJson($url, ['user_id_no' => 'someone-else', 'password' => 'x'])->assertStatus(422);
        }
    }

    public function test_csg_api_rejects_mobile_app_tokens(): void
    {
        $student = $this->makeUser('student', 'S-1');
        $mobileToken = $student->createToken('mobile-token')->plainTextToken;

        $this->withToken($mobileToken)->getJson('/api/student-enrollment')->assertStatus(403);
        $this->withToken($mobileToken)->getJson('/api/school-structure')->assertStatus(403);
    }

    public function test_csg_api_accepts_csg_attendance_tokens(): void
    {
        $student = $this->makeUser('student', 'S-1');

        $login = $this->postJson('/api/csg-attendance/login', [
            'user_id_no' => 'S-1', 'password' => 'secret-password',
        ])->assertOk();

        $this->withToken($login->json('token'))
            ->getJson('/api/student-enrollment?user_id_no[]=S-1')
            ->assertOk();
    }
}
