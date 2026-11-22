<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use App\Models\OAuth\Client;
use App\Models\OAuth\OAuthUser;
use App\Services\OAuth\AccessPolicy;
use App\Services\OAuth\TokenRevoker;
use App\Services\OAuth\UserInfo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * GET /api/oauth/me: who signed in, for the app holding the token.
 *
 * The school's rules are checked again on every call, so an app that keeps a
 * token stops getting data as soon as the person no longer qualifies.
 */
class UserInfoController extends Controller
{
    public function __invoke(Request $request, AccessPolicy $policy, UserInfo $userInfo, TokenRevoker $revoker): JsonResponse
    {
        /** @var OAuthUser $oauthUser */
        $oauthUser = $request->user('api');

        /** @var Client|null $client */
        $client = Auth::guard('api')->client();
        $client?->loadMissing('settings');

        $user = $oauthUser->account();
        $settings = $client?->settings;

        if (! $client || ! $settings || ! $settings->isActive()) {
            $oauthUser->token()?->revoke();

            return $this->refuse(($client?->name ?? 'This app').' is switched off in SIS-OCC.');
        }

        $decision = $policy->evaluate($user, $settings, $client->name);

        if (! $decision->allowed) {
            $revoker->revokeForUser($user, [$client->getKey()], 'no longer meets the rules for '.$client->name);

            return $this->refuse('This person can no longer use '.$client->name.'.', $decision->failedKeys());
        }

        return response()->json($userInfo->for($user, $oauthUser->token()));
    }

    /**
     * @param  string[]  $failedChecks
     */
    private function refuse(string $description, array $failedChecks = []): JsonResponse
    {
        return response()->json(array_filter([
            'error' => 'invalid_token',
            'error_description' => $description,
            'failed_checks' => $failedChecks ?: null,
        ]), 401, ['WWW-Authenticate' => 'Bearer error="invalid_token"']);
    }
}
