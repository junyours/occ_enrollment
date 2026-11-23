<?php

namespace App\Http\Controllers;

use App\Models\SchoolYear;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * When teachers can upload midterm and final grades, per school year. The
 * registrar sets the opening and closing times on the Grade Submission page;
 * "Open now" and "Close now" just fill them in. Times are school time.
 */
class GradeUploadController extends Controller
{
    public function show(int $schoolYearId)
    {
        return response()->json($this->present(SchoolYear::findOrFail($schoolYearId)));
    }

    public function update(Request $request, int $schoolYearId)
    {
        $data = $request->validate([
            'period' => ['required', 'in:midterm,final'],
            'action' => ['nullable', 'in:open_now,close_now'],
            'opens_at' => ['nullable', 'date'],
            'closes_at' => ['nullable', 'date'],
        ]);

        $period = $data['period'];
        $label = ucfirst($period);

        $schoolYear = DB::transaction(function () use ($data, $period, $label, $schoolYearId) {
            $schoolYear = SchoolYear::whereKey($schoolYearId)->lockForUpdate()->firstOrFail();
            $now = now();
            $opens = "{$period}_upload_opens_at";
            $closes = "{$period}_upload_closes_at";

            if (($data['action'] ?? null) === 'open_now') {
                // Opens now; a closing time already past is cleared, so it
                // stays open until it's closed again.
                $schoolYear->{$opens} = $now;
                if ($schoolYear->{$closes} !== null && $schoolYear->{$closes}->lte($now)) {
                    $schoolYear->{$closes} = null;
                }
            } elseif (($data['action'] ?? null) === 'close_now') {
                if ($schoolYear->gradeUploadStatus($period, $now) !== 'open') {
                    throw ValidationException::withMessages(['action' => "{$label} grade upload isn’t open."]);
                }
                $schoolYear->{$closes} = $now;
            } else {
                $opensAt = $this->time($data['opens_at'] ?? null);
                $closesAt = $this->time($data['closes_at'] ?? null);

                if ($closesAt && ! $opensAt) {
                    throw ValidationException::withMessages(['opens_at' => 'Set when grade upload opens first.']);
                }
                if ($opensAt && $closesAt && $closesAt->lte($opensAt)) {
                    throw ValidationException::withMessages(['closes_at' => 'The closing time must be after the opening time.']);
                }

                $schoolYear->{$opens} = $opensAt;
                $schoolYear->{$closes} = $closesAt;
            }

            $schoolYear->save();

            return $schoolYear;
        });

        return response()->json($this->present($schoolYear));
    }

    // A time from the page's date-and-time field, read as school time.
    private function time(?string $value): ?Carbon
    {
        return $value === null || $value === '' ? null : Carbon::parse($value, config('app.timezone'));
    }

    private function present(SchoolYear $schoolYear): array
    {
        return [
            'school_year_id' => (int) $schoolYear->id,
            'time_zone' => config('app.timezone'),
            'periods' => $schoolYear->gradeUploadWindows(),
        ];
    }
}
