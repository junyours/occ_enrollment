@php
    $pdfFormatMean = function ($value) {
        $n = is_numeric($value) ? (float) $value : null;

        if ($n === null) {
            return '0';
        }

        return rtrim(rtrim(number_format($n, 2), '0'), '.');
    };

    $pdfRatingInfo = function ($average) {
        $avg = is_numeric($average) ? (float) $average : 0;

        if ($avg >= 4.21 && $avg <= 5.00) {
            return [
                'score' => 5,
                'range' => '4.21 - 5.00',
                'description' => 'Excellent',
                'interpretation' => 'The teacher always exhibits the quality being rated.',
            ];
        }

        if ($avg >= 3.41 && $avg <= 4.20) {
            return [
                'score' => 4,
                'range' => '3.41 - 4.20',
                'description' => 'Very Good',
                'interpretation' => 'The teacher most of the time exhibits the quality being rated.',
            ];
        }

        if ($avg >= 2.61 && $avg <= 3.40) {
            return [
                'score' => 3,
                'range' => '2.61 - 3.40',
                'description' => 'Good',
                'interpretation' => 'The teacher sometimes exhibits the quality being rated.',
            ];
        }

        if ($avg >= 1.81 && $avg <= 2.60) {
            return [
                'score' => 2,
                'range' => '1.81 - 2.60',
                'description' => 'Fair',
                'interpretation' => 'The teacher seldom exhibits the quality being rated.',
            ];
        }

        if ($avg >= 1.00 && $avg <= 1.80) {
            return [
                'score' => 1,
                'range' => '1.00 - 1.80',
                'description' => 'Poor',
                'interpretation' => 'The teacher sometimes exhibits the quality being rated.',
            ];
        }

        return [
            'score' => '-',
            'range' => '-',
            'description' => 'No rating',
            'interpretation' => 'No interpretation available.',
        ];
    };

    $logoPath = resource_path('images/OCC_LOGO.png');
    $logoSrc = null;

    if (file_exists($logoPath)) {
        $logoSrc = 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath));
    }

    $strengthsList = collect($feedback ?? [])
        ->pluck('strengths')
        ->filter(fn ($item) => trim((string) $item) !== '')
        ->values();

    $weaknessesList = collect($feedback ?? [])
        ->pluck('weaknesses')
        ->filter(fn ($item) => trim((string) $item) !== '')
        ->values();

    $sentiments = collect(['positive', 'neutral', 'negative'])->map(function ($sentiment) use ($sentimentSummary) {
        $found = collect($sentimentSummary ?? [])->firstWhere('sentiment', $sentiment);

        return [
            'name' => $sentiment,
            'value' => $found ? (int) $found->total : 0,
        ];
    });

    $totalAnalyzed = $sentiments->sum('value');

    $strengthCategories = collect($analysisSummary ?? [])
        ->where('type', 'strength')
        ->sortByDesc('total')
        ->take(8)
        ->values();

    $weaknessCategories = collect($analysisSummary ?? [])
        ->where('type', 'weakness')
        ->sortByDesc('total')
        ->take(8)
        ->values();

    $departmentName =
        data_get($faculty, 'department.department_name')
        ?? data_get($faculty, 'department_name')
        ?? 'N/A';

    $overallRatingInfo = $pdfRatingInfo($overallAverage);
@endphp

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Faculty Evaluation Result</title>

    <style>
        @page {
            margin: 28px;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #1f2937;
            background: #ffffff;
        }

        h1, h2, h3, p {
            margin: 0;
        }

        .mb-4 {
            margin-bottom: 16px;
        }

        .mt-4 {
            margin-top: 16px;
        }

        .section {
            margin-top: 18px;
            padding: 14px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            background: #ffffff;
        }

        .header-box {
            position: relative;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 16px;
            min-height: 70px;
            text-align: center;
            margin-bottom: 14px;
        }

        .logo {
            position: absolute;
            top: 13px;
            left: 16px;
            width: 64px;
            height: 64px;
            object-fit: contain;
        }

        .header-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 4px;
        }

        .header-subtitle {
            font-size: 12px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 4px;
        }

        .header-small {
            font-size: 11px;
            color: #4b5563;
            margin-top: 2px;
        }

        .top-info {
            width: 100%;
            border-top: 1px solid #d1d5db;
            padding-top: 10px;
            margin-bottom: 14px;
        }

        .top-info table {
            width: 100%;
            border-collapse: collapse;
        }

        .top-info td {
            border: none;
            padding: 2px 4px;
            font-size: 11px;
        }

        .alert {
            padding: 12px;
            border: 1px solid #fca5a5;
            background: #fee2e2;
            color: #b91c1c;
            text-align: center;
            border-radius: 8px;
            margin-bottom: 14px;
        }

        .alert-title {
            font-weight: bold;
            margin-bottom: 4px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            background: #e5e7eb;
            color: #374151;
            text-transform: uppercase;
            font-size: 10px;
            font-weight: bold;
        }

        th, td {
            border: 1px solid #d1d5db;
            padding: 7px;
            vertical-align: top;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .font-bold {
            font-weight: bold;
        }

        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #1f2937;
            padding-bottom: 6px;
            margin-bottom: 10px;
            border-bottom: 1px solid #d1d5db;
        }

        .criteria-mean {
            text-align: right;
            margin-top: 8px;
            font-size: 11px;
        }

        .purple {
            color: #6d28d9;
            font-weight: bold;
        }

        .overall-box {
            margin-top: 18px;
            padding: 16px;
            border-radius: 10px;
            background: #ede9fe;
            border: 1px solid #ddd6fe;
        }

        .overall-left {
            float: left;
        }

        .overall-score {
            float: right;
            font-size: 34px;
            font-weight: bold;
            color: #6d28d9;
        }

        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }

        .grid-2 {
            width: 100%;
            margin-top: 18px;
        }

        .grid-2 td {
            width: 50%;
            border: none;
            padding: 0;
            vertical-align: top;
        }

        .grid-left {
            padding-right: 8px !important;
        }

        .grid-right {
            padding-left: 8px !important;
        }

        .mini-card {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 14px;
            background: #ffffff;
        }

        .muted {
            color: #6b7280;
        }

        .list {
            margin: 0;
            padding-left: 18px;
        }

        .list li {
            margin-bottom: 5px;
        }

        .recommendation-item {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px;
            margin-bottom: 8px;
        }

        .green-border {
            border-color: #bbf7d0;
        }

        .red-border {
            border-color: #fecaca;
        }

        .comments-section {
            margin-top: 18px;
            page-break-inside: auto;
        }

        .comments-card {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 14px;
            background: #ffffff;
            page-break-inside: auto;
        }

        .comments-card + .comments-card {
            margin-top: 18px;
        }

        .comments-title {
            font-size: 14px;
            font-weight: bold;
            color: #1f2937;
            padding-bottom: 6px;
            margin-bottom: 10px;
            border-bottom: 1px solid #d1d5db;
        }

        .comment-list {
            margin: 0;
            padding-left: 18px;
        }

        .comment-list li {
            margin-bottom: 5px;
            page-break-inside: avoid;
        }

        .page-break {
            page-break-before: always;
        }
    </style>
</head>

<body>
    {{-- Header --}}
    <div class="header-box">
        @if ($logoSrc)
            <img src="{{ $logoSrc }}" class="logo" alt="OCC Logo">
        @endif

        <div class="header-title">Summary Report</div>
        <div class="header-subtitle">Student's Assessment of Faculty Teaching Performance</div>
        <div class="header-small">{{ $schoolYear['formatted'] ?? '' }}</div>
        <div class="header-small">{{ $departmentName }}</div>
    </div>

    {{-- Faculty and Subject Info --}}
    <div class="top-info">
        <table>
            <tr>
                <td>
                    <strong>Name:</strong>
                    {{ data_get($faculty, 'first_name', '') }}
                    {{ data_get($faculty, 'last_name', '') }}
                </td>
                <td class="text-right">
                    <strong>Subject:</strong>
                    {{ data_get($subject, 'subject_code', '') }} -
                    {{ data_get($subject, 'descriptive_title', '') }}
                </td>
            </tr>
        </table>
    </div>

    {{-- Participation Rule Banner --}}
    @if (!$isValidEvaluation)
        <div class="alert">
            <div class="alert-title">Evaluation results are NOT yet valid.</div>
            <div>At least <strong>50%</strong> student participation is required.</div>
            <div>
                Current:
                <strong>{{ $totalRespondents }}</strong> /
                <strong>{{ $totalStudentsHandled }}</strong>
                (<strong>{{ number_format($responseRate * 100, 1) }}%</strong>)
            </div>
        </div>
    @endif

    {{-- Rating Legend --}}
    <div class="section">
        <table>
            <thead>
                <tr>
                    <th>Score</th>
                    <th>Mean Ranges</th>
                    <th>Description</th>
                    <th>Interpretation</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="text-center">5</td>
                    <td class="text-center">4.21 - 5.00</td>
                    <td class="font-bold">Excellent</td>
                    <td>The teacher always exhibits the quality being rated.</td>
                </tr>
                <tr>
                    <td class="text-center">4</td>
                    <td class="text-center">3.41 - 4.20</td>
                    <td class="font-bold">Very Good</td>
                    <td>The teacher most of the time exhibits the quality being rated.</td>
                </tr>
                <tr>
                    <td class="text-center">3</td>
                    <td class="text-center">2.61 - 3.40</td>
                    <td class="font-bold">Good</td>
                    <td>The teacher sometimes exhibits the quality being rated.</td>
                </tr>
                <tr>
                    <td class="text-center">2</td>
                    <td class="text-center">1.81 - 2.60</td>
                    <td class="font-bold">Fair</td>
                    <td>The teacher seldom exhibits the quality being rated.</td>
                </tr>
                <tr>
                    <td class="text-center">1</td>
                    <td class="text-center">1.00 - 1.80</td>
                    <td class="font-bold">Poor</td>
                    <td>The teacher sometimes exhibits the quality being rated.</td>
                </tr>
            </tbody>
        </table>
    </div>

    {{-- Criteria Breakdown --}}
    @forelse ($criteria as $criterion)
        <div class="section">
            <div class="section-title">{{ $criterion['criteria_title'] }}</div>

            <table>
                <thead>
                    <tr>
                        <th>Question</th>
                        <th class="text-center">Score</th>
                        <th class="text-center">Description</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($criterion['questions'] as $question)
                        @php
                            $rating = $pdfRatingInfo($question['average']);
                        @endphp

                        <tr>
                            <td>{{ $question['question_text'] }}</td>
                            <td class="text-center">
                                {{ $isValidEvaluation ? $pdfFormatMean($question['average']) : 'N/A' }}
                            </td>
                            <td class="text-center">
                                {{ $isValidEvaluation ? $rating['description'] : 'Insufficient responses' }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>

            <div class="criteria-mean">
                <strong>Criteria Mean:</strong>
                <span class="purple">
                    {{ $isValidEvaluation ? $pdfFormatMean($criterion['average']) : 'N/A' }}
                </span>
            </div>
        </div>
    @empty
        <div class="section muted">
            No evaluation data available.
        </div>
    @endforelse

    {{-- Overall Summary --}}
    <div class="clearfix overall-box">
        <div class="overall-left">
            <div class="font-bold">Overall Evaluation</div>
            <div class="muted">Student Assessment Summary</div>
        </div>

        <div class="overall-score">
            {{ $isValidEvaluation ? $pdfFormatMean($overallAverage) : 'N/A' }}
        </div>
    </div>

    {{-- Mean Per Category and Summary --}}
    <table class="grid-2">
        <tr>
            <td class="grid-left">
                <div class="mini-card">
                    <div class="section-title">Mean Per Category</div>

                    <table>
                        <thead>
                            <tr>
                                <th>Criteria</th>
                                <th class="text-center">Mean</th>
                                <th class="text-center">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($criteria as $criterion)
                                @php
                                    $rating = $pdfRatingInfo($criterion['average']);
                                @endphp

                                <tr>
                                    <td>{{ $criterion['criteria_title'] }}</td>
                                    <td class="text-center">
                                        {{ $isValidEvaluation ? $pdfFormatMean($criterion['average']) : 'N/A' }}
                                    </td>
                                    <td class="text-center">
                                        {{ $isValidEvaluation ? $rating['description'] : 'Insufficient responses' }}
                                    </td>
                                </tr>
                            @endforeach

                            <tr>
                                <td class="font-bold">Overall Average:</td>
                                <td class="font-bold text-center">
                                    {{ $isValidEvaluation ? $pdfFormatMean($overallAverage) : 'N/A' }}
                                </td>
                                <td class="font-bold text-center">
                                    {{ $isValidEvaluation ? $overallRatingInfo['description'] : 'Insufficient responses' }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </td>

            <td class="grid-right">
                <div class="mini-card">
                    <div class="section-title">Evaluation Summary</div>

                    <table>
                        <tr>
                            <td><strong>Total Respondents</strong></td>
                            <td class="text-center">{{ $totalRespondents }} / {{ $totalStudentsHandled }}</td>
                        </tr>
                        <tr>
                            <td><strong>Response Rate</strong></td>
                            <td class="text-center">{{ number_format($responseRate * 100, 1) }}%</td>
                        </tr>
                        <tr>
                            <td><strong>Status</strong></td>
                            <td class="text-center">
                                {{ $isValidEvaluation ? 'Valid' : 'Not Valid' }}
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Total Analyzed Feedback</strong></td>
                            <td class="text-center">{{ $totalAnalyzed }}</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

    {{-- Analyzed Results --}}
    <table class="grid-2">
        <tr>
            <td class="grid-left">
                <div class="mini-card">
                    <div class="section-title">Sentiment Summary (Analyzed)</div>

                    <table>
                        <tbody>
                            @foreach ($sentiments as $sentiment)
                                <tr>
                                    <td style="text-transform: capitalize;">{{ $sentiment['name'] }}</td>
                                    <td class="font-bold text-center">{{ $sentiment['value'] }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </td>

            <td class="grid-right">
                <div class="mini-card">
                    <div class="section-title">Top Improvement Recommendations</div>

                    @if (collect($topWeaknessRecommendations ?? [])->count() === 0)
                        <p class="muted">No recommendations yet.</p>
                    @else
                        @foreach ($topWeaknessRecommendations as $recommendation)
                            <div class="recommendation-item">
                                <div class="font-bold">
                                    {{ $recommendation->name }}
                                    <span class="muted">({{ $recommendation->total }})</span>
                                </div>
                                <div>{{ $recommendation->recommendation }}</div>
                            </div>
                        @endforeach
                    @endif
                </div>
            </td>
        </tr>
    </table>

    {{-- Strength and Weakness Categories --}}
    <table class="grid-2">
        <tr>
            <td class="grid-left">
                <div class="mini-card green-border">
                    <div class="section-title">Strength Categories (Analyzed)</div>

                    @if ($strengthCategories->count() === 0)
                        <p class="muted">No detected strength categories.</p>
                    @else
                        <table>
                            <tbody>
                                @foreach ($strengthCategories as $category)
                                    <tr>
                                        <td>{{ $category->category_name }}</td>
                                        <td class="font-bold text-center">{{ $category->total }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    @endif
                </div>
            </td>

            <td class="grid-right">
                <div class="mini-card red-border">
                    <div class="section-title">Weakness Categories (Analyzed)</div>

                    @if ($weaknessCategories->count() === 0)
                        <p class="muted">No detected weakness categories.</p>
                    @else
                        <table>
                            <tbody>
                                @foreach ($weaknessCategories as $category)
                                    <tr>
                                        <td>{{ $category->category_name }}</td>
                                        <td class="font-bold text-center">{{ $category->total }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    {{-- Strengths and Weaknesses --}}
    @if ($strengthsList->count() > 0 || $weaknessesList->count() > 0)
        <div class="comments-section">
            <div class="comments-card green-border">
                <div class="comments-title">Strengths</div>

                @if ($strengthsList->count() === 0)
                    <p class="muted">No strengths provided.</p>
                @else
                    <ul class="comment-list">
                        @foreach ($strengthsList as $strength)
                            <li>{{ $strength }}</li>
                        @endforeach
                    </ul>
                @endif
            </div>

            <div class="comments-card red-border">
                <div class="comments-title">Weaknesses</div>

                @if ($weaknessesList->count() === 0)
                    <p class="muted">No weaknesses provided.</p>
                @else
                    <ul class="comment-list">
                        @foreach ($weaknessesList as $weakness)
                            <li>{{ $weakness }}</li>
                        @endforeach
                    </ul>
                @endif
            </div>
        </div>
    @endif
</body>
</html>
