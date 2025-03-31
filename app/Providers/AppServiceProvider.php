<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use App\Models\UserInformation;
use Illuminate\Support\Facades\DB;
use App\Models\Course;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Share authentication data globally with Inertia
        Inertia::share([
            'auth' => function () {
                if (Auth::check()) {
                    $user = Auth::user();
                    return [
                        'user' => $user,
                        'user_role' => $user->user_role,
                    ];
                }
                return null;
            }
        ]);
    }
}
