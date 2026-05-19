<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
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
            return Inertia::render('Errors/ErrorPage', [
                'status' => 403,
            ])->toResponse($request)->setStatusCode(404);
        }

        return $next($request);
    }
}
