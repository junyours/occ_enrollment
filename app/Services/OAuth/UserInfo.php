<?php

namespace App\Services\OAuth;

use App\Models\EnrolledStudent;
use App\Models\User;
use Laravel\Passport\Contracts\ScopeAuthorizable;

/**
 * Builds the /api/oauth/me response. Each scope adds fields; nothing else
 * about the person (grades, address, billing, parents) is ever included.
 */
class UserInfo
{
    public function for(User $user, ScopeAuthorizable $token): array
    {
        // `sub` is users.id: it never changes, even if an ID number is corrected.
        $data = ['sub' => (string) $user->id];

        if ($token->can(Scopes::PROFILE)) {
            $info = $user->information;
            $name = trim(collect([$info?->first_name, $info?->middle_name, $info?->last_name])->filter()->implode(' '));

            $data += [
                'user_id_no' => $user->user_id_no,
                'name' => $name !== '' ? $name : $user->user_id_no,
                'given_name' => $info?->first_name,
                'middle_name' => $info?->middle_name,
                'family_name' => $info?->last_name,
                'role' => $user->user_role,
                'active' => (bool) $user->active,
            ];
        }

        if ($token->can(Scopes::EMAIL)) {
            $data['email'] = $user->email ?: $user->information?->email_address;
        }

        if ($token->can(Scopes::ENROLLMENT)) {
            $data['enrollment'] = $user->user_role === 'student' ? $this->enrollment($user) : null;
        }

        return $data;
    }

    private function enrollment(User $user): array
    {
        $enrollment = EnrolledStudent::query()
            ->with(['YearSection.Course', 'YearSection.YearLevel', 'YearSection.SchoolYear.Semester'])
            ->where('student_id', $user->id)
            ->whereHas('YearSection.SchoolYear', fn ($query) => $query->where('is_current', 1))
            ->latest('id')
            ->first();

        if (! $enrollment) {
            return ['currently_enrolled' => false];
        }

        $section = $enrollment->YearSection;
        $schoolYear = $section?->SchoolYear;

        return [
            'currently_enrolled' => true,
            'school_year' => $schoolYear ? "{$schoolYear->start_year}-{$schoolYear->end_year}" : null,
            'semester' => $schoolYear?->Semester?->semester_name,
            'course' => $section?->Course?->course_name,
            'course_code' => $section?->Course?->course_name_abbreviation,
            'major' => $section?->Course?->major,
            'year_level' => $section?->YearLevel?->year_level_name,
            'section' => $section?->section,
        ];
    }
}
