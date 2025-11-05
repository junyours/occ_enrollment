<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Guidance
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Adjust this to your permission logic
        if (auth()->check() && auth()->user()->user_role === 'guidance') {
            return $next($request);
        }
        abort(403, 'Unauthorized access');
    }
}
