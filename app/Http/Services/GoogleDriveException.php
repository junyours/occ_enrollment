<?php

namespace App\Http\Services;

use RuntimeException;

class GoogleDriveException extends RuntimeException
{
    public function __construct(string $message = 'Google Drive is temporarily unavailable.', public readonly int $status = 502)
    {
        parent::__construct($message);
    }
}
