@php
    // Summary row values per year: units in each semester (by semester id), and the year total.
    $semesterUnits = function (array $year, int $semesterId) {
        foreach ($year['semesters'] as $semester) {
            if ($semester['semester_id'] === $semesterId) {
                return $semester['totals']['units'];
            }
        }
        return null;
    };
    $hasSummer = collect($years)->contains(fn ($year) => collect($year['semesters'])->contains('semester_id', 3));
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $program['abbreviation'] }} Curriculum {{ $year_label }}</title>
    <style>
        @page { margin: 30px 32px 46px 32px; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9.5px; color: #111827; }
        p { margin: 0; }

        .footer { position: fixed; bottom: -30px; left: 0; right: 0; font-size: 8px; color: #6b7280; border-top: 0.5px solid #d1d5db; padding-top: 4px; }
        .footer .page { float: right; }
        .footer .page:after { content: "Page " counter(page); }

        .header { position: relative; text-align: center; padding-bottom: 10px; margin-bottom: 4px; border-bottom: 1.5px solid #111827; }
        .logo { position: absolute; top: 0; left: 0; width: 58px; height: 58px; }
        .school { font-size: 14px; font-weight: bold; letter-spacing: 0.6px; }
        .address { font-size: 9.5px; color: #374151; margin-top: 1px; }
        .doc-title { font-size: 12.5px; font-weight: bold; letter-spacing: 2px; margin-top: 10px; }
        .program { font-size: 11px; font-weight: bold; margin-top: 3px; }
        .meta { font-size: 9.5px; color: #374151; margin-top: 1px; }

        .year { margin-top: 12px; padding: 4px 6px; background: #e5e7eb; font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; }
        .semester { margin-top: 7px; page-break-inside: avoid; }
        .semester-name { font-weight: bold; margin-bottom: 3px; }

        table { width: 100%; border-collapse: collapse; }
        th, td { border: 0.6px solid #9ca3af; padding: 2.5px 5px; vertical-align: top; }
        th { background: #f3f4f6; font-weight: bold; text-align: left; }
        .code { width: 14%; }
        .num { width: 6%; text-align: center; }
        .prereq { width: 24%; }
        .muted { color: #6b7280; }
        tr.total td { font-weight: bold; background: #fafafa; }
        .empty { color: #6b7280; font-style: italic; text-align: center; }

        .summary { margin-top: 16px; page-break-inside: avoid; }
        .summary h3 { font-size: 10.5px; margin: 0 0 4px; }
        .summary td, .summary th { text-align: center; }
        .summary td:first-child, .summary th:first-child { text-align: left; }
        .grand td { font-weight: bold; background: #f3f4f6; }
    </style>
</head>
<body>
    <div class="footer">
        {{ $program['abbreviation'] }} Curriculum, Effective School Year {{ $year_label }} · Printed {{ $printed_at }}
        <span class="page"></span>
    </div>

    <div class="header">
        @if ($logoSrc)
            <img src="{{ $logoSrc }}" class="logo" alt="OCC Logo">
        @endif
        <p class="school">{{ $school_name }}</p>
        <p class="address">{{ $school_address }}</p>
        <p class="doc-title">CURRICULUM</p>
        <p class="program">{{ $program['name'] }}</p>
        @if ($program['major'])
            <p class="meta">Major in {{ $program['major'] }}</p>
        @endif
        <p class="meta">Effective School Year {{ $year_label }}</p>
    </div>

    @foreach ($years as $year)
        <div class="year">{{ $year['name'] }}</div>

        @foreach ($year['semesters'] as $semester)
            <div class="semester">
                <p class="semester-name">{{ $semester['name'] }}</p>
                <table>
                    <thead>
                        <tr>
                            <th class="code">Course Code</th>
                            <th>Descriptive Title</th>
                            <th class="num">Lec</th>
                            <th class="num">Lab</th>
                            <th class="num">Units</th>
                            <th class="prereq">Pre-requisite(s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($semester['subjects'] as $subject)
                            <tr>
                                <td>{{ $subject['code'] }}</td>
                                <td>{{ $subject['title'] }}</td>
                                <td class="num">{{ $subject['lec'] }}</td>
                                <td class="num">{{ $subject['lab'] }}</td>
                                <td class="num">{{ $subject['units'] }}</td>
                                <td class="{{ $subject['prerequisites'] === 'None' ? 'muted' : '' }}">{{ $subject['prerequisites'] }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="6" class="empty">No subjects</td></tr>
                        @endforelse
                        <tr class="total">
                            <td colspan="2">Total</td>
                            <td class="num">{{ $semester['totals']['lec'] }}</td>
                            <td class="num">{{ $semester['totals']['lab'] }}</td>
                            <td class="num">{{ $semester['totals']['units'] }}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        @endforeach
    @endforeach

    <div class="summary">
        <h3>Summary of Units</h3>
        <table>
            <thead>
                <tr>
                    <th>Year Level</th>
                    <th>First Semester</th>
                    <th>Second Semester</th>
                    @if ($hasSummer)<th>Summer</th>@endif
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($years as $year)
                    <tr>
                        <td>{{ $year['name'] }}</td>
                        <td>{{ $semesterUnits($year, 1) ?? '—' }}</td>
                        <td>{{ $semesterUnits($year, 2) ?? '—' }}</td>
                        @if ($hasSummer)<td>{{ $semesterUnits($year, 3) ?? '—' }}</td>@endif
                        <td>{{ $year['units'] }}</td>
                    </tr>
                @endforeach
                <tr class="grand">
                    <td colspan="{{ $hasSummer ? 4 : 3 }}">Total units ({{ $total_subjects }} subjects)</td>
                    <td>{{ $total_units }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
</html>
