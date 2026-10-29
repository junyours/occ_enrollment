<?php

namespace Tests\Unit;

use App\Http\Controllers\Curriculum\CurriculumController;
use App\Models\CurriculumTermSubject;
use App\Models\Subject;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Container\Container;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Events\Dispatcher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Translation\ArrayLoader;
use Illuminate\Translation\Translator;
use Illuminate\Validation\DatabasePresenceVerifier;
use Illuminate\Validation\Factory as ValidationFactory;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\TestCase;

/** Uses only a dedicated SQLite :memory: connection; never boots the app or reads .env. */
class CurriculumSubjectTest extends TestCase
{
    private Container $app;
    private Capsule $database;
    private $previousContainer;
    private $previousFacadeApp;
    private $previousResolver;
    private $previousDispatcher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->previousContainer = Container::getInstance();
        $this->previousFacadeApp = Facade::getFacadeApplication();
        $this->previousResolver = Model::getConnectionResolver();
        $this->previousDispatcher = Model::getEventDispatcher();
        $this->app = new Container;
        Container::setInstance($this->app);
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication($this->app);
        $this->database = new Capsule($this->app);
        $this->database->addConnection([
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ], 'curriculum_test');
        $this->database->getDatabaseManager()->setDefaultConnection('curriculum_test');
        $this->database->setEventDispatcher(new Dispatcher($this->app));
        $this->database->bootEloquent();
        $this->app->instance('db', $this->database->getDatabaseManager());
        $validator = new ValidationFactory(new Translator(new ArrayLoader, 'en'), $this->app);
        $validator->setPresenceVerifier(new DatabasePresenceVerifier($this->database->getDatabaseManager()));
        $this->app->instance('validator', $validator);
        Redirect::swap(new class {
            public function back(): RedirectResponse
            {
                return new RedirectResponse('http://localhost/curriculum');
            }
        });

        $schema = $this->database->getConnection('curriculum_test')->getSchemaBuilder();
        $schema->create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('type')->nullable();
            $table->string('subject_code');
            $table->string('descriptive_title');
            $table->integer('credit_units');
            $table->integer('lecture_hours');
            $table->integer('laboratory_hours')->default(0);
            $table->timestamps();
        });
        $schema->create('curriculum_term_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('curriculum_term_id');
            $table->unsignedBigInteger('subject_id');
            $table->timestamps();
        });
        $schema->create('curriculum_term', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('curriculum_id');
        });
        $schema->create('curriculum', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('course_id');
        });
        $schema->create('course', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('department_id');
        });
        $schema->create('faculty', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('faculty_id');
            $table->unsignedBigInteger('department_id');
        });
        $schema->create('year_section_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('subject_id');
        });
        DB::table('faculty')->insert(['id' => 1, 'faculty_id' => 100, 'department_id' => 7]);
        DB::table('course')->insert([['id' => 1, 'department_id' => 7], ['id' => 2, 'department_id' => 8]]);
        DB::table('curriculum')->insert([['id' => 1, 'course_id' => 1], ['id' => 2, 'course_id' => 1], ['id' => 3, 'course_id' => 2]]);
        DB::table('curriculum_term')->insert([['id' => 1, 'curriculum_id' => 1], ['id' => 2, 'curriculum_id' => 2], ['id' => 3, 'curriculum_id' => 3]]);
        Subject::create(['id' => 1, 'type' => 'gened', ...$this->fields()]);
        CurriculumTermSubject::create(['curriculum_term_id' => 1, 'subject_id' => 1]);
        CurriculumTermSubject::create(['curriculum_term_id' => 2, 'subject_id' => 1]);
        DB::table('year_section_subjects')->insert(['id' => 1, 'subject_id' => 1]);
    }

    protected function tearDown(): void
    {
        $this->database->getDatabaseManager()->disconnect('curriculum_test');
        if ($this->previousResolver) {
            Model::setConnectionResolver($this->previousResolver);
        } else {
            Model::unsetConnectionResolver();
        }
        if ($this->previousDispatcher) {
            Model::setEventDispatcher($this->previousDispatcher);
        } else {
            Model::unsetEventDispatcher();
        }
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication($this->previousFacadeApp);
        Container::setInstance($this->previousContainer);
        parent::tearDown();
    }

    private function fields(array $changes = []): array
    {
        return array_replace([
            'subject_code' => 'IT101',
            'descriptive_title' => 'Introduction to Computing',
            'credit_units' => 3,
            'lecture_hours' => 2,
            'laboratory_hours' => 3,
        ], $changes);
    }

    private function request(array $data): Request
    {
        $request = Request::create('/curriculum/subject', 'POST', $data);
        $request->setUserResolver(fn () => (object) ['id' => 100]);
        return $request;
    }

    public function test_revision_changes_only_selected_curriculum_and_preserves_past_class(): void
    {
        (new CurriculumController)->editSubject($this->request([
            'id' => 2,
            'subject_id' => 1,
            ...$this->fields(['subject_code' => 'CC101', 'credit_units' => 4]),
        ]));
        $this->assertSame(2, Subject::count());
        $this->assertSame('IT101', Subject::findOrFail(1)->subject_code);
        $this->assertSame(3, Subject::findOrFail(1)->credit_units);
        $this->assertSame(1, CurriculumTermSubject::findOrFail(1)->subject_id);
        $revised = CurriculumTermSubject::findOrFail(2)->Subject;
        $this->assertNotSame(1, $revised->id);
        $this->assertSame('CC101', $revised->subject_code);
        $this->assertSame(4, $revised->credit_units);
        $this->assertSame('gened', $revised->type);
        $this->assertSame(1, DB::table('year_section_subjects')->value('subject_id'));
    }

    public function test_same_code_revision_preserves_original_details(): void
    {
        (new CurriculumController)->editSubject($this->request([
            'id' => 2, 'subject_id' => 1,
            ...$this->fields(['descriptive_title' => 'Computing Fundamentals']),
        ]));
        $this->assertSame(2, Subject::where('subject_code', 'IT101')->count());
        $this->assertSame('Introduction to Computing', Subject::findOrFail(1)->descriptive_title);
        $this->assertSame('Computing Fundamentals', CurriculumTermSubject::findOrFail(2)->Subject->descriptive_title);
    }

    public function test_unchanged_revision_does_not_create_another_subject(): void
    {
        (new CurriculumController)->editSubject($this->request(['id' => 2, 'subject_id' => 1, ...$this->fields()]));
        $this->assertSame(1, Subject::count());
        $this->assertSame(1, CurriculumTermSubject::findOrFail(2)->subject_id);
    }

    public function test_existing_subject_is_selected_by_id_without_changing_its_definition(): void
    {
        $existing = Subject::create($this->fields(['subject_code' => 'CC102', 'credit_units' => 4]));
        (new CurriculumController)->addSubject($this->request([
            'mode' => 'existing', 'curriculum_term_id' => 2, 'subject_id' => $existing->id,
            'descriptive_title' => 'Ignored', 'credit_units' => 999,
        ]));
        $this->assertSame(2, Subject::count());
        $this->assertSame(4, $existing->fresh()->credit_units);
        $this->assertSame($existing->id, CurriculumTermSubject::latest('id')->first()->subject_id);
    }

    public function test_new_code_creates_a_separate_record(): void
    {
        (new CurriculumController)->addSubject($this->request([
            'mode' => 'new', 'curriculum_term_id' => 2,
            ...$this->fields(['subject_code' => 'CC101']),
        ]));
        $this->assertSame(2, Subject::count());
        $this->assertSame('CC101', CurriculumTermSubject::latest('id')->first()->Subject->subject_code);
        $this->assertSame(1, DB::table('year_section_subjects')->value('subject_id'));
    }

    public function test_new_mode_does_not_silently_reuse_an_existing_code(): void
    {
        try {
            (new CurriculumController)->addSubject($this->request([
                'mode' => 'new', 'curriculum_term_id' => 2,
                ...$this->fields(['credit_units' => 4]),
            ]));
            $this->fail('Expected code validation error.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('subject_code', $exception->errors());
        }
        $this->assertSame(1, Subject::count());
        $this->assertSame(2, CurriculumTermSubject::count());
    }

    public function test_duplicate_semester_subject_is_rejected(): void
    {
        try {
            (new CurriculumController)->addSubject($this->request([
                'mode' => 'existing', 'curriculum_term_id' => 2, 'subject_id' => 1,
            ]));
            $this->fail('Expected duplicate validation error.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('subject_id', $exception->errors());
        }
        $this->assertSame(2, CurriculumTermSubject::count());
    }

    public function test_stale_revision_does_not_overwrite_a_newer_curriculum_selection(): void
    {
        $other = Subject::create($this->fields(['subject_code' => 'IT102']));
        try {
            (new CurriculumController)->editSubject($this->request([
                'id' => 2, 'subject_id' => $other->id,
                ...$this->fields(['subject_code' => 'CC101']),
            ]));
            $this->fail('Expected stale entry error.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('subject_code', $exception->errors());
        }
        $this->assertSame(1, CurriculumTermSubject::findOrFail(2)->subject_id);
        $this->assertSame(2, Subject::count());
    }

    public function test_invalid_units_are_rejected_before_mutation(): void
    {
        $this->expectException(ValidationException::class);
        (new CurriculumController)->editSubject($this->request([
            'id' => 2, 'subject_id' => 1,
            ...$this->fields(['credit_units' => -1]),
        ]));
    }

    public function test_program_head_cannot_change_another_departments_curriculum(): void
    {
        $this->expectException(AuthorizationException::class);
        (new CurriculumController)->addSubject($this->request([
            'mode' => 'new', 'curriculum_term_id' => 3,
            ...$this->fields(['subject_code' => 'CC101']),
        ]));
    }
}