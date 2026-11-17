<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Counts enrolled students per city/municipality for a school year.
 *
 * Addresses live in two places:
 *  - user_present_address: structured (city, city_code, province), used first.
 *  - user_information.present_address: older free text. When a student has no
 *    structured address, the city is guessed from this text by matching known
 *    Northern Mindanao city/municipality names (the last one mentioned wins,
 *    since addresses are written "barangay, city, province").
 *
 * Students whose city can't be determined are counted as unspecified.
 */
class StudentCityCounts
{
    /** Region X (Northern Mindanao) — where nearly all OCC students live. */
    private const REGION = '10';

    /** Common abbreviations/spellings in free-text addresses => PSGC city code. */
    private const ALIASES = [
        'CDO' => '104305',
        'CDOC' => '104305',
        'CAGAYAN' => '104305',
        'ELSALVADOR' => '104307',
    ];

    /** @var array<string, array{city: string, province: string}>|null */
    private ?array $cities = null;

    /** @var array<string, string>|null  normalized name => city code */
    private ?array $matchers = null;

    /**
     * @return array{cities: list<array{city_code: string|null, city: string, province: string, total: int}>, unspecified: int}
     */
    public function forSchoolYear(int $schoolYearId): array
    {
        $rows = DB::table('enrolled_students')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->leftJoin('user_present_address as addr', 'addr.user_id', '=', 'enrolled_students.student_id')
            ->leftJoin('user_information as info', 'info.user_id', '=', 'enrolled_students.student_id')
            ->where('year_section.school_year_id', $schoolYearId)
            ->select('addr.city', 'addr.city_code', 'addr.province', 'info.present_address')
            ->get();

        $counts = [];
        $unspecified = 0;

        foreach ($rows as $row) {
            if (filled($row->city)) {
                $key = $row->city_code ?: $row->city;
                $counts[$key] ??= ['city_code' => $row->city_code, 'city' => $row->city, 'province' => (string) $row->province, 'total' => 0];
                $counts[$key]['total']++;
                continue;
            }

            $code = $this->guessCityCode((string) $row->present_address);
            if ($code === null) {
                $unspecified++;
                continue;
            }

            $city = $this->cities()[$code];
            $counts[$code] ??= ['city_code' => $code, 'city' => $city['city'], 'province' => $city['province'], 'total' => 0];
            $counts[$code]['total']++;
        }

        $cities = array_values($counts);
        usort($cities, fn ($a, $b) => [$b['total'], $a['city']] <=> [$a['total'], $b['city']]);

        return ['cities' => $cities, 'unspecified' => $unspecified];
    }

    /** Finds the city named last in a free-text address, or null. */
    public function guessCityCode(string $address): ?string
    {
        $text = $this->normalize($address);
        if ($text === '') {
            return null;
        }

        $bestCode = null;
        $bestEnd = -1;

        foreach ($this->matchers() as $name => $code) {
            if (preg_match_all('/(?<![A-Z])'.preg_quote($name, '/').'(?![A-Z])/', $text, $m, PREG_OFFSET_CAPTURE)) {
                $end = end($m[0])[1] + strlen($name);
                // The mention that ends last wins. Matchers are checked longest
                // first, so when one name sits inside another ("SALVADOR" in
                // "EL SALVADOR") the longer, more specific name is kept.
                if ($end > $bestEnd) {
                    $bestEnd = $end;
                    $bestCode = $code;
                }
            }
        }

        return $bestCode;
    }

    private function normalize(string $value): string
    {
        $value = strtoupper($value);
        $value = preg_replace('/[^A-Z]+/', ' ', $value);

        return trim(preg_replace('/\s+/', ' ', $value));
    }

    /** @return array<string, array{city: string, province: string}> */
    private function cities(): array
    {
        if ($this->cities !== null) {
            return $this->cities;
        }

        $dir = resource_path('js/Lib/PhilippinesAddressData');
        $provinces = collect(json_decode(file_get_contents($dir.'/province.json'), true))
            ->pluck('province_name', 'province_code');

        $this->cities = collect(json_decode(file_get_contents($dir.'/city.json'), true))
            ->where('region_desc', self::REGION)
            ->mapWithKeys(fn ($c) => [$c['city_code'] => [
                'city' => $c['city_name'],
                'province' => (string) ($provinces[$c['province_code']] ?? ''),
            ]])
            ->all();

        return $this->cities;
    }

    /** @return array<string, string> normalized name => city code, longest names first */
    private function matchers(): array
    {
        if ($this->matchers !== null) {
            return $this->matchers;
        }

        $matchers = [];
        foreach ($this->cities() as $code => $city) {
            $name = $this->normalize(preg_replace('/\(.*?\)/', '', $city['city']));
            $short = trim(preg_replace('/^CITY OF |\s+CITY$/', '', $name));

            foreach (array_unique([$name, $short]) as $variant) {
                if (strlen($variant) >= 4) {
                    $matchers[$variant] = $code;
                }
            }
        }

        foreach (self::ALIASES as $alias => $code) {
            $matchers[$alias] = $code;
        }

        uksort($matchers, fn ($a, $b) => strlen($b) <=> strlen($a));

        return $this->matchers = $matchers;
    }
}
