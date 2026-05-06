<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\UserLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class LogAuthenticatedUserActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    /**
     * Handle tasks after the response has been sent to the browser.
     */
    public function terminate(Request $request, Response $response): void
    {
        if (Auth::check()) {
            $user = Auth::user();

            // Do not log if they are being impersonated OR if their role is super admin
            if (!$request->session()->has('impersonator_id') && $user->user_role !== 'super_admin') {
                UserLog::create([
                    'user_id'     => $user->id,
                    'method'      => $request->method(),
                    'endpoint'    => $request->path(),
                    'ip_address'  => $request->ip(),
                    'status_code' => $response->getStatusCode(),
                    'payload'     => $request->except(['current_password', 'password', 'password_confirmation', 'token']),
                ]);
            }
        }
    }
}
