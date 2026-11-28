<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

/**
 * One curriculum year as a printable document: years, semesters, subjects (with
 * prerequisites and year standing) and unit totals. Used for both the PDF and the Excel file.
 */
class CurriculumExport
{
    public const SCHOOL_NAME = 'OPOL COMMUNITY COLLEGE';
    public const SCHOOL_ADDRESS = 'Opol, Misamis Oriental';

    private const SEMESTER_NAMES = [1 => 'First Semester', 2 => 'Second Semester', 3 => 'Summer'];
    private const ORDINAL = [1 => '1st', 2 => '2nd', 3 => '3rd', 4 => '4th'];

    /**
     * @return array{
     *     program: array{name: string, abbreviation: string, major: ?string},
     *     year_label: string, years: list<array>, total_units: int, total_subjects: int
     * }
     */
    public function build(int $curriculumId): array
    {
        $curriculum = DB::table('curriculum as c')
            ->join('course as co', 'co.id', '=', 'c.course_id')
            ->where('c.id', $curriculumId)
            ->first(['c.id', 'c.school_year_start', 'c.school_year_end', 'co.*']);

        $terms = DB::table('curriculum_term as t')
            ->leftJoin('year_level as y', 'y.id', '=', 't.year_level_id')
            ->leftJoin('semesters as m', 'm.id', '=', 't.semester_id')
            ->where('t.curriculum_id', $curriculumId)
            ->orderBy('t.year_level_id')->orderBy('t.semester_id')
            ->get(['t.id', 't.year_level_id', 't.semester_id', 'y.year_level_name']);

        $entries = DB::table('curriculum_term_subjects as e')
            ->join('subjects as s', 's.id', '=', 'e.subject_id')
            ->whereIn('e.curriculum_term_id', $terms->pluck('id'))
            ->orderBy('e.id')
            ->get(['e.id', 'e.curriculum_term_id', 'e.required_year_level_id', 'e.pre_requisite_name',
                's.subject_code', 's.descriptive_title', 's.credit_units', 's.lecture_hours', 's.laboratory_hours'])
            ->groupBy('curriculum_term_id');

        $prerequisiteCodes = DB::table('pre_requisite_subjects as p')
            ->join('curriculum_term_subjects as r', 'r.id', '=', 'p.required_term_subject_id')
            ->join('subjects as rs', 'rs.id', '=', 'r.subject_id')
            ->whereIn('p.curriculum_term_subjects_id', $entries->flatten()->pluck('id'))
            ->orderBy('rs.subject_code')
            ->get(['p.curriculum_term_subjects_id', 'rs.subject_code'])
            ->groupBy('curriculum_term_subjects_id')
            ->map(fn ($rows) => $rows->pluck('subject_code')->map(fn ($code) => trim($code))->all());

        $years = [];
        $totalUnits = 0;
        $totalSubjects = 0;
        foreach ($terms->groupBy('year_level_id') as $yearLevelId => $yearTerms) {
            $semesters = [];
            foreach ($yearTerms as $term) {
                $subjects = [];
                foreach ($entries[$term->id] ?? [] as $entry) {
                    $subjects[] = [
                        'code' => trim((string) $entry->subject_code),
                        'title' => trim((string) $entry->descriptive_title),
                        'lec' => (int) $entry->lecture_hours,
                        'lab' => (int) $entry->laboratory_hours,
                        'units' => (int) $entry->credit_units,
                        'prerequisites' => $this->prerequisiteText($entry, $prerequisiteCodes[$entry->id] ?? []),
                    ];
                }
                $totals = [
                    'lec' => array_sum(array_column($subjects, 'lec')),
                    'lab' => array_sum(array_column($subjects, 'lab')),
                    'units' => array_sum(array_column($subjects, 'units')),
                ];
                $totalUnits += $totals['units'];
                $totalSubjects += count($subjects);
                $semesters[] = [
                    'semester_id' => (int) $term->semester_id,
                    'name' => self::SEMESTER_NAMES[(int) $term->semester_id] ?? 'Semester',
                    'subjects' => $subjects,
                    'totals' => $totals,
                ];
            }
            $years[] = [
                'year_level_id' => (int) $yearLevelId,
                'name' => $yearTerms->first()->year_level_name ?: (self::ORDINAL[(int) $yearLevelId] ?? $yearLevelId).' Year',
                'semesters' => $semesters,
                'units' => array_sum(array_map(fn ($s) => $s['totals']['units'], $semesters)),
            ];
        }

        return [
            'program' => [
                'name' => (string) ($curriculum->course_name ?? ''),
                'abbreviation' => (string) ($curriculum->course_name_abbreviation ?? ''),
                'major' => ($curriculum->major ?? null) ?: null,
            ],
            'year_label' => "{$curriculum->school_year_start}–{$curriculum->school_year_end}",
            'years' => $years,
            'total_units' => $totalUnits,
            'total_subjects' => $totalSubjects,
        ];
    }

    /** "IT103, IT104-, 2nd Year Standing", the older free-text prerequisite, or "None". */
    private function prerequisiteText(object $entry, array $codes): string
    {
        $parts = $codes;
        if ($entry->required_year_level_id) {
            $parts[] = (self::ORDINAL[(int) $entry->required_year_level_id] ?? $entry->required_year_level_id).' Year Standing';
        }
        if ($parts === [] && trim((string) $entry->pre_requisite_name) !== '' && !preg_match('/^(none|null|n\/a|-|—)$/i', trim((string) $entry->pre_requisite_name))) {
            $parts[] = trim((string) $entry->pre_requisite_name);
        }

        return $parts === [] ? 'None' : implode(', ', $parts);
    }

    /** The same document as an Excel sheet, laid out for printing on A4. */
    public function spreadsheet(array $data): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $title = preg_replace('/[\\\\\/\?\*\[\]:]+/', ' ', trim("{$data['program']['abbreviation']} ".str_replace('–', '-', $data['year_label'])));
        $sheet->setTitle(mb_substr($title !== '' ? $title : 'Curriculum', 0, 31));

        foreach (['A' => 14, 'B' => 46, 'C' => 7, 'D' => 7, 'E' => 8, 'F' => 30] as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }
        $thin = ['borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '9CA3AF']]]];
        $center = ['alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]];

        $row = 1;
        $line = function (string $text, array $style = []) use ($sheet, &$row, $center) {
            $sheet->setCellValue("A{$row}", $text);
            $sheet->mergeCells("A{$row}:F{$row}");
            $sheet->getStyle("A{$row}")->applyFromArray(array_replace_recursive($center, $style));
            $row++;
        };

        $line(self::SCHOOL_NAME, ['font' => ['bold' => true, 'size' => 13]]);
        $line(self::SCHOOL_ADDRESS);
        $row++;
        $line('CURRICULUM', ['font' => ['bold' => true, 'size' => 12]]);
        $line($data['program']['name'], ['font' => ['bold' => true]]);
        if ($data['program']['major']) {
            $line('Major in '.$data['program']['major']);
        }
        $line('Effective School Year '.$data['year_label']);
        $row++;

        foreach ($data['years'] as $year) {
            $sheet->setCellValue("A{$row}", mb_strtoupper($year['name']));
            $sheet->mergeCells("A{$row}:F{$row}");
            $sheet->getStyle("A{$row}")->applyFromArray([
                'font' => ['bold' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']],
            ]);
            $row++;

            foreach ($year['semesters'] as $semester) {
                $sheet->setCellValue("A{$row}", $semester['name']);
                $sheet->getStyle("A{$row}")->getFont()->setBold(true);
                $row++;

                $sheet->fromArray(['Course Code', 'Descriptive Title', 'Lec', 'Lab', 'Units', 'Pre-requisite(s)'], null, "A{$row}");
                $sheet->getStyle("A{$row}:F{$row}")->applyFromArray($thin + [
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F3F4F6']],
                ]);
                $sheet->getStyle("C{$row}:E{$row}")->applyFromArray($center);
                $row++;

                $first = $row;
                foreach ($semester['subjects'] as $subject) {
                    $sheet->setCellValueExplicit("A{$row}", $subject['code'], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                    $sheet->setCellValue("B{$row}", $subject['title']);
                    $sheet->setCellValue("C{$row}", $subject['lec']);
                    $sheet->setCellValue("D{$row}", $subject['lab']);
                    $sheet->setCellValue("E{$row}", $subject['units']);
                    $sheet->setCellValue("F{$row}", $subject['prerequisites']);
                    $row++;
                }
                $last = $row - 1;

                $sheet->setCellValue("A{$row}", 'Total');
                if ($last >= $first) {
                    foreach (['C', 'D', 'E'] as $column) {
                        $sheet->setCellValue("{$column}{$row}", "=SUM({$column}{$first}:{$column}{$last})");
                    }
                } else {
                    $sheet->fromArray([0, 0, 0], null, "C{$row}");
                }
                $sheet->getStyle("A{$row}:F{$row}")->getFont()->setBold(true);

                $sheet->getStyle("A".($first - 1).":F{$row}")->applyFromArray($thin);
                $sheet->getStyle("C{$first}:E{$row}")->applyFromArray($center);
                $sheet->getStyle("B{$first}:B{$row}")->getAlignment()->setWrapText(true);
                $sheet->getStyle("F{$first}:F{$row}")->getAlignment()->setWrapText(true);
                $row += 2;
            }
        }

        $sheet->setCellValue("A{$row}", 'TOTAL UNITS');
        $sheet->setCellValue("E{$row}", $data['total_units']);
        $sheet->getStyle("A{$row}:F{$row}")->getFont()->setBold(true);
        $sheet->getStyle("E{$row}")->applyFromArray($center);

        $sheet->getPageSetup()
            ->setPaperSize(PageSetup::PAPERSIZE_A4)
            ->setOrientation(PageSetup::ORIENTATION_PORTRAIT)
            ->setFitToWidth(1)
            ->setFitToHeight(0);

        return $spreadsheet;
    }
}
