<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Str;
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

        // Mobile and CSG attendance logins: 10 attempts per minute per account and IP,
        // matching the web login, so students sharing campus Wi-Fi don't lock each other out.
        foreach (['mobile-login', 'csg-login'] as $limiter) {
            RateLimiter::for($limiter, fn (Request $request) => Limit::perMinute(10)
                ->by($limiter.'|'.Str::lower((string) $request->input('user_id_no')).'|'.$request->ip()));
        }

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
