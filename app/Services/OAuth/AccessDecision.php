<?php

namespace App\Services\OAuth;

/**
 * The result of checking one person against one app's rules.
 */
final class AccessDecision
{
    /**
     * @param  array<int, array{key: string, label: string, passed: bool, skipped: bool, reason: ?string}>  $checks
     */
    public function __construct(
        public readonly bool $allowed,
        public readonly array $checks,
    ) {
    }

    /**
     * Plain-language reasons for every check that failed.
     *
     * @return string[]
     */
    public function reasons(): array
    {
        return array_values(array_map(
            fn (array $check): string => $check['reason'],
            array_filter($this->checks, fn (array $check): bool => ! $check['passed'] && ! $check['skipped'])
        ));
    }

    /**
     * @return string[] keys of the failed checks, for the activity log
     */
    public function failedKeys(): array
    {
        return array_values(array_map(
            fn (array $check): string => $check['key'],
            array_filter($this->checks, fn (array $check): bool => ! $check['passed'] && ! $check['skipped'])
        ));
    }
}
