<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class EnrollmentPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $userRole = auth::user()->user_role;

        if (!Auth::check()) {
            return redirect()->route('login');
        }

        if ($userRole != 'program_head' && $userRole != 'registrar' && $userRole != 'evaluator' && $userRole != 'student') {
            abort(403);
        }

        return $next($request);
    }
}
