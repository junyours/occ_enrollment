<?php

namespace App\Services\OAuth;

use App\Models\EnrolledStudent;
use App\Models\OAuth\ClientSetting;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Decides whether a person may use a school app. SIS-OCC applies this before
 * it issues a code, and again every time the app calls /api/oauth/me.
 */
class AccessPolicy
{
    private const ROLE_LABELS = [
        'mis' => 'MIS',
        'nstp_director' => 'NSTP director',
        'nstp_faculty' => 'NSTP faculty',
        'vpaa' => 'VPAA',
        'gened_coordinator' => 'GenEd coordinator',
        'ojt_coordinator' => 'OJT coordinator',
    ];

    public function evaluate(User $user, ClientSetting $settings, string $appName): AccessDecision
    {
        $allowedRoles = $settings->allowed_roles ?? [];
        $roleAllowed = in_array($user->user_role, $allowedRoles, true);

        $checks = [
            [
                'key' => 'role',
                'label' => 'Role allowed for '.$appName,
                'passed' => $roleAllowed,
                'skipped' => false,
                'reason' => $appName.' is only for '.self::describeRoles($allowedRoles).'.',
            ],
            [
                'key' => 'active',
                'label' => 'Account is active',
                'passed' => (bool) $user->active,
                'skipped' => false,
                'reason' => 'Your SIS-OCC account has been deactivated. Contact the MIS office.',
            ],
        ];

        if ($settings->requires_enrollment && $user->user_role === 'student') {
            $checks[] = [
                'key' => 'enrollment',
                'label' => 'Enrolled this semester',
                'passed' => $this->isCurrentlyEnrolled($user),
                'skipped' => false,
                'reason' => 'You have no enrollment record for the current semester. Contact the registrar if this is wrong.',
            ];
        }

        $allowed = collect($checks)->every(fn (array $check): bool => $check['passed'] || $check['skipped']);

        return new AccessDecision($allowed, $checks);
    }

    /**
     * Has an enrollment record in a section of the school year marked current.
     */
    public function isCurrentlyEnrolled(User $user): bool
    {
        return EnrolledStudent::query()
            ->where('student_id', $user->id)
            ->whereHas('YearSection.SchoolYear', fn ($query) => $query->where('is_current', 1))
            ->exists();
    }

    /**
     * Roles MIS can allow for an app: every role in use, plus the usual ones.
     *
     * @return string[]
     */
    public static function availableRoles(): array
    {
        $known = [
            'student', 'faculty', 'program_head', 'evaluator', 'registrar', 'academic_dean', 'vpaa', 'president',
            'guidance', 'librarian', 'nstp_director', 'nstp_faculty', 'gened_coordinator', 'ojt_coordinator',
            'research_coordinator', 'billing', 'cashier', 'announcement_admin', 'mis', 'super_admin',
        ];

        $inUse = User::query()->distinct()->pluck('user_role')->filter()->all();

        return array_values(array_unique([...$known, ...$inUse]));
    }

    public static function roleLabel(string $role): string
    {
        return self::ROLE_LABELS[$role] ?? Str::of($role)->replace('_', ' ')->lower()->toString();
    }

    /**
     * ["student", "faculty"] => "students and faculty"
     *
     * @param  string[]  $roles
     */
    public static function describeRoles(array $roles): string
    {
        if ($roles === []) {
            return 'no one yet';
        }

        $labels = array_map(function (string $role): string {
            $label = self::roleLabel($role);

            return in_array($role, ['faculty', 'nstp_faculty', 'mis'], true) ? $label : Str::plural($label);
        }, $roles);

        return count($labels) === 1
            ? $labels[0]
            : implode(', ', array_slice($labels, 0, -1)).' and '.end($labels);
    }
}
