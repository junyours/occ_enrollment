<?php

namespace Tests\Unit;

use App\Services\StudentCityCounts;
use Tests\TestCase;

/** Free-text address matching only; no database involved. */
class StudentCityCountsTest extends TestCase
{
    /** @dataProvider addresses */
    public function test_guesses_city_from_free_text_address(string $address, ?string $expectedCode): void
    {
        $this->assertSame($expectedCode, (new StudentCityCounts())->guessCityCode($address));
    }

    public static function addresses(): array
    {
        return [
            'structured style' => ['Zone 2, Patag, Opol, Misamis Oriental', '104321'],
            'no commas, upper case' => ['TINGALAN OPOL MISAMIS ORIENTAL', '104321'],
            'El Salvador is not Salvador (Lanao)' => ['Molugan, City Of El Salvador, Misamis Oriental', '104307'],
            'ELSALVADOR without space' => ['ZONE 1A TAYTAY ELSALVADOR MISAMIS ORIENTAL', '104307'],
            'CDO abbreviation' => ['BONBON, CDOC', '104305'],
            'Cagayan de Oro full name' => ['Carmen, Cagayan De Oro City', '104305'],
            'street named after a town, city last' => ['Magsaysay St, Patag, Opol', '104321'],
            'barangay only' => ['ZONE 4 PAGATPAT', null],
            'empty' => ['', null],
        ];
    }
}
