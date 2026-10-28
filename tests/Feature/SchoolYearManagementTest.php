<?php

namespace Tests\Feature;

use App\Http\Controllers\SchoolYear\SchoolYearController;
use App\Models\SchoolYear;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchoolYearManagementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Never run legacy migrations or connect to the school's database.
        config([
            'app.timezone' => 'Asia/Manila',
            'database.default' => 'sqlite',
            'database.connections.sqlite' => [
                'driver' => 'sqlite', 'url' => null, 'database' => ':memory:',
                'prefix' => '', 'foreign_key_constraints' => true,
            ],
            'session.driver' => 'array', 'cache.default' => 'array',
        ]);
        DB::purge('sqlite');
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 28)->setTime(12, 0));

        Schema::create('semesters', function (Blueprint $table) {
            $table->id();
            $table->string('semester_name');
        });
        Schema::create('school_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('semester_id')->constrained();
            $table->integer('start_year');
            $table->integer('end_year');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_current')->default(false);
            $table->boolean('allow_enrollment')->default(false);
            $table->json('allowed_enrollment_roles')->nullable();
            $table->boolean('evaluating')->default(false);
            $table->boolean('allow_upload_midterm')->default(false);
            $table->boolean('allow_upload_final')->default(false);
            $table->timestamps();
        });
        DB::table('semesters')->insert([
            ['id' => 1, 'semester_name' => 'First'],
            ['id' => 2, 'semester_name' => 'Second'],
            ['id' => 3, 'semester_name' => 'Summer'],
        ]);

        // Exercise validation and responses without unrelated global middleware.
        $this->withoutMiddleware();
        Route::post('/__test/school-years/list', [SchoolYearController::class, 'schoolYears']);
        Route::post('/__test/school-years', [SchoolYearController::class, 'addSchoolYear']);
        Route::post('/__test/school-years/{id}', [SchoolYearController::class, 'getSchoolYear']);
        Route::patch('/__test/school-years/{id}', [SchoolYearController::class, 'editSchoolYear']);
        Route::patch('/__test/current/{schoolYearId}', [SchoolYearController::class, 'updateIsCurrent']);
        foreach ([
            'allow_enrollment' => 'updateAllowEnrollment',
            'evaluating' => 'updateEvaluating',
            'allow_upload_midterm' => 'updateAllowUploadMidterm',
            'allow_upload_final' => 'updateAllowUploadFinal',
        ] as $field => $method) {
            Route::patch('/__test/'.$field.'/{schoolYearId}', [SchoolYearController::class, $method]);
        }
    }

    private function period(array $attributes = []): SchoolYear
    {
        return SchoolYear::create(array_merge($this->payload(), $attributes));
    }

    private function payload(array $attributes = []): array
    {
        return array_merge([
            'semester_id' => 1, 'start_year' => 2026, 'end_year' => 2027,
            'start_date' => '2026-10-01', 'end_date' => '2026-10-31',
        ], $attributes);
    }

    public function test_status_respects_dates_permission_and_current_semester_independently(): void
    {
        $cases = [
            ['2026-10-01', '2026-10-31', 1, 'open'],
            ['2026-10-01', '2026-10-31', 0, 'paused'],
            ['2026-11-20', '2026-12-20', 0, 'scheduled'],
            ['2026-10-01', '2026-10-27', 1, 'closed'],
            ['2026-10-28', '2026-10-28', 1, 'open'],
        ];
        foreach ($cases as [$start, $end, $allowed, $expected]) {
            $period = $this->period([
                'start_date' => $start, 'end_date' => $end,
                'allow_enrollment' => $allowed, 'is_current' => 1,
            ]);
            $this->postJson('/__test/school-years/'.$period->id)
                ->assertOk()
                ->assertJsonPath('enrollment_status', $expected)
                ->assertJsonPath('status_date', '2026-10-28')
                ->assertJsonPath('is_current', 1)
                ->assertJsonPath('enrollment_ongoing', $expected === 'open');
        }
    }

    public function test_status_date_uses_school_timezone_at_the_utc_day_boundary(): void
    {
        $this->travelTo(\Carbon\Carbon::parse('2026-10-28 16:30:00', 'UTC'));
        $period = $this->period([
            'start_date' => '2026-10-29', 'end_date' => '2026-10-29', 'allow_enrollment' => 1,
        ]);
        $this->postJson('/__test/school-years/'.$period->id)
            ->assertOk()->assertJsonPath('status_date', '2026-10-29')
            ->assertJsonPath('enrollment_status', 'open');
    }
    public function test_list_includes_independent_permissions_and_the_same_status_as_details(): void
    {
        $period = $this->period([
            'allow_enrollment' => 0, 'evaluating' => 1,
            'allow_upload_midterm' => 1, 'allow_upload_final' => 0,
        ]);
        $this->postJson('/__test/school-years/list')
            ->assertOk()->assertJsonPath('0.id', $period->id)
            ->assertJsonPath('0.enrollment_status', 'paused')
            ->assertJsonPath('0.status_date', '2026-10-28')
            ->assertJsonPath('0.allow_enrollment', 0)
            ->assertJsonPath('0.evaluating', 1)
            ->assertJsonPath('0.allow_upload_midterm', 1)
            ->assertJsonPath('0.allow_upload_final', 0);
    }

    public function test_new_semesters_allow_an_editable_ending_year_and_cannot_inject_current_status(): void
    {
        $this->postJson('/__test/school-years', $this->payload([
            'end_year' => 2028, 'is_current' => 1,
        ]))->assertOk();
        $this->assertDatabaseHas('school_years', [
            'start_year' => 2026, 'end_year' => 2028, 'is_current' => 0,
        ]);
    }

    public function test_duplicate_semesters_are_rejected_but_another_semester_is_allowed(): void
    {
        $this->period();
        $this->postJson('/__test/school-years', $this->payload())
            ->assertUnprocessable()->assertJsonValidationErrors('semester_id');
        $this->postJson('/__test/school-years', $this->payload(['semester_id' => 2]))->assertOk();
        $this->assertDatabaseCount('school_years', 2);
    }

    public function test_invalid_date_ranges_and_year_ranges_are_rejected_on_create_and_edit(): void
    {
        $period = $this->period();
        $this->postJson('/__test/school-years', $this->payload([
            'end_year' => 2025, 'end_date' => '2026-09-30',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['end_year', 'end_date']);
        $this->patchJson('/__test/school-years/'.$period->id, $this->payload([
            'end_date' => '2026-09-30',
        ]))->assertUnprocessable()->assertJsonValidationErrors('end_date');
        $this->assertDatabaseHas('school_years', ['id' => $period->id, 'end_date' => '2026-10-31']);
    }

    public function test_missing_fields_and_invalid_semesters_return_field_errors(): void
    {
        $this->postJson('/__test/school-years', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['semester_id', 'start_year', 'end_year', 'start_date', 'end_date']);
        $this->postJson('/__test/school-years', $this->payload(['semester_id' => 99]))
            ->assertUnprocessable()->assertJsonValidationErrors('semester_id');
    }

    public function test_existing_dates_can_change_without_changing_identity_or_current_selection(): void
    {
        $current = $this->period(['is_current' => 1]);
        $other = $this->period(['semester_id' => 2]);
        $this->patchJson('/__test/school-years/'.$other->id, $this->payload([
            'semester_id' => 2, 'start_date' => '2026-10-02', 'is_current' => 1,
        ]))->assertOk();
        $this->assertDatabaseHas('school_years', ['id' => $other->id, 'start_date' => '2026-10-02', 'is_current' => 0]);
        $this->assertDatabaseHas('school_years', ['id' => $current->id, 'is_current' => 1]);
    }

    public function test_existing_academic_identity_cannot_change_through_a_direct_request(): void
    {
        $period = $this->period(['is_current' => 1]);
        $this->patchJson('/__test/school-years/'.$period->id, $this->payload([
            'semester_id' => 2, 'start_year' => 2027, 'end_year' => 2028,
        ]))->assertUnprocessable()->assertJsonValidationErrors(['semester_id', 'start_year', 'end_year']);
        $this->assertDatabaseHas('school_years', ['id' => $period->id, 'semester_id' => 1, 'start_year' => 2026]);
    }

    public function test_selecting_current_clears_previous_selections_and_returns_updated_details(): void
    {
        $old = $this->period(['is_current' => 1]);
        $next = $this->period(['semester_id' => 2]);
        $this->patchJson('/__test/current/'.$next->id, ['value' => 1])
            ->assertOk()->assertJsonPath('schoolYear.is_current', 1);
        $this->assertDatabaseHas('school_years', ['id' => $old->id, 'is_current' => 0]);
        $this->assertSame(1, SchoolYear::where('is_current', 1)->count());
        $this->patchJson('/__test/current/'.$next->id, ['value' => 1])->assertOk();
        $this->assertSame(1, SchoolYear::where('is_current', 1)->count());
    }

    public function test_invalid_current_selections_cannot_clear_the_current_semester(): void
    {
        $current = $this->period(['is_current' => 1]);
        $this->patchJson('/__test/current/'.$current->id, ['value' => 0])
            ->assertUnprocessable()->assertJsonValidationErrors('value');
        $this->patchJson('/__test/current/9999', ['value' => 1])->assertNotFound();
        $this->assertDatabaseHas('school_years', ['id' => $current->id, 'is_current' => 1]);
    }

    public function test_switches_validate_booleans_and_keep_permissions_independent(): void
    {
        $period = $this->period();
        foreach (['allow_enrollment', 'evaluating', 'allow_upload_midterm', 'allow_upload_final'] as $field) {
            $this->patchJson('/__test/'.$field.'/'.$period->id, ['value' => 'invalid'])
                ->assertUnprocessable()->assertJsonValidationErrors('value');
            $this->patchJson('/__test/'.$field.'/'.$period->id, ['value' => 1])
                ->assertOk()->assertJsonPath('schoolYear.'.$field, 1);
            $this->patchJson('/__test/'.$field.'/'.$period->id, ['value' => 0])
                ->assertOk()->assertJsonPath('schoolYear.'.$field, 0);
        }
        $this->assertDatabaseHas('school_years', [
            'id' => $period->id, 'is_current' => 0, 'allow_enrollment' => 0,
            'evaluating' => 0, 'allow_upload_midterm' => 0, 'allow_upload_final' => 0,
        ]);
    }

    public function test_enrollment_response_updates_open_and_paused_without_changing_current(): void
    {
        $period = $this->period(['is_current' => 1]);
        $this->patchJson('/__test/allow_enrollment/'.$period->id, ['value' => 1])
            ->assertOk()->assertJsonPath('schoolYear.enrollment_status', 'open')
            ->assertJsonPath('schoolYear.is_current', 1);
        $this->patchJson('/__test/allow_enrollment/'.$period->id, ['value' => 0])
            ->assertOk()->assertJsonPath('schoolYear.enrollment_status', 'paused')
            ->assertJsonPath('schoolYear.is_current', 1);
    }
}