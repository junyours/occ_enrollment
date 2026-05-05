<?php

if (!function_exists('format_name')) {
    function format_name(array $user = [], array $options = []): string
    {
        $first = trim($user['first_name'] ?? '');
        $middle = trim($user['middle_name'] ?? '');
        $last = trim($user['last_name'] ?? '');

        $format = $options['format'] ?? 'FMI';
        $casing = $options['casing'] ?? 'capitalize';

        // Middle initial
        $mi = $middle ? strtoupper(substr($middle, 0, 1)) . '.' : '';

        // Formatting
        switch ($format) {
            case 'FULL':
                $fullName = implode(' ', array_filter([$first, $middle, $last]));
                break;

            case 'LFM':
                $firstPart = implode(' ', array_filter([$first, $mi]));
                $fullName = $last
                    ? $last . ($firstPart ? ', ' . $firstPart : '')
                    : $firstPart;
                break;

            default: // FMI
                $fullName = implode(' ', array_filter([$first, $mi, $last]));
        }

        // Casing
        if ($casing === 'upper') return strtoupper($fullName);
        if ($casing === 'lower') return strtolower($fullName);

        // Capitalize
        return collect(explode(' ', strtolower($fullName)))
            ->map(fn($word) => ucfirst($word))
            ->implode(' ');
    }
}
