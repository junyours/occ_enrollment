<?php

namespace App\Support;

/** Match recorded program titles to the configured course abbreviations. */
class RecordProgramAbbreviations
{
    private array $aliases = [];

    public function __construct(iterable $courses)
    {
        foreach ($courses as $course) {
            $name = trim((string) ($course['course_name'] ?? ''));
            $abbreviation = trim((string) ($course['course_name_abbreviation'] ?? ''));
            $major = trim((string) ($course['major'] ?? ''));
            if ($abbreviation === '') {
                continue;
            }

            foreach (array_filter([$name, $abbreviation]) as $alias) {
                $this->aliases[$this->normalize($alias)][$abbreviation] = true;
                if ($major !== '') {
                    $this->aliases[$this->normalize("{$alias} MAJOR IN {$major}")][$abbreviation] = true;
                }
            }
        }
    }

    public function resolve(?string $program): ?string
    {
        $matches = array_keys($this->aliases[$this->normalize($program ?? '')] ?? []);

        // Keep the original title when there is no reliable, unique match.
        return count($matches) === 1 ? (string) $matches[0] : null;
    }

    private function normalize(string $value): string
    {
        return mb_strtolower(preg_replace('/\s+/u', ' ', trim($value)), 'UTF-8');
    }
}
