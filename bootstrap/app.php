<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'faculty' => \App\Http\Middleware\Faculty::class,
            'student' => \App\Http\Middleware\Student::class,
            'program_head' => \App\Http\Middleware\ProgramHead::class,
            'registrar' => \App\Http\Middleware\Registrar::class,
            'evaluator' => \App\Http\Middleware\Evaluator::class,
            'EnrollmentPrepOngoing' => \App\Http\Middleware\EnrollmentStatus::class,
            'EnrollmentPermission' => \App\Http\Middleware\EnrollmentPermission::class,
            'ClassesPermission' => \App\Http\Middleware\ClassesPermission::class,
            'UserManagementPermission' => \App\Http\Middleware\UserManagementPermission::class,
            'ProgrameadRegistrar' => \App\Http\Middleware\ProgramheadRegistrar::class,
            'SuperAdmin' => \App\Http\Middleware\SuperAdmin::class,
            'SchoolYearPermission' => \App\Http\Middleware\SchoolYearPermission::class,
        ]);
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
