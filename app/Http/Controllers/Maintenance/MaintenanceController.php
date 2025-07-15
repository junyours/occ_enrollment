<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MaintenanceController extends Controller
{
    public function edit()
    {
        return Inertia::render('Maintenance/Index', [
            'settings' => SiteSetting::first()
        ]);
    }

    public function updateMode(Request $request)
    {
        $request->validate([
            'maintenance_mode' => 'required',
        ]);

        SiteSetting::first()->update([
            'maintenance_mode' => $request->maintenance_mode,
        ]);
    }

    public function updateRoles(Request $request)
    {
        $request->validate([
            'blocked_roles' => 'nullable|array',
            'blocked_roles.*' => 'string',
        ]);

        SiteSetting::first()->update([
            'blocked_roles' => $request->blocked_roles ?? [],
        ]);
    }

    public function maintenance()
    {
        $user = Auth::user();

        if (!$user) {
            return redirect('/');
        }

        if ($user->user_role == 'super_admin') {
            return redirect('/maintenance-settings');
        }

        $setting = SiteSetting::first();

        if (!$setting || !$setting->maintenance_mode) {
            return redirect('/');
        }

        if ($user && in_array($user->user_role, $setting->blocked_roles ?? [])) {
            return Inertia::render('Maintenance');
        }

        return redirect('/');
    }
}
