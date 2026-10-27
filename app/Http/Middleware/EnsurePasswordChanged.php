<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->requiresPasswordChange()) {
            return $next($request);
        }

        if ($request->routeIs('password.required', 'password.required.update', 'logout', 'stop-impersonate')
            || $request->is('api/mobile/change-password', 'api/mobile/logout')) {
            return $next($request);
        }

        if ($request->is('api/*') || $request->expectsJson()) {
            return response()->json([
                'message' => 'Change your password before continuing.',
                'code' => 'PASSWORD_CHANGE_REQUIRED',
                'password_change_required' => true,
                'change_password_url' => route('password.required'),
            ], 403);
        }

        // Retain only navigable page requests; never replay a blocked write.
        if ($request->isMethod('GET') && ! $request->ajax() && ! $request->routeIs('login')) {
            $request->session()->put('url.intended', $request->fullUrl());
        }

        // This middleware runs before Inertia, so explicitly turn writes into GET redirects.
        return redirect()->route('password.required', [], $request->isMethod('GET') || $request->isMethod('HEAD') ? 302 : 303);
    }
}
