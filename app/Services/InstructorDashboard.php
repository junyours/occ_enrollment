<?php

namespace App\Services;

use App\Models\SchoolYear;
use App\Notifications\AbsenceNotice;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Closure;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * A teacher's dashboard for the current semester: today's meetings, work
 * waiting on them, students close to being dropped for absences, and a
 * summary of each class. Regular classes and NSTP classes both count; NSTP
 * classes have no attendance or classwork.
 */
class InstructorDashboard
{
    /** At this school, this many absences in a row gets a student dropped. */
    public const DROP_AFTER = 3;

    /** Students are listed from this many absences in a row: one before the limit. */
    public const WARN_AT = self::DROP_AFTER - 1;

    private CarbonImmutable $now;

    public function build(int $teacherId, ?CarbonInterface $now = null): array
    {
        $this->now = CarbonImmutable::instance($now ?? now())->setTimezone(config('app.timezone'));

        $schoolYear = SchoolYear::query()
            ->leftJoin('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->where('school_years.is_current', 1)
            ->select('school_years.*', 'semesters.semester_name')
            ->first();

        $dashboard = [
            'school_year' => $schoolYear ? [
                'id' => (int) $schoolYear->id,
                'start_year' => $schoolYear->start_year,
                'end_year' => $schoolYear->end_year,
                'semester' => $schoolYear->semester_name,
            ] : null,
            'now' => $this->now->toIso8601String(),
            'drop_after' => self::DROP_AFTER,
            'today' => [],
            'todo' => [],
            'watch' => [],
            'classes' => [],
        ];

        if (! $schoolYear) {
            return $dashboard;
        }

        $classes = $this->classes($teacherId, (int) $schoolYear->id);

        if ($classes->isEmpty()) {
            return $dashboard;
        }

        $regularIds = $classes->where('kind', 'regular')->pluck('id')->all();
        $nstpIds = $classes->where('kind', 'nstp')->pluck('id')->all();

        $students = $this->studentCounts($regularIds, $nstpIds);
        [$rates, $runs] = $this->attendance($regularIds);
        $toGrade = $this->toGrade($regularIds);
        $unmarked = $this->unmarkedMeetings($regularIds);

        [$today, $shownToday] = $this->today($classes, $unmarked);
        $watch = $this->watch($runs, $classes);

        $todo = [
            ...$this->gradeTasks($schoolYear, $classes, $students),
            ...$toGrade->map(fn($row) => [
                'type' => 'to_grade',
                'class' => $this->ref($classes->get('regular:' . $row->class_id)),
                'assignment_id' => (int) $row->id,
                'title' => $row->title ?: $row->assessment_name,
                'count' => (int) $row->waiting,
            ])->all(),
            ...$unmarked
                ->reject(fn($row) => in_array((int) $row->id, $shownToday, true))
                ->map(fn($row) => [
                    'type' => 'attendance',
                    'class' => $this->ref($classes->get('regular:' . $row->class_id)),
                    'session_id' => (int) $row->id,
                    'date' => $row->attendance_date,
                    'number' => (int) $row->session_number,
                    'count' => (int) $row->unmarked,
                ])->values()->all(),
        ];

        $atRisk = collect($watch)->countBy(fn($row) => $row['class']['key']);
        $waiting = $toGrade->groupBy('class_id')->map(fn($rows) => $rows->sum('waiting'));

        $dashboard['today'] = $today;
        $dashboard['todo'] = $todo;
        $dashboard['watch'] = $watch;
        $dashboard['classes'] = $classes->map(fn($class) => [
            ...$this->ref($class),
            'code' => $class['code'],
            'students' => $students[$class['key']] ?? 0,
            'attendance_rate' => $class['kind'] === 'regular' ? ($rates[$class['id']] ?? null) : null,
            'to_grade' => $class['kind'] === 'regular' ? (int) $waiting->get($class['id'], 0) : 0,
            'at_risk' => $atRisk->get($class['key'], 0),
            'next' => $this->nextMeeting($class),
        ])
            // Soonest next meeting first; classes with no schedule last.
            ->sortBy([
                fn($a, $b) => [$a['next'] === null, $a['next']['date'] ?? '', $a['next']['start'] ?? '99:99']
                    <=> [$b['next'] === null, $b['next']['date'] ?? '', $b['next']['start'] ?? '99:99'],
                ['title', 'asc'],
                ['section', 'asc'],
            ])
            ->values()
            ->all();

        return $dashboard;
    }

    /**
     * What a teacher needs to send a student an absence notice: the student,
     * their class, and their current absences in a row. Null when there's no
     * such enrollment.
     */
    public function absenceNotice(int $studentSubjectId, ?CarbonInterface $now = null): ?array
    {
        $this->now = CarbonImmutable::instance($now ?? now())->setTimezone(config('app.timezone'));

        $row = DB::table('student_subjects as ss')
            ->join('enrolled_students as e', 'e.id', '=', 'ss.enrolled_students_id')
            ->join('year_section_subjects as ys', 'ys.id', '=', 'ss.year_section_subjects_id')
            ->join('subjects as sub', 'sub.id', '=', 'ys.subject_id')
            ->join('year_section as sec', 'sec.id', '=', 'ys.year_section_id')
            ->join('course as c', 'c.id', '=', 'sec.course_id')
            ->where('ss.id', $studentSubjectId)
            ->first([
                'ss.dropped',
                'e.student_id',
                'ys.id as class_id',
                'ys.faculty_id',
                'sub.descriptive_title',
                'sec.year_level_id',
                'sec.section',
                'c.course_name_abbreviation',
            ]);

        if (! $row) {
            return null;
        }

        $dates = $this->absenceRun($studentSubjectId);

        return [
            'student_id' => (int) $row->student_id,
            'teacher_id' => $row->faculty_id === null ? null : (int) $row->faculty_id,
            'dropped' => (int) $row->dropped === 1,
            'class_id' => (int) $row->class_id,
            'class_title' => $row->descriptive_title,
            'section' => $row->course_name_abbreviation . '-' . $row->year_level_id . $row->section,
            'dates' => $dates,
            'notified_at' => $dates === []
                ? null
                : $this->noticeSince($this->latestNotices([$studentSubjectId])->get($studentSubjectId), end($dates)),
        ];
    }

    /** One student's absences in a row at the end of their record, as in attendance(). */
    private function absenceRun(int $studentSubjectId): array
    {
        $marks = DB::table('attendance_records as r')
            ->join('attendance_sessions as s', 's.id', '=', 'r.attendance_session_id')
            ->where('r.student_subject_id', $studentSubjectId)
            ->where('s.status', '!=', 'cancelled')
            ->where('s.attendance_date', '<=', $this->now->toDateString())
            ->whereNotNull('r.status')
            ->orderBy('s.attendance_date')
            ->orderBy('s.session_number')
            ->orderBy('s.id')
            ->get(['s.attendance_date', 'r.status']);

        $dates = [];

        foreach ($marks as $mark) {
            $dates = $mark->status === 'absent'
                ? [...$dates, substr((string) $mark->attendance_date, 0, 10)]
                : [];
        }

        return $dates;
    }

    /** When each student was last sent an absence notice. */
    private function latestNotices(array $studentSubjectIds): Collection
    {
        return DB::table('notifications')
            ->where('type', AbsenceNotice::TYPE)
            ->where('subject_type', 'student_subject')
            ->whereIn('subject_id', $studentSubjectIds)
            ->groupBy('subject_id')
            ->selectRaw('subject_id, max(created_at) as sent_at')
            ->pluck('sent_at', 'subject_id');
    }

    /**
     * A notice still counts if it was sent on or after the latest absence,
     * so the student hasn't missed another meeting since.
     */
    private function noticeSince(?string $sentAt, string $lastAbsence): ?string
    {
        if ($sentAt === null) {
            return null;
        }

        $sent = CarbonImmutable::parse($sentAt, config('app.timezone'));

        return $sent->toDateString() >= $lastAbsence ? $sent->toIso8601String() : null;
    }

    /**
     * The teacher's classes this semester with their weekly meetings, keyed
     * "regular:{id}" or "nstp:{id}". A regular class may meet a second time
     * (its secondary schedule); an NSTP class is a section schedule.
     */
    private function classes(int $teacherId, int $schoolYearId): Collection
    {
        $regular = DB::table('year_section_subjects as ys')
            ->join('subjects as sub', 'sub.id', '=', 'ys.subject_id')
            ->join('year_section as sec', 'sec.id', '=', 'ys.year_section_id')
            ->join('course as c', 'c.id', '=', 'sec.course_id')
            ->leftJoin('rooms as r', 'r.id', '=', 'ys.room_id')
            ->where('ys.faculty_id', $teacherId)
            ->where('sec.school_year_id', $schoolYearId)
            ->select(
                'ys.id',
                'ys.day',
                'ys.start_time',
                'ys.end_time',
                'sub.subject_code',
                'sub.descriptive_title',
                'sec.year_level_id',
                'sec.section',
                'c.course_name_abbreviation',
                'r.room_name',
            )
            ->get();

        $secondary = DB::table('subject_secondary_schedule as two')
            ->leftJoin('rooms as r', 'r.id', '=', 'two.room_id')
            ->whereIn('two.year_section_subjects_id', $regular->pluck('id'))
            ->select('two.year_section_subjects_id', 'two.day', 'two.start_time', 'two.end_time', 'r.room_name')
            ->orderBy('two.id')
            ->get()
            ->groupBy('year_section_subjects_id');

        $classes = $regular->map(fn($row) => [
            'key' => 'regular:' . $row->id,
            'id' => (int) $row->id,
            'kind' => 'regular',
            'hash' => hash('sha256', (string) $row->id),
            'title' => $row->descriptive_title,
            'code' => $row->subject_code,
            'section' => $row->course_name_abbreviation . '-' . $row->year_level_id . $row->section,
            'meetings' => $this->meetings([$row, ...$secondary->get($row->id, collect())->all()]),
        ]);

        $nstp = DB::table('nstp_section_schedules as nss')
            ->join('nstp_sections as ns', 'ns.id', '=', 'nss.nstp_section_id')
            ->join('nstp_components as comp', 'comp.id', '=', 'ns.nstp_component_id')
            ->leftJoin('rooms as r', 'r.id', '=', 'nss.room_id')
            ->where('nss.faculty_id', $teacherId)
            ->where('ns.school_year_id', $schoolYearId)
            ->select('nss.id', 'nss.day', 'nss.start_time', 'nss.end_time', 'ns.section', 'comp.component_name', 'r.room_name')
            ->get()
            ->map(fn($row) => [
                'key' => 'nstp:' . $row->id,
                'id' => (int) $row->id,
                'kind' => 'nstp',
                // The NSTP class page looks the class up by its schedule.
                'hash' => hash('sha256', (string) $row->id),
                'title' => 'NSTP-' . strtoupper($row->component_name),
                'code' => null,
                'section' => 'Section ' . $row->section,
                'meetings' => $this->meetings([$row]),
            ]);

        return $classes->concat($nstp)
            ->sortBy([['title', 'asc'], ['section', 'asc']])
            ->keyBy('key');
    }

    /** Weekly meetings whose days are known. Times are "HH:MM", or null when TBA. */
    private function meetings(array $rows): array
    {
        $meetings = [];

        foreach ($rows as $row) {
            $days = $this->days($row->day);

            if ($days !== []) {
                $meetings[] = [
                    'days' => $days,
                    'start' => $this->clock($row->start_time),
                    'end' => $this->clock($row->end_time),
                    'room' => $row->room_name,
                ];
            }
        }

        return $meetings;
    }

    /**
     * The weekdays (0 = Sunday) a schedule's day covers, read the way the
     * attendance tab reads it: "Monday", "Mon,Wed,Fri", "Monday-Thursday",
     * or none for "TBA".
     */
    private function days(?string $text): array
    {
        $text = strtolower(str_replace(['–', '—'], '-', (string) $text));
        $pattern = '/\b(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?)\b/';
        $numbers = ['sun' => 0, 'mon' => 1, 'tue' => 2, 'wed' => 3, 'thu' => 4, 'fri' => 5, 'sat' => 6];

        preg_match_all($pattern, $text, $matches, PREG_OFFSET_CAPTURE);
        $tokens = $matches[0];
        $days = array_map(fn($token) => $numbers[substr($token[0], 0, 3)], $tokens);

        if (count($days) === 2) {
            $afterFirst = $tokens[0][1] + strlen($tokens[0][0]);
            $between = substr($text, $afterFirst, $tokens[1][1] - $afterFirst);

            if (preg_match('/^\s*(?:-|to)\s*$/', $between)) {
                $range = [];

                for ($day = $days[0]; count($range) < 7; $day = ($day + 1) % 7) {
                    $range[] = $day;

                    if ($day === $days[1]) {
                        break;
                    }
                }

                return $range;
            }
        }

        return array_values(array_unique($days));
    }

    /** "7:30", "07:30:00" or "1:00 PM" as "HH:MM"; null when it isn't a time (TBA). */
    private function clock(?string $value): ?string
    {
        if (! preg_match('/^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?\s*$/i', (string) $value, $parts)) {
            return null;
        }

        $hour = (int) $parts[1];
        $suffix = strtolower($parts[3][0] ?? '');

        if ($suffix === 'p' && $hour < 12) {
            $hour += 12;
        } elseif ($suffix === 'a' && $hour === 12) {
            $hour = 0;
        }

        return $hour > 23 || (int) $parts[2] > 59 ? null : sprintf('%02d:%s', $hour, $parts[2]);
    }

    /** Students still in a class: not dropped. */
    private static function enrolled(string $alias): Closure
    {
        return fn($query) => $query->whereNull("{$alias}.dropped")->orWhere("{$alias}.dropped", 0);
    }

    /** Students in each class, keyed like the classes. */
    private function studentCounts(array $regularIds, array $nstpIds): array
    {
        $counts = [];

        $regular = DB::table('student_subjects as ss')
            ->join('enrolled_students as e', 'e.id', '=', 'ss.enrolled_students_id')
            ->whereIn('ss.year_section_subjects_id', $regularIds)
            ->where(self::enrolled('ss'))
            ->groupBy('ss.year_section_subjects_id')
            ->selectRaw('ss.year_section_subjects_id as class_id, count(*) as total')
            ->get();

        foreach ($regular as $row) {
            $counts['regular:' . $row->class_id] = (int) $row->total;
        }

        $nstp = DB::table('student_subject_nstp_schedule as link')
            ->join('student_subjects as ss', 'ss.id', '=', 'link.student_subject_id')
            ->whereIn('link.nstp_section_schedule_id', $nstpIds)
            ->where(self::enrolled('ss'))
            ->groupBy('link.nstp_section_schedule_id')
            ->selectRaw('link.nstp_section_schedule_id as class_id, count(*) as total')
            ->get();

        foreach ($nstp as $row) {
            $counts['nstp:' . $row->class_id] = (int) $row->total;
        }

        return $counts;
    }

    /**
     * Each class's attendance rate, and each student's absences in a row at
     * the end of their record. Present, late and excused end a run; an
     * unmarked meeting counts neither way; cancelled meetings don't count.
     *
     * @return array{0: array<int, int>, 1: array<int, array{class_id: int, dates: string[]}>}
     */
    private function attendance(array $classIds): array
    {
        $marks = DB::table('attendance_records as r')
            ->join('attendance_sessions as s', 's.id', '=', 'r.attendance_session_id')
            ->join('student_subjects as ss', 'ss.id', '=', 'r.student_subject_id')
            ->whereIn('s.year_section_subject_id', $classIds)
            ->where('s.status', '!=', 'cancelled')
            ->where('s.attendance_date', '<=', $this->now->toDateString())
            ->whereNotNull('r.status')
            ->where(self::enrolled('ss'))
            ->orderBy('s.attendance_date')
            ->orderBy('s.session_number')
            ->orderBy('s.id')
            ->select('r.student_subject_id', 's.year_section_subject_id as class_id', 's.attendance_date', 'r.status')
            ->get();

        $tally = [];
        $runs = [];

        foreach ($marks as $mark) {
            $classId = (int) $mark->class_id;
            $studentId = (int) $mark->student_subject_id;
            $tally[$classId] ??= ['attended' => 0, 'counted' => 0];

            if ($mark->status !== 'excused') {
                $tally[$classId]['counted']++;
                $tally[$classId]['attended'] += $mark->status === 'absent' ? 0 : 1;
            }

            if ($mark->status === 'absent') {
                $runs[$studentId] ??= ['class_id' => $classId, 'dates' => []];
                $runs[$studentId]['dates'][] = substr((string) $mark->attendance_date, 0, 10);
            } else {
                unset($runs[$studentId]);
            }
        }

        $rates = array_map(
            fn($row) => $row['counted'] > 0 ? (int) round($row['attended'] / $row['counted'] * 100) : null,
            $tally,
        );

        return [
            array_filter($rates, fn($rate) => $rate !== null),
            array_filter($runs, fn($run) => count($run['dates']) >= self::WARN_AT),
        ];
    }

    /** Students with absences in a row, longest run first. */
    private function watch(array $runs, Collection $classes): array
    {
        if ($runs === []) {
            return [];
        }

        // The latest profile, in case old profile rows remain.
        $profiles = DB::table('user_information')
            ->select('user_id')
            ->selectRaw('MAX(id) as id')
            ->groupBy('user_id');

        $people = DB::table('student_subjects as ss')
            ->join('enrolled_students as e', 'e.id', '=', 'ss.enrolled_students_id')
            ->join('users as u', 'u.id', '=', 'e.student_id')
            ->leftJoinSub($profiles, 'profile', 'profile.user_id', '=', 'u.id')
            ->leftJoin('user_information as ui', 'ui.id', '=', 'profile.id')
            ->whereIn('ss.id', array_keys($runs))
            ->select(
                'ss.id',
                'u.user_id_no',
                'u.email as account_email',
                'ui.first_name',
                'ui.middle_name',
                'ui.last_name',
                'ui.email_address',
                'ui.contact_number',
            )
            ->get()
            ->keyBy('id');

        $notices = $this->latestNotices(array_keys($runs));
        $list = [];

        foreach ($runs as $studentSubjectId => $run) {
            $person = $people->get($studentSubjectId);
            $class = $classes->get('regular:' . $run['class_id']);

            if (! $person || ! $class) {
                continue;
            }

            // What the student would receive, for the teacher to read first.
            $message = (new AbsenceNotice($studentSubjectId, $class['id'], $class['title'], $class['section'], $run['dates'], []))
                ->toArray(new \stdClass());

            $list[] = [
                'student_subject_id' => $studentSubjectId,
                'id_no' => $person->user_id_no,
                'first_name' => $person->first_name,
                'middle_name' => $person->middle_name,
                'last_name' => $person->last_name,
                'class' => $this->ref($class),
                'absences' => count($run['dates']),
                'dates' => $run['dates'],
                'last_absence' => $run['dates'][array_key_last($run['dates'])],
                'reached_limit' => count($run['dates']) >= self::DROP_AFTER,
                // Their teacher can reach them; the class roster shows the same.
                'email' => $person->email_address ?: $person->account_email,
                'phone' => $person->contact_number ?: null,
                'notified_at' => $this->noticeSince($notices->get($studentSubjectId), $run['dates'][array_key_last($run['dates'])]),
                'notice' => ['title' => $message['title'], 'body' => $message['body']],
            ];
        }

        // Longest run first, then the most recent absence, then by name.
        usort($list, fn($a, $b) => [$b['absences'], $b['last_absence'], $a['last_name'], $a['first_name']]
            <=> [$a['absences'], $a['last_absence'], $b['last_name'], $b['first_name']]);

        return $list;
    }

    /** Assignments with turned-in work that has no score yet, oldest first. */
    private function toGrade(array $classIds): Collection
    {
        return DB::table('class_submissions as sub')
            ->join('class_assignments as ca', 'ca.id', '=', 'sub.assignment_id')
            ->join('assessments as a', 'a.id', '=', 'ca.assessment_id')
            ->join('grading_categories as gc', 'gc.id', '=', 'a.grading_category_id')
            ->join('student_subjects as ss', 'ss.id', '=', 'sub.student_subject_id')
            ->join('enrolled_students as e', 'e.id', '=', 'ss.enrolled_students_id')
            ->leftJoin('assessment_scores as sc', function ($join) {
                $join->on('sc.assessment_id', '=', 'ca.assessment_id')
                    ->on('sc.student_subject_id', '=', 'sub.student_subject_id')
                    ->whereNull('sc.deleted_at');
            })
            ->whereIn('ca.year_section_subject_id', $classIds)
            ->whereColumn('ss.year_section_subjects_id', 'ca.year_section_subject_id')
            ->whereNull('a.deleted_at')
            ->whereNull('gc.deleted_at')
            ->whereNotNull('sub.submitted_at')
            ->whereNull('sc.score')
            ->where(self::enrolled('ss'))
            ->groupBy('ca.id', 'ca.year_section_subject_id', 'ca.title', 'a.name')
            ->selectRaw('ca.id, ca.year_section_subject_id as class_id, ca.title, a.name as assessment_name')
            ->selectRaw('count(*) as waiting, min(sub.submitted_at) as oldest')
            ->orderBy('oldest')
            ->orderBy('ca.id')
            ->get();
    }

    /** Started meetings up to today where some students aren't marked yet, newest first. */
    private function unmarkedMeetings(array $classIds): Collection
    {
        return DB::table('attendance_sessions as s')
            ->join('attendance_records as r', 'r.attendance_session_id', '=', 's.id')
            ->join('student_subjects as ss', 'ss.id', '=', 'r.student_subject_id')
            ->whereIn('s.year_section_subject_id', $classIds)
            ->where('s.status', 'open')
            ->whereNull('s.locked_at')
            ->where('s.attendance_date', '<=', $this->now->toDateString())
            ->whereNull('r.status')
            ->where(self::enrolled('ss'))
            ->groupBy('s.id', 's.year_section_subject_id', 's.attendance_date', 's.session_number')
            ->selectRaw('s.id, s.year_section_subject_id as class_id, s.attendance_date, s.session_number, count(*) as unmarked')
            ->orderByDesc('s.attendance_date')
            ->orderByDesc('s.session_number')
            ->get()
            ->each(fn($row) => $row->attendance_date = substr((string) $row->attendance_date, 0, 10));
    }

    /**
     * Today's meetings in time order, each with where its attendance stands,
     * and the ids of the meetings' attendance records shown there. A class's
     * meetings today are matched in order with its attendance meetings today.
     */
    private function today(Collection $classes, Collection $unmarked): array
    {
        $weekday = $this->now->dayOfWeek;
        $clock = $this->now->format('H:i');
        $classIds = $classes->where('kind', 'regular')->pluck('id')->all();

        $sessions = DB::table('attendance_sessions as s')
            ->leftJoin('attendance_records as r', 'r.attendance_session_id', '=', 's.id')
            ->leftJoin('student_subjects as ss', 'ss.id', '=', 'r.student_subject_id')
            ->whereIn('s.year_section_subject_id', $classIds)
            ->where('s.attendance_date', $this->now->toDateString())
            ->groupBy('s.id', 's.year_section_subject_id', 's.session_number', 's.status')
            ->select('s.id', 's.year_section_subject_id as class_id', 's.session_number', 's.status')
            ->selectRaw('COUNT(r.id) as records')
            ->selectRaw("SUM(CASE WHEN ss.id IS NOT NULL AND (ss.dropped IS NULL OR ss.dropped = 0) AND r.status IN ('present', 'late') THEN 1 ELSE 0 END) as present")
            ->selectRaw("SUM(CASE WHEN ss.id IS NOT NULL AND (ss.dropped IS NULL OR ss.dropped = 0) AND r.status = 'absent' THEN 1 ELSE 0 END) as absent")
            ->orderBy('s.session_number')
            ->get()
            ->groupBy('class_id');

        $unmarkedCounts = $unmarked->pluck('unmarked', 'id');
        $rows = [];
        $shown = [];

        foreach ($classes as $class) {
            $meetings = collect($class['meetings'])
                ->filter(fn($meeting) => in_array($weekday, $meeting['days'], true))
                ->sortBy(fn($meeting) => $meeting['start'] ?? '99:99')
                ->values();

            $classSessions = $sessions->get($class['id'], collect())->values();

            foreach ($meetings as $index => $meeting) {
                $attendance = null;

                if ($class['kind'] === 'regular') {
                    $session = $classSessions->get($index);
                    $attendance = ['status' => 'not_taken'];

                    if ($session) {
                        $shown[] = (int) $session->id;
                        $left = (int) $unmarkedCounts->get($session->id, 0);
                        $attendance = [
                            'status' => match (true) {
                                $session->status === 'cancelled' => 'cancelled',
                                // Made, but its roster was never started.
                                (int) $session->records === 0 => 'not_taken',
                                $left > 0 => 'unmarked',
                                default => 'taken',
                            },
                            'session_id' => (int) $session->id,
                            'unmarked' => $left,
                            'present' => (int) $session->present,
                            'absent' => (int) $session->absent,
                        ];
                    }
                }

                $rows[] = [
                    'class' => $this->ref($class),
                    'start' => $meeting['start'],
                    'end' => $meeting['end'],
                    'room' => $meeting['room'],
                    'state' => $this->state($meeting, $clock),
                    'attendance' => $attendance,
                ];
            }
        }

        usort($rows, fn($a, $b) => [$a['start'] ?? '99:99', $a['class']['title']] <=> [$b['start'] ?? '99:99', $b['class']['title']]);

        return [$rows, $shown];
    }

    /** upcoming, ongoing or done; unknown when the time is TBA. */
    private function state(array $meeting, string $clock): string
    {
        return match (true) {
            $meeting['start'] === null => 'unknown',
            $clock < $meeting['start'] => 'upcoming',
            $meeting['end'] === null || $clock < $meeting['end'] => 'ongoing',
            default => 'done',
        };
    }

    /** The next meeting that hasn't started, within the coming week. */
    private function nextMeeting(array $class): ?array
    {
        $clock = $this->now->format('H:i');

        for ($offset = 0; $offset <= 7; $offset++) {
            $date = $this->now->addDays($offset);

            $meeting = collect($class['meetings'])
                ->filter(fn($meeting) => in_array($date->dayOfWeek, $meeting['days'], true))
                ->filter(fn($meeting) => $offset > 0 || ($meeting['start'] !== null && $meeting['start'] > $clock))
                ->sortBy(fn($meeting) => $meeting['start'] ?? '99:99')
                ->first();

            if ($meeting) {
                return [
                    'date' => $date->toDateString(),
                    'start' => $meeting['start'],
                    'end' => $meeting['end'],
                    'room' => $meeting['room'],
                ];
            }
        }

        return null;
    }

    /**
     * Grades sent back, grades not submitted after upload closed (they can
     * still go in late), and grades due while upload is open. Classes with
     * no students are left out.
     */
    private function gradeTasks(SchoolYear $schoolYear, Collection $classes, array $students): array
    {
        $regular = DB::table('grade_submissions')
            ->whereIn('year_section_subjects_id', $classes->where('kind', 'regular')->pluck('id'))
            ->get()
            ->keyBy(fn($row) => 'regular:' . $row->year_section_subjects_id);

        // NSTP submissions are keyed by the schedule's id.
        $nstp = DB::table('nstp_grade_submissions')
            ->whereIn('nstp_section_id', $classes->where('kind', 'nstp')->pluck('id'))
            ->get()
            ->keyBy(fn($row) => 'nstp:' . $row->nstp_section_id);

        $submissions = $regular->union($nstp);
        $returned = [];
        $late = [];
        $due = [];

        foreach (SchoolYear::GRADE_PERIODS as $period) {
            $window = $schoolYear->gradeUploadStatus($period, $this->now);
            $closesAt = $schoolYear->getAttribute("{$period}_upload_closes_at");
            $lateClasses = [];
            $dueClasses = [];
            // Progress for the period: classes with students, and how many
            // are in (submitted, verified or deployed).
            $total = 0;
            $submitted = 0;

            foreach ($classes as $key => $class) {
                if (($students[$key] ?? 0) === 0) {
                    continue;
                }

                $row = $submissions->get($key);
                // No row yet means nobody opened the class: still a draft.
                $status = $row?->{"{$period}_status"} ?? 'draft';
                $total++;
                $submitted += in_array($status, ['submitted', 'verified', 'deployed'], true) ? 1 : 0;

                if ($status === 'rejected') {
                    $returned[] = [
                        'type' => 'grades_returned',
                        'period' => $period,
                        'class' => $this->ref($class),
                        'reason' => $row->{"{$period}_rejection_message"} ?? null,
                    ];
                } elseif ($status === 'draft' && $window === 'closed') {
                    $lateClasses[] = $this->ref($class);
                } elseif ($status === 'draft' && $window === 'open') {
                    $dueClasses[] = $this->ref($class);
                }
            }

            if ($lateClasses !== []) {
                $late[] = [
                    'type' => 'grades_late',
                    'period' => $period,
                    'closed_at' => $closesAt?->copy()->timezone(config('app.timezone'))->toIso8601String(),
                    'classes' => $lateClasses,
                    'submitted' => $submitted,
                    'total' => $total,
                ];
            }

            if ($dueClasses !== []) {
                $due[] = [
                    'type' => 'grades_due',
                    'period' => $period,
                    'closes_at' => $closesAt?->copy()->timezone(config('app.timezone'))->toIso8601String(),
                    'classes' => $dueClasses,
                    'submitted' => $submitted,
                    'total' => $total,
                ];
            }
        }

        // Soonest closing first; no closing time last.
        usort($due, fn($a, $b) => [$a['closes_at'] === null, $a['closes_at']] <=> [$b['closes_at'] === null, $b['closes_at']]);

        return [...$returned, ...$late, ...$due];
    }

    /** What the page needs to name and link to a class. */
    private function ref(array $class): array
    {
        return [
            'key' => $class['key'],
            'id' => $class['id'],
            'kind' => $class['kind'],
            'hash' => $class['hash'],
            'title' => $class['title'],
            'section' => $class['section'],
        ];
    }
}
