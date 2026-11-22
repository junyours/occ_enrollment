<?php

namespace App\Http\Controllers\Mis;

use App\Http\Controllers\Controller;
use App\Http\Controllers\OAuth\Concerns\PresentsOAuthClients;
use App\Models\OAuth\Client;
use App\Models\OAuth\ClientSetting;
use App\Models\User;
use App\Services\OAuth\AccessPolicy;
use App\Services\OAuth\ClientRegistrar;
use App\Services\OAuth\Scopes;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Passport\Passport;

/**
 * MIS: register the school apps that may use "Continue with SIS-OCC",
 * set who may sign in to each, and choose who maintains them.
 */
class OAuthAppController extends Controller
{
    use PresentsOAuthClients;

    public function __construct(private ClientRegistrar $registrar)
    {
    }

    public function index(): Response
    {
        $apps = Passport::client()->newQuery()
            ->with(['settings.creator.information'])
            ->withCount('maintainers')
            ->whereHas('settings')
            ->orderBy('name')
            ->get()
            ->map(fn (Client $client) => [
                ...$this->presentClient($client),
                'maintainers_count' => $client->maintainers_count,
            ]);

        return Inertia::render('Mis/OAuthApps/Index', [
            'apps' => $apps,
            'options' => $this->options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request, creating: true);
        $client = $this->registrar->register($data, $request->user());

        return redirect()
            ->route('mis.oauth-apps.show', $client)
            ->with('oauth_new_secret', $client->plainSecret);
    }

    public function show(Client $client): Response
    {
        abort_unless($client->settings, 404);

        return Inertia::render('Mis/OAuthApps/Show', [
            'app' => $this->presentClient($client),
            'maintainers' => $this->presentMaintainers($client),
            'activity' => $this->recentActivity($client),
            'endpoints' => $this->endpoints(),
            'options' => $this->options(),
            'newSecret' => session('oauth_new_secret'),
        ]);
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        abort_unless($client->settings, 404);

        $this->registrar->update($client, $this->validated($request, creating: false));

        return back();
    }

    public function rotateSecret(Client $client): RedirectResponse
    {
        abort_unless($client->settings && $client->confidential(), 404);

        return back()->with('oauth_new_secret', $this->registrar->rotateSecret($client));
    }

    public function updateStatus(Request $request, Client $client): RedirectResponse
    {
        abort_unless($client->settings, 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in([ClientSetting::STATUS_ACTIVE, ClientSetting::STATUS_SUSPENDED])],
        ]);

        $this->registrar->setStatus($client, $validated['status']);

        return back();
    }

    public function addMaintainer(Request $request, Client $client): RedirectResponse
    {
        abort_unless($client->settings, 404);

        $validated = $request->validate([
            'user_id_no' => ['required', 'string', 'max:255'],
        ], [
            'user_id_no.required' => 'Enter the ID number of the person who maintains this app.',
        ]);

        $maintainer = User::query()->where('user_id_no', strtoupper(trim($validated['user_id_no'])))->first();

        if (! $maintainer) {
            return back()->withErrors(['user_id_no' => 'There is no SIS-OCC account with that ID number.']);
        }

        $this->registrar->addMaintainer($client, $maintainer, $request->user());

        return back();
    }

    public function removeMaintainer(Client $client, User $user): RedirectResponse
    {
        abort_unless($client->settings, 404);

        $this->registrar->removeMaintainer($client, $user);

        return back();
    }

    private function validated(Request $request, bool $creating): array
    {
        $request->merge([
            'redirect_uris' => collect($request->input('redirect_uris', []))
                ->map(fn ($uri) => trim((string) $uri))
                ->filter()
                ->unique()
                ->values()
                ->all(),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'homepage_url' => ['nullable', 'url:http,https', 'max:255'],
            'redirect_uris' => ['required', 'array', 'min:1', 'max:5'],
            'redirect_uris.*' => ['string', 'max:255', $this->redirectUriRule()],
            'confidential' => [$creating ? 'required' : 'prohibited', 'boolean'],
            'scopes' => ['required', 'array', 'min:1'],
            'scopes.*' => [Rule::in(Scopes::all())],
            'allowed_roles' => ['required', 'array', 'min:1'],
            'allowed_roles.*' => [Rule::in(AccessPolicy::availableRoles())],
            'requires_enrollment' => ['required', 'boolean'],
            'skips_consent' => ['required', 'boolean'],
        ], [
            'redirect_uris.required' => 'Add at least one callback URL.',
            'redirect_uris.min' => 'Add at least one callback URL.',
            'scopes.required' => 'Choose at least one kind of data the app may read.',
            'allowed_roles.required' => 'Choose at least one role that may sign in.',
        ]);

        $validated['scopes'] = array_values(array_unique($validated['scopes']));
        $validated['allowed_roles'] = array_values(array_unique($validated['allowed_roles']));

        return $validated;
    }

    /**
     * Callback URLs must be exact https addresses. Plain http is allowed only for
     * local development hosts (localhost, 127.0.0.1, *.test).
     */
    private function redirectUriRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) {
            $parts = parse_url((string) $value);
            $scheme = strtolower($parts['scheme'] ?? '');
            $host = strtolower($parts['host'] ?? '');

            if (! $host || ! in_array($scheme, ['http', 'https'], true)) {
                $fail('Each callback URL must be a full address, such as https://library.example.edu/auth/sis/callback.');

                return;
            }

            if (isset($parts['fragment'])) {
                $fail('Callback URLs can\'t contain a # fragment.');

                return;
            }

            $localHost = in_array($host, ['localhost', '127.0.0.1', '[::1]'], true) || str_ends_with($host, '.test');

            if ($scheme === 'http' && ! $localHost) {
                $fail('Callback URLs must use https. Plain http is only allowed for localhost and .test addresses.');
            }
        };
    }
}
