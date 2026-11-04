<?php

namespace Tests\Feature;

use App\Http\Middleware\DatabaseBasedMaintenance;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogAuthenticatedUserActivity;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SuperAdminActivityLogsTest extends TestCase
{
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        // Build only isolated in-memory tables; never run production migrations.
        config([
            'app.key' => str_repeat('a', 32),
            'app.timezone' => 'Asia/Manila',
            'database.default' => 'sqlite',
            'database.connections.sqlite' => [
                'driver' => 'sqlite', 'url' => null, 'database' => ':memory:',
                'prefix' => '', 'foreign_key_constraints' => true,
            ],
            'session.driver' => 'array', 'cache.default' => 'array',
            'mail.default' => 'array', 'hashing.bcrypt.rounds' => 4,
        ]);
        DB::purge('sqlite');
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
        $this->withoutMiddleware([
            DatabaseBasedMaintenance::class, EnsurePasswordChanged::class,
            HandleInertiaRequests::class, LogAuthenticatedUserActivity::class,
        ]);
        $this->withoutVite();

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
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
        });
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('target_type')->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->text('description')->nullable();
            $table->json('properties')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });
        $this->admin = $this->user('super_admin', 'ADMIN-001', 'Super', 'Root');
    }

    private function user(string $role, string $number, string $first = 'Test', string $last = 'User'): User
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

    private function activity(?User $actor = null, array $attributes = []): ActivityLog
    {
        return ActivityLog::create([
            'user_id' => $actor?->id,
            'action' => 'student.updated',
            'subject_type' => User::class,
            'subject_id' => $actor?->id,
            'description' => 'Updated a student record.',
            'properties' => ['field' => 'email', 'old' => 'old@example.test', 'new' => 'new@example.test'],
            'ip_address' => '192.0.2.10',
            'user_agent' => 'Activity Test Browser',
            ...$attributes,
        ]);
    }

    private function endpoint(string $suffix = '', array $query = []): string
    {
        return '/super-admin/activity-logs'.$suffix.($query ? '?'.http_build_query($query) : '');
    }

    public function test_recent_feed_orders_newest_first_with_stable_ids_and_preserves_orphaned_actors(): void
    {
        $actor = $this->user('faculty', 'FAC-001', 'Ada', 'Faculty');
        $old = $this->activity($actor);
        $new = $this->activity($actor);
        $orphan = $this->activity();
        $deletedActor = $this->user('student', 'DELETED-USER');
        $deleted = $this->activity($deletedActor);
        DB::table('activity_logs')->where('id', $old->id)->update(['created_at' => '2026-11-01 10:00:00']);
        DB::table('activity_logs')->whereIn('id', [$new->id, $orphan->id, $deleted->id])
            ->update(['created_at' => '2026-11-04 10:00:00']);
        $deletedActor->delete();

        $this->actingAs($this->admin)->getJson($this->endpoint('/recent'))
            ->assertOk()->assertJsonPath('total', 4)
            ->assertJsonPath('data.0.id', $deleted->id)->assertJsonPath('data.0.user_id', null)
            ->assertJsonPath('data.1.id', $orphan->id)->assertJsonPath('data.1.user_id', null)
            ->assertJsonPath('data.2.id', $new->id)->assertJsonPath('data.2.user_id', $actor->id)
            ->assertJsonPath('data.2.user_id_no', 'FAC-001')->assertJsonPath('data.2.user_role', 'faculty')
            ->assertJsonPath('data.2.first_name', 'Ada')->assertJsonPath('data.0.first_name', null)
            ->assertJsonPath('data.3.id', $old->id);
        $this->getJson($this->endpoint('/recent', ['per_page' => 1, 'page' => 2]))
            ->assertOk()->assertJsonPath('total', 4)->assertJsonPath('current_page', 2)
            ->assertJsonPath('data.0.id', $orphan->id);
        $this->assertSame(4, ActivityLog::count());
    }

    public function test_recent_feed_searches_actor_names_ids_and_log_details_without_creating_feed_noise(): void
    {
        $actor = $this->user('academic_dean', 'DEAN-SEARCH', 'Ada', 'Faculty');
        $matching = $this->activity($actor, [
            'action' => 'enrollment.approved', 'description' => 'Approved enrollment request.',
            'ip_address' => '198.51.100.23', 'subject_type' => 'App\\Models\\Enrollment',
        ]);
        $this->activity($this->admin, ['action' => 'other.action', 'description' => 'Unrelated entry.']);
        $this->actingAs($this->admin);
        foreach (['Ada Faculty', 'DEAN-SEARCH', 'academic_dean', 'enrollment.approved', 'Approved enrollment', '198.51.100.23', 'Enrollment'] as $search) {
            $this->getJson($this->endpoint('/recent', ['search' => $search]))
                ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $matching->id);
        }
        $this->getJson($this->endpoint('/recent', ['search' => 'not-a-real-match']))
            ->assertOk()->assertJsonPath('total', 0)->assertJsonCount(0, 'data');
        $this->assertSame(2, ActivityLog::count());
    }

    public function test_users_include_zero_activity_accounts_sorted_by_role_hierarchy_then_name(): void
    {
        $roles = [
            'super_admin', 'president', 'vpaa', 'academic_dean', 'program_head', 'registrar',
            'nstp_director', 'mis', 'gened_coordinator', 'research_coordinator', 'ojt_coordinator',
            'guidance', 'librarian', 'billing', 'cashier', 'announcement_admin', 'evaluator',
            'cwts_evaluator', 'rotc_evaluator', 'lts_evaluator', 'faculty', 'nstp_faculty', 'student',
        ];
        $users = ['super_admin' => $this->admin];
        foreach (array_reverse(array_slice($roles, 1)) as $role) {
            $users[$role] = $this->user($role, 'ROLE-'.$role, 'Test', 'Zulu');
        }
        $alphabeticalFaculty = $this->user('faculty', 'FAC-ABLE', 'Test', 'Able');
        $unknown = $this->user('custom_role', 'CUSTOM-001', 'Test', 'Aardvark');
        $latest = $this->activity($users['faculty']);
        $earlier = $this->activity($users['faculty']);
        DB::table('activity_logs')->where('id', $latest->id)->update(['created_at' => '2026-11-04 10:00:00']);
        DB::table('activity_logs')->where('id', $earlier->id)->update(['created_at' => '2026-11-01 10:00:00']);

        $response = $this->actingAs($this->admin)->getJson($this->endpoint('/users', ['per_page' => 100]))
            ->assertOk()->assertJsonPath('total', 25);
        $expectedIds = [];
        foreach ($roles as $role) {
            if ($role === 'faculty') {
                $expectedIds[] = $alphabeticalFaculty->id;
            }
            $expectedIds[] = $users[$role]->id;
        }
        $expectedIds[] = $unknown->id;
        $this->assertSame($expectedIds, array_column($response->json('data'), 'id'));
        $byId = collect($response->json('data'))->keyBy('id');
        $this->assertSame(2, $byId[$users['faculty']->id]['activity_count']);
        $this->assertSame('2026-11-04 10:00:00', Carbon::parse($byId[$users['faculty']->id]['last_activity_at'])
            ->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s'));
        $this->assertSame(0, $byId[$alphabeticalFaculty->id]['activity_count']);
        $this->assertNull($byId[$alphabeticalFaculty->id]['last_activity_at']);
        $this->assertSame(2, ActivityLog::count());
    }

    public function test_users_search_names_ids_and_roles_and_paginate(): void
    {
        $ada = $this->user('faculty', 'FAC-SEARCH', 'Ada', 'Faculty');
        $this->user('student', 'STUD-SEARCH', 'Ben', 'Student');
        $this->actingAs($this->admin);
        foreach (['Ada Faculty', 'FAC-SEARCH', 'faculty'] as $search) {
            $this->getJson($this->endpoint('/users', ['search' => $search]))
                ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $ada->id);
        }
        $this->getJson($this->endpoint('/users', ['per_page' => 1, 'page' => 2]))
            ->assertOk()->assertJsonPath('total', 3)->assertJsonCount(1, 'data')
            ->assertJsonPath('current_page', 2)->assertJsonPath('data.0.id', $ada->id);
        $this->assertSame(0, ActivityLog::count());
    }

    public function test_user_logs_filter_by_actor_and_log_the_user_inspection(): void
    {
        $selected = $this->user('faculty', 'SELECTED-USER', 'Ada', 'Faculty');
        $other = $this->user('student', 'OTHER-USER');
        $first = $this->activity($selected, ['subject_id' => $other->id]);
        $second = $this->activity($selected, ['target_type' => User::class, 'target_id' => $other->id]);
        $this->activity($other, ['subject_id' => $selected->id, 'target_type' => User::class, 'target_id' => $selected->id]);
        $this->activity();

        $response = $this->actingAs($this->admin)->getJson($this->endpoint('/users/'.$selected->id.'/logs', ['per_page' => 1]))
            ->assertOk()->assertJsonPath('total', 2)->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_id', $selected->id);
        $this->assertContains($response->json('data.0.id'), [$first->id, $second->id]);
        $audit = ActivityLog::where('action', 'activity_logs.user_inspected')->sole();
        $this->assertSame($this->admin->id, $audit->user_id);
        $this->assertSame(User::class, $audit->subject_type);
        $this->assertSame($selected->id, $audit->subject_id);
        $this->assertSame($selected->id, $audit->properties['inspected_user_id']);
        $this->assertSame(2, $audit->properties['result_count']);
        $this->assertSame([
            'id' => $selected->id, 'name' => 'Ada Faculty',
            'user_id_no' => 'SELECTED-USER', 'user_role' => 'faculty',
        ], $audit->properties['inspected_user']);
        $this->assertSame($this->admin->id, $audit->properties['inspector']['id']);
        foreach (['Super Root', 'ADMIN-001', 'Ada Faculty', 'SELECTED-USER'] as $detail) {
            $this->assertStringContainsString($detail, $audit->description);
        }
    }

    public function test_show_returns_full_metadata_and_logs_inspection_without_changing_the_source_entry(): void
    {
        $actor = $this->user('faculty', 'DETAIL-ACTOR');
        $log = $this->activity($actor, [
            'subject_type' => 'App\\Models\\Subject', 'subject_id' => 987,
            'target_type' => 'App\\Models\\YearSection', 'target_id' => 654,
            'properties' => ['old' => ['grade' => 2.0], 'new' => ['grade' => 1.5]],
        ]);
        $before = $log->fresh()->getRawOriginal();

        $this->actingAs($this->admin)->getJson($this->endpoint('/'.$log->id))
            ->assertOk()->assertJsonPath('id', $log->id)->assertJsonPath('user_id', $actor->id)
            ->assertJsonPath('user_id_no', 'DETAIL-ACTOR')->assertJsonPath('user_role', 'faculty')
            ->assertJsonPath('subject_type', 'App\\Models\\Subject')->assertJsonPath('subject_id', 987)
            ->assertJsonPath('target_type', 'App\\Models\\YearSection')->assertJsonPath('target_id', 654)
            ->assertJsonPath('properties.old.grade', 2)->assertJsonPath('properties.new.grade', 1.5)
            ->assertJsonPath('ip_address', '192.0.2.10')->assertJsonPath('user_agent', 'Activity Test Browser');
        $this->assertSame($before, $log->fresh()->getRawOriginal());
        $audit = ActivityLog::where('action', 'activity_logs.inspected')->sole();
        $this->assertSame($this->admin->id, $audit->user_id);
        $this->assertSame(ActivityLog::class, $audit->subject_type);
        $this->assertSame($log->id, $audit->subject_id);
        $this->assertSame($log->id, $audit->properties['inspected_log_id']);
        $this->assertStringContainsString((string) $log->id, $audit->description);
        $this->assertStringContainsString($log->action, $audit->description);
    }

    public function test_page_visit_is_logged_and_impersonation_skips_all_inspection_logs(): void
    {
        $this->actingAs($this->admin)->get($this->endpoint())->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('SuperAdmin/ActivityLogs/Index'));
        $audit = ActivityLog::sole();
        $this->assertSame('activity_logs.viewed', $audit->action);
        $this->assertSame($this->admin->id, $audit->user_id);
        $this->assertSame($this->admin->id, $audit->subject_id);
        $this->withSession(['impersonator_id' => 12345]);
        $this->get($this->endpoint())->assertOk();
        $this->getJson($this->endpoint('/recent'))->assertOk();
        $this->getJson($this->endpoint('/users'))->assertOk();
        $this->getJson($this->endpoint('/users/'.$this->admin->id.'/logs'))->assertOk();
        $this->getJson($this->endpoint('/'.$audit->id))->assertOk();
        $this->assertSame(1, ActivityLog::count());
    }

    public function test_all_paginated_endpoints_validate_search_and_page_inputs_without_logging_invalid_requests(): void
    {
        $selected = $this->user('student', 'VALIDATION-USER');
        $this->actingAs($this->admin);
        foreach (['/recent', '/users', '/users/'.$selected->id.'/logs'] as $suffix) {
            foreach ([['per_page' => 0], ['per_page' => 101], ['page' => 0], ['search' => str_repeat('x', 201)]] as $query) {
                $this->getJson($this->endpoint($suffix, $query))->assertUnprocessable()
                    ->assertJsonValidationErrors(array_key_first($query));
            }
        }
        $this->assertSame(0, ActivityLog::count());
    }

    public function test_guests_and_other_roles_cannot_access_any_activity_log_endpoint(): void
    {
        $other = $this->user('faculty', 'NOT-ADMIN');
        $log = $this->activity($other);
        $dataEndpoints = ['/recent', '/users', '/users/'.$other->id.'/logs', '/'.$log->id];
        $this->get($this->endpoint())->assertRedirect(route('login'));
        foreach ($dataEndpoints as $suffix) {
            $this->getJson($this->endpoint($suffix))->assertUnauthorized();
        }
        $this->actingAs($other)->get($this->endpoint())->assertForbidden();
        foreach ($dataEndpoints as $suffix) {
            $this->getJson($this->endpoint($suffix))->assertForbidden();
        }
        $this->assertSame(1, ActivityLog::count());
    }

    public function test_unknown_or_malformed_user_and_log_ids_return_not_found_without_inspection_events(): void
    {
        $this->actingAs($this->admin);
        foreach (['/99999', '/not-a-number', '/users/99999/logs', '/users/not-a-number/logs'] as $suffix) {
            $this->getJson($this->endpoint($suffix))->assertNotFound();
        }
        $this->assertSame(0, ActivityLog::count());
    }

    public function test_new_action_names_remove_only_emitted_role_prefixes_and_keep_resource_namespaces(): void
    {
        foreach ([
            'academic_dean.grade_submissions.subjects_inspected' => 'grade_submissions.subjects_inspected',
            'super_admin.activity_logs.viewed' => 'activity_logs.viewed',
            'grade_submissions.inspected' => 'grade_submissions.inspected',
            'student.updated' => 'student.updated',
            'faculty.updated' => 'faculty.updated',
            'grade_updated' => 'grade_updated',
            'nstp_grade_submitted' => 'nstp_grade_submitted',
        ] as $input => $expected) {
            $log = $this->activity($this->admin, ['action' => $input]);
            $this->assertSame($expected, $log->action);
            $this->assertSame($expected, $log->toArray()['action']);
            $this->assertSame($expected, DB::table('activity_logs')->where('id', $log->id)->value('action'));
        }
    }

    public function test_legacy_role_prefixed_actions_are_clean_in_reads_without_rewriting_raw_history(): void
    {
        $teacher = $this->user('faculty', 'LEGACY-TEACHER', 'Legacy', 'Teacher');
        $legacyAction = 'academic_dean.grade_submissions.subjects_inspected';
        $logId = DB::table('activity_logs')->insertGetId([
            'user_id' => $this->admin->id, 'action' => $legacyAction,
            'subject_type' => User::class, 'subject_id' => $teacher->id,
            'description' => 'Inspected subjects before identity snapshots were introduced.',
            'properties' => json_encode(['teacher_id' => $teacher->id]),
            'created_at' => '2026-11-04 10:00:00', 'updated_at' => '2026-11-04 10:00:00',
        ]);
        $rawBefore = (array) DB::table('activity_logs')->where('id', $logId)->first();
        $legacy = ActivityLog::findOrFail($logId);
        $this->assertSame('grade_submissions.subjects_inspected', $legacy->action);
        $this->assertSame('grade_submissions.subjects_inspected', $legacy->toArray()['action']);
        $this->actingAs($this->admin)->getJson($this->endpoint('/recent'))
            ->assertOk()->assertJsonPath('data.0.action', 'grade_submissions.subjects_inspected');
        $expectedIdentity = [
            'id' => $teacher->id, 'name' => 'Legacy Teacher',
            'user_id_no' => 'LEGACY-TEACHER', 'user_role' => 'faculty',
        ];
        $this->getJson($this->endpoint('/'.$logId))
            ->assertOk()->assertJsonPath('action', 'grade_submissions.subjects_inspected')
            ->assertJsonPath('subject_user', $expectedIdentity);
        $this->assertSame($rawBefore, (array) DB::table('activity_logs')->where('id', $logId)->first());
        $teacher->delete();
        $this->getJson($this->endpoint('/'.$logId))->assertOk()->assertJsonPath('subject_user', null);
        $this->assertSame($legacyAction, DB::table('activity_logs')->where('id', $logId)->value('action'));
    }

    public function test_subject_user_prefers_matching_snapshots_and_never_resolves_arbitrary_morph_types(): void
    {
        $teacher = $this->user('faculty', 'CURRENT-TEACHER', 'Current', 'Teacher');
        $historicalIdentity = [
            'id' => $teacher->id, 'name' => 'Original Teacher',
            'user_id_no' => 'ORIGINAL-ID', 'user_role' => 'faculty',
        ];
        $log = $this->activity($this->admin, [
            'action' => 'grade_submissions.subjects_inspected',
            'subject_type' => User::class, 'subject_id' => $teacher->id,
            'properties' => ['teacher' => $historicalIdentity],
        ]);
        $this->actingAs($this->admin)->getJson($this->endpoint('/'.$log->id))
            ->assertOk()->assertJsonPath('user_id', $this->admin->id)
            ->assertJsonPath('subject_user', $historicalIdentity);
        $other = $this->user('student', 'UNRELATED-USER', 'Wrong', 'Person');
        $inspected = $this->activity($this->admin, [
            'action' => 'activity_logs.user_inspected',
            'subject_type' => User::class, 'subject_id' => $teacher->id,
            'properties' => [
                'teacher' => ['id' => $other->id, 'name' => 'Wrong Person', 'user_id_no' => 'UNRELATED-USER', 'user_role' => 'student'],
                'inspected_user' => $historicalIdentity,
            ],
        ]);
        $this->getJson($this->endpoint('/'.$inspected->id))
            ->assertOk()->assertJsonPath('subject_user', $historicalIdentity);
        $teacher->delete();
        $this->getJson($this->endpoint('/'.$log->id))
            ->assertOk()->assertJsonPath('subject_user', $historicalIdentity);
        $arbitrary = $this->activity($this->admin, [
            'subject_type' => 'App\\Models\\NoSuchActivitySubject', 'subject_id' => 999,
            'properties' => ['teacher' => $historicalIdentity],
        ]);
        $this->getJson($this->endpoint('/'.$arbitrary->id))
            ->assertOk()->assertJsonPath('subject_user', null);
    }
}
