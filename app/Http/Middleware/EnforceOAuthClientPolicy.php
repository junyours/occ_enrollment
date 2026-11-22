<?php

namespace App\Http\Middleware;

use App\Models\OAuth\Client;
use App\Models\User;
use App\Services\OAuth\AccessPolicy;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Laravel\Passport\Passport;
use League\OAuth2\Server\AuthorizationServer;
use League\OAuth2\Server\Exception\OAuthServerException;
use League\OAuth2\Server\RequestTypes\AuthorizationRequestInterface;
use Psr\Http\Message\ServerRequestInterface;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applies the school's rules on /oauth/authorize, after the person has signed
 * in to SIS-OCC and before Passport issues a code. If they don't qualify, no
 * code is issued and the app learns nothing except "access_denied".
 */
class EnforceOAuthClientPolicy
{
    public function __construct(
        private AuthorizationServer $server,
        private AccessPolicy $policy,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        // The sign-in page posts through Inertia; its redirect back here must become a
        // full page load, because Passport then redirects the browser to another site.
        if ($request->isMethod('GET') && $request->header('X-Inertia')) {
            return Inertia::location($request->fullUrl());
        }

        $user = $request->user();

        // Guests: Passport sends them to the sign-in page and back here afterwards.
        // prompt=login: Passport signs the current person out first ("Use another account").
        if (! $user instanceof User || $this->switchingAccount($request)) {
            return $next($request);
        }

        $authRequest = $this->authorizationRequest($request);

        if (! $authRequest) {
            return $next($request); // Passport reports the malformed request itself.
        }

        $client = Passport::client()->newQuery()->with('settings')->find($authRequest->getClient()->getIdentifier());

        if (! $client instanceof Client) {
            return $next($request);
        }

        $settings = $client->settings;

        if (! $settings || ! $settings->isActive()) {
            return $this->deny($request, $client, $authRequest, $user, [
                $client->name.' is switched off in SIS-OCC right now. Try again later or contact the MIS office.',
            ], ['app_suspended']);
        }

        $decision = $this->policy->evaluate($user, $settings, $client->name);

        if (! $decision->allowed) {
            return $this->deny($request, $client, $authRequest, $user, $decision->reasons(), $decision->failedKeys());
        }

        if ($request->isMethod('GET')) {
            log_activity('oauth.sign_in_allowed', $settings, "{$user->user_id_no} passed the sign-in rules for {$client->name}", [
                'client_id' => $client->getKey(),
                'user_id_no' => $user->user_id_no,
            ]);
        }

        return $next($request);
    }

    private function switchingAccount(Request $request): bool
    {
        $prompt = collect(explode(' ', (string) $request->query('prompt')))->map(fn ($p) => trim($p));

        return $prompt->contains('login') && ! $request->session()->get('promptedForLogin', false);
    }

    /**
     * The validated request: on GET from the query string, on approve from the session.
     */
    private function authorizationRequest(Request $request): ?AuthorizationRequestInterface
    {
        if ($request->isMethod('GET')) {
            try {
                return $this->server->validateAuthorizationRequest(app(ServerRequestInterface::class));
            } catch (OAuthServerException) {
                return null;
            }
        }

        $serialized = $request->session()->get('authRequest');

        if (! is_string($serialized)) {
            return null;
        }

        $authRequest = unserialize($serialized, ['allowed_classes' => [
            \League\OAuth2\Server\RequestTypes\AuthorizationRequest::class,
            \Laravel\Passport\Bridge\Client::class,
            \Laravel\Passport\Bridge\Scope::class,
            \Laravel\Passport\Bridge\User::class,
        ]]);

        return $authRequest instanceof AuthorizationRequestInterface ? $authRequest : null;
    }

    /**
     * @param  string[]  $reasons
     * @param  string[]  $failedKeys
     */
    private function deny(
        Request $request,
        Client $client,
        AuthorizationRequestInterface $authRequest,
        User $user,
        array $reasons,
        array $failedKeys,
    ): Response {
        $request->session()->forget(['authToken', 'authRequest']);

        if ($client->settings) {
            log_activity('oauth.sign_in_blocked', $client->settings, "{$user->user_id_no} was blocked from {$client->name}", [
                'client_id' => $client->getKey(),
                'user_id_no' => $user->user_id_no,
                'failed_checks' => $failedKeys,
            ]);
        }

        $backUrl = $this->errorRedirectUrl($client, $authRequest);

        // prompt=none asks for no screens at all: answer the app directly.
        if ($backUrl && str_contains((string) $request->query('prompt'), 'none')) {
            return redirect()->away($backUrl);
        }

        $user->loadMissing('information');
        $name = trim(collect([$user->information?->first_name, $user->information?->last_name])->filter()->implode(' '));

        return Inertia::render('OAuth/Denied', [
            'appName' => $client->name,
            'reasons' => $reasons,
            'backUrl' => $backUrl,
            'switchAccountUrl' => $request->isMethod('GET') ? $this->withQuery($request->fullUrl(), ['prompt' => 'login']) : null,
            'account' => [
                'name' => $name !== '' ? $name : $user->user_id_no,
                'user_id_no' => $user->user_id_no,
            ],
        ])->toResponse($request)->setStatusCode(403);
    }

    /**
     * The app's own callback with error=access_denied, as OAuth 2.0 expects.
     */
    private function errorRedirectUrl(Client $client, AuthorizationRequestInterface $authRequest): ?string
    {
        $redirectUri = $authRequest->getRedirectUri() ?? ($client->redirect_uris[0] ?? null);

        if (! $redirectUri) {
            return null;
        }

        return $this->withQuery($redirectUri, array_filter([
            'error' => 'access_denied',
            'error_description' => 'SIS-OCC did not allow this person to use '.$client->name.'.',
            'state' => $authRequest->getState(),
        ], fn ($value) => $value !== null && $value !== ''));
    }

    private function withQuery(string $url, array $params): string
    {
        $parts = parse_url($url);
        parse_str($parts['query'] ?? '', $query);
        $query = array_merge($query, $params);
        $base = strtok($url, '?');

        return $base.'?'.http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }
}
