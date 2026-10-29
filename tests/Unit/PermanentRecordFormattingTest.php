<?php

namespace Tests\Unit;

use App\Http\Controllers\Registrar\FormNineController;
use App\Support\RecordProgramAbbreviations;
use Illuminate\Container\Container;
use Illuminate\Contracts\Routing\ResponseFactory;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\JsonResponse;
use PHPUnit\Framework\TestCase;

class PermanentRecordFormattingTest extends TestCase
{
    public function test_matches_configured_names_abbreviations_and_majors(): void
    {
        $programs = new RecordProgramAbbreviations([
            ['course_name' => 'Bachelor of Science in Information Technology', 'major' => null, 'course_name_abbreviation' => 'BSIT'],
            ['course_name' => 'Bachelor of Secondary Education', 'major' => 'English', 'course_name_abbreviation' => 'BSEd'],
        ]);

        self::assertSame('BSIT', $programs->resolve('  bachelor  OF science IN information technology  '));
        self::assertSame('BSIT', $programs->resolve('bsit'));
        self::assertSame('BSEd', $programs->resolve('Bachelor of Secondary Education MAJOR IN English'));
        self::assertSame('BSEd', $programs->resolve('bsed major in english'));
        self::assertNull($programs->resolve('Unlisted external program'));
        self::assertNull($programs->resolve(null));
        self::assertNull($programs->resolve(''));
    }

    public function test_does_not_guess_when_a_program_has_conflicting_abbreviations(): void
    {
        $programs = new RecordProgramAbbreviations([
            ['course_name' => 'Education', 'major' => 'English', 'course_name_abbreviation' => 'ED-ENG'],
            ['course_name' => 'Education', 'major' => 'Math', 'course_name_abbreviation' => 'ED-MATH'],
            ['course_name' => 'No abbreviation', 'course_name_abbreviation' => ''],
        ]);

        self::assertNull($programs->resolve('Education'));
        self::assertSame('ED-ENG', $programs->resolve('Education MAJOR IN English'));
        self::assertSame('ED-MATH', $programs->resolve('Education MAJOR IN Math'));
        self::assertNull($programs->resolve('No abbreviation'));
    }

    /** Executes the real controller using only SQLite :memory:, without booting Laravel or loading .env. */
    public function test_all_record_sources_include_abbreviations_and_preserve_dropped_grades(): void
    {
        $previousContainer = Container::getInstance();
        $previousResolver = Model::getConnectionResolver();
        $previousDispatcher = Model::getEventDispatcher();
        $container = new Container;
        Container::setInstance($container);
        $database = new Capsule($container);
        $database->addConnection(['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']);
        $database->bootEloquent();
        $container->instance(ResponseFactory::class, new class {
            public function json($data): JsonResponse
            {
                return new JsonResponse($data);
            }
        });

        try {
            $schema = $database->getConnection()->getSchemaBuilder();
            $tables = [
                'users' => ['user_id_no'],
                'user_information' => ['user_id', 'first_name', 'middle_name', 'last_name', 'suffix', 'nationality', 'gender', 'birthday', 'civil_status', 'contact_number', 'present_address', 'place_of_birth'],
                'user_parents' => ['user_id'],
                'preliminary_educations' => ['user_id'],
                'course' => ['course_name', 'major', 'course_name_abbreviation'],
                'semesters' => ['semester_name'],
                'school_years' => ['semester_id', 'start_year', 'end_year'],
                'year_section' => ['school_year_id', 'course_id'],
                'enrolled_students' => ['student_id', 'year_section_id'],
                'subjects' => ['subject_code', 'descriptive_title', 'credit_units'],
                'year_section_subjects' => ['subject_id'],
                'student_subjects' => ['enrolled_students_id', 'year_section_subjects_id', 'midterm_grade', 'final_grade', 'dropped'],
                'student_grades' => ['id_no', 'school_year', 'semester', 'program', 'major', 'subject_code', 'subject', 'grade', 'units'],
                'academic_records' => ['student_id', 'semester', 'school_year', 'program', 'major', 'school_name'],
                'academic_record_subjects' => ['academic_record_id', 'subject_code', 'descriptive_title', 'grade', 're_exam', 'units'],
            ];
            foreach ($tables as $table => $columns) {
                $schema->create($table, function (Blueprint $blueprint) use ($columns) {
                    $blueprint->increments('id');
                    foreach ($columns as $column) {
                        $blueprint->string($column)->nullable();
                    }
                });
            }

            $connection = $database->getConnection();
            $connection->table('users')->insert(['id' => 1, 'user_id_no' => 'TEST-001']);
            $fullName = 'Bachelor of Science in Information Technology';
            $connection->table('course')->insert(['id' => 1, 'course_name' => $fullName, 'course_name_abbreviation' => 'BSIT']);
            $connection->table('semesters')->insert(['id' => 1, 'semester_name' => 'First']);
            $connection->table('school_years')->insert(['id' => 2, 'semester_id' => 1, 'start_year' => 2025, 'end_year' => 2026]);
            $connection->table('year_section')->insert(['id' => 1, 'school_year_id' => 2, 'course_id' => 1]);
            $connection->table('enrolled_students')->insert(['id' => 1, 'student_id' => 1, 'year_section_id' => 1]);
            foreach ([
                [0, null, 0], [null, 0, 0], [null, null, 1], [null, null, 0], [2, 2, 0],
            ] as $offset => [$midterm, $final, $dropped]) {
                $id = $offset + 1;
                $connection->table('subjects')->insert(['id' => $id, 'subject_code' => "CURRENT-$id", 'descriptive_title' => "Test $id", 'credit_units' => 3]);
                $connection->table('year_section_subjects')->insert(['id' => $id, 'subject_id' => $id]);
                $connection->table('student_subjects')->insert(['enrolled_students_id' => 1, 'year_section_subjects_id' => $id, 'midterm_grade' => $midterm, 'final_grade' => $final, 'dropped' => $dropped]);
            }
            $connection->table('student_grades')->insert(['id_no' => 'TEST-001', 'school_year' => '2023-2024', 'semester' => 'first', 'program' => strtolower($fullName), 'subject_code' => 'IMPORTED', 'subject' => 'Imported subject', 'grade' => 'Dropped', 'units' => null]);
            $connection->table('academic_records')->insert(['id' => 1, 'student_id' => 1, 'semester' => 'second', 'school_year' => '2024-2025', 'program' => $fullName, 'school_name' => 'Test College']);
            $connection->table('academic_record_subjects')->insert(['academic_record_id' => 1, 'subject_code' => 'MANUAL', 'descriptive_title' => 'Manual subject', 'grade' => 'DRP', 'units' => 3]);

            $payload = (new FormNineController)->studentGrades(1)->getData(true);
            self::assertCount(3, $payload['enrollmentRecord']);
            foreach ($payload['enrollmentRecord'] as $record) {
                self::assertSame('BSIT', $record['course_name_abbreviation']);
                self::assertSame(strtolower($fullName), strtolower($record['program']));
            }
            self::assertSame('Dropped', $payload['enrollmentRecord'][0]['subjects'][0]['grade']);
            self::assertSame('DRP', $payload['enrollmentRecord'][1]['subjects'][0]['grade']);
            $subjects = $payload['enrollmentRecord'][2]['subjects'];
            self::assertSame('0.0', $subjects[0]['grade']);
            self::assertSame('0.0', $subjects[1]['grade']);
            self::assertSame('0.0', $subjects[2]['grade']);
            self::assertNull($subjects[3]['grade']);
            self::assertSame('2.0', $subjects[4]['grade']);
        } finally {
            $database->getConnection()->disconnect();
            if ($previousResolver) {
                Model::setConnectionResolver($previousResolver);
            } else {
                Model::unsetConnectionResolver();
            }
            if ($previousDispatcher) {
                Model::setEventDispatcher($previousDispatcher);
            } else {
                Model::unsetEventDispatcher();
            }
            Container::setInstance($previousContainer);
        }
    }
}
