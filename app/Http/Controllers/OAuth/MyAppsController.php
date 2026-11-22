<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\OAuth\Concerns\PresentsOAuthClients;
use App\Models\OAuth\Client;
use App\Services\OAuth\ClientRegistrar;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "My apps": people MIS assigned to maintain a school app can see its client ID,
 * callback URLs and sign-in log, and issue a new client secret. The rules about
 * who may sign in stay with MIS.
 */
class MyAppsController extends Controller
{
    use PresentsOAuthClients;

    public function index(Request $request): Response
    {
        $apps = $request->user()
            ->maintainedOAuthClients()
            ->with('settings')
            ->orderBy('name')
            ->get()
            ->filter(fn (Client $client) => $client->settings !== null)
            ->map(fn (Client $client) => [
                ...$this->presentClient($client),
                'activity' => $this->recentActivity($client, 15),
            ])
            ->values();

        return Inertia::render('OAuth/MyApps', [
            'apps' => $apps,
            'endpoints' => $this->endpoints(),
            'newSecret' => session('oauth_new_secret'),
            'newSecretFor' => session('oauth_new_secret_for'),
        ]);
    }

    public function rotateSecret(Request $request, Client $client, ClientRegistrar $registrar): RedirectResponse
    {
        abort_unless(
            $client->settings
                && $client->confidential()
                && $request->user()->maintainedOAuthClients()->whereKey($client->getKey())->exists(),
            404
        );

        return back()
            ->with('oauth_new_secret', $registrar->rotateSecret($client))
            ->with('oauth_new_secret_for', $client->getKey());
    }
}
