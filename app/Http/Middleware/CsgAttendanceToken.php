<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Allows only tokens issued by the CSG attendance login to reach the CSG
 * attendance API, so tokens from the general mobile app cannot read the
 * student directory through it.
 */
class CsgAttendanceToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if (!$user || $user->user_role !== 'student' || !$token || $token->name !== 'csg-attendance-token') {
            return response()->json(['message' => 'This endpoint is only available to the CSG attendance app.'], 403);
        }

        return $next($request);
    }
}
