<?php

namespace App\Http\Middleware;

use App\Models\SiteSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class DatabaseBasedMaintenance
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next)
    {
        $setting = SiteSetting::first();

        if (!$setting || !$setting->maintenance_mode) {
            return $next($request);
        }

        $user = Auth::user();

        // Allow if user role is NOT in blocked_roles
        if ($user && !in_array($user->user_role, $setting->blocked_roles ?? [])) {
            return $next($request);
        }

        return redirect('/maintenance');
    }
}
