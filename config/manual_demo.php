<?php

return [
    // This seeder must be explicitly enabled for the isolated local demo database.
    'enabled' => env('MANUAL_DEMO_ENABLED', false),
    'database_port' => env('MANUAL_DEMO_DATABASE_PORT', 13307),
    'credentials_path' => env(
        'MANUAL_DEMO_CREDENTIALS_PATH',
        storage_path('app/private/manual-demo-credentials.json'),
    ),
];
