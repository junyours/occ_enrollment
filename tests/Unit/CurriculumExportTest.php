<?php

namespace Tests\Unit;

use App\Services\CurriculumExport;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

/** Printing (PDF) and exporting (Excel) one curriculum year. */
class CurriculumExportTest extends CurriculumTestCase
{
    private function url(string $year = '2024-2025', string $format = 'pdf'): string
    {
        return '/curriculum-export/'.md5('1')."/{$year}/{$format}";
    }

    protected function setUp(): void
    {
        parent::setUp();

        // IT201 requires IT102 and 2nd year standing.
        DB::table('pre_requisite_subjects')->insert(['curriculum_term_subjects_id' => $this->entries['IT201'], 'required_term_subject_id' => $this->entries['IT102']]);
        DB::table('curriculum_term_subjects')->where('id', $this->entries['IT201'])->update(['required_year_level_id' => 2]);
    }

    public function test_builds_years_semesters_subjects_and_totals(): void
    {
        $data = (new CurriculumExport())->build(1);

        $this->assertSame(['name' => 'BSIT', 'abbreviation' => 'BSIT', 'major' => null], $data['program']);
        $this->assertSame('2024–2025', $data['year_label']);
        $this->assertSame(['First Year', 'Second Year', 'Fourth Year'], array_column($data['years'], 'name'));
        $this->assertSame(['First Semester', 'Second Semester', 'Summer'], array_column($data['years'][0]['semesters'], 'name'));
        $this->assertSame(['IT101', 'MATH101'], array_column($data['years'][0]['semesters'][0]['subjects'], 'code'));
        $this->assertSame(['lec' => 6, 'lab' => 0, 'units' => 6], $data['years'][0]['semesters'][0]['totals']);

        $it201 = $data['years'][1]['semesters'][0]['subjects'][0];
        $this->assertSame(['IT201', 'IT102, 2nd Year Standing'], [$it201['code'], $it201['prerequisites']]);
        $this->assertSame('None', $data['years'][0]['semesters'][0]['subjects'][0]['prerequisites']);

        $this->assertSame(21, $data['total_units']);
        $this->assertSame(7, $data['total_subjects']);
    }

    public function test_pdf_opens_in_the_browser(): void
    {
        $response = $this->actingAs($this->programHead)->get($this->url())->assertOk();

        $this->assertSame('application/pdf', $response->headers->get('content-type'));
        $this->assertStringContainsString('inline; filename="BSIT Curriculum 2024-2025.pdf"', $response->headers->get('content-disposition'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_excel_download_contains_the_curriculum(): void
    {
        $response = $this->actingAs($this->programHead)->get($this->url(format: 'xlsx'))->assertOk();
        $this->assertStringContainsString('attachment; filename="BSIT Curriculum 2024-2025.xlsx"', $response->headers->get('content-disposition'));

        $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();
        $this->assertSame('BSIT 2024-2025', $sheet->getTitle());
        $this->assertSame('OPOL COMMUNITY COLLEGE', $sheet->getCell('A1')->getValue());

        $rows = collect($sheet->toArray(null, true, false, false));
        $it201 = $rows->first(fn ($row) => $row[0] === 'IT201');
        $this->assertSame(['IT201', 'IT201 title', 3, 0, 3, 'IT102, 2nd Year Standing'], $it201);

        // First semester total row (a SUM formula) and the grand total.
        $totals = $rows->filter(fn ($row) => $row[0] === 'Total')->values();
        $this->assertEquals(6, $totals[0][4]);
        $this->assertSame(21, $rows->first(fn ($row) => $row[0] === 'TOTAL UNITS')[4]);
    }

    public function test_other_department_cannot_export(): void
    {
        $otherHead = $this->makeUser('program_head', 'PH-2');
        DB::table('faculty')->insert(['faculty_id' => $otherHead->id, 'department_id' => 2]);

        $this->actingAs($otherHead)->get($this->url())->assertForbidden();
        $this->actingAs($otherHead)->get($this->url(format: 'xlsx'))->assertForbidden();
    }

    public function test_unknown_year_or_format_is_not_found(): void
    {
        $this->actingAs($this->programHead)->get($this->url('2030-2031'))->assertNotFound();
        $this->actingAs($this->programHead)->get($this->url(format: 'docx'))->assertNotFound();
    }
}
