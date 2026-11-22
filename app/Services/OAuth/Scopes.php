<?php

namespace App\Services\OAuth;

/**
 * What a school app can ask SIS-OCC for. Each scope adds fields to /api/oauth/me.
 */
final class Scopes
{
    public const PROFILE = 'profile';
    public const EMAIL = 'email';
    public const ENROLLMENT = 'enrollment';

    /**
     * @return array<string, string> scope => what the person sees on the consent screen
     */
    public static function descriptions(): array
    {
        return [
            self::PROFILE => 'Your name, ID number and role',
            self::EMAIL => 'Your email address',
            self::ENROLLMENT => 'Your course, year level, section and whether you are enrolled this semester',
        ];
    }

    /**
     * @return string[]
     */
    public static function all(): array
    {
        return array_keys(self::descriptions());
    }
}
