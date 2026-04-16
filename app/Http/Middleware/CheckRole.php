<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = Auth::user();

        // Not logged in
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        // Check if user role is in allowed roles
        if (!in_array($user->user_role, $roles)) {
            abort(403, 'Forbidden');
        }

        return $next($request);
    }
}
