<?php

namespace App\Services\OAuth;

use App\Models\OAuth\Client;
use App\Models\User;
use Laravel\Passport\Passport;

/**
 * Ends sessions that school apps hold through SIS-OCC. Revoked tokens are
 * refused by /api/oauth/me, and revoked refresh tokens can't be renewed.
 */
class TokenRevoker
{
    public function __construct(private AccessPolicy $policy)
    {
    }

    /**
     * Revoke a person's tokens, for every app or only the given ones.
     *
     * @param  string[]|null  $clientIds
     */
    public function revokeForUser(User $user, ?array $clientIds, string $reason): int
    {
        $tokens = Passport::token()->newQuery()
            ->where('user_id', $user->id)
            ->where('revoked', false)
            ->when($clientIds !== null, fn ($query) => $query->whereIn('client_id', $clientIds));

        $tokenIds = $tokens->pluck('id');
        $revokedClientIds = $tokens->clone()->distinct()->pluck('client_id')->all();

        Passport::authCode()->newQuery()
            ->where('user_id', $user->id)
            ->where('revoked', false)
            ->when($clientIds !== null, fn ($query) => $query->whereIn('client_id', $clientIds))
            ->update(['revoked' => true]);

        if ($tokenIds->isEmpty()) {
            return 0;
        }

        $this->revokeTokenIds($tokenIds->all());

        log_activity('oauth.tokens_revoked', $user, "Ended app sessions for {$user->user_id_no}: {$reason}", [
            'reason' => $reason,
            'client_ids' => $revokedClientIds,
            'tokens' => $tokenIds->count(),
        ]);

        return $tokenIds->count();
    }

    /**
     * Revoke a person's tokens only for apps whose rules they no longer meet,
     * for example after a role change or a removed enrollment.
     */
    public function revokeWhereNoLongerAllowed(User $user, string $reason): int
    {
        $clientIds = Passport::token()->newQuery()
            ->where('user_id', $user->id)
            ->where('revoked', false)
            ->distinct()
            ->pluck('client_id');

        if ($clientIds->isEmpty()) {
            return 0;
        }

        $blocked = Client::query()
            ->with('settings')
            ->whereKey($clientIds)
            ->get()
            ->reject(fn (Client $client): bool => $client->settings
                && $client->settings->isActive()
                && $this->policy->evaluate($user, $client->settings, $client->name)->allowed)
            ->modelKeys();

        return $blocked === [] ? 0 : $this->revokeForUser($user, $blocked, $reason);
    }

    /**
     * Revoke every token an app holds, for example when MIS switches it off
     * or tightens who may use it. People sign in again on their next visit.
     */
    public function revokeForClient(Client $client): int
    {
        $tokenIds = Passport::token()->newQuery()
            ->where('client_id', $client->getKey())
            ->where('revoked', false)
            ->pluck('id');

        Passport::authCode()->newQuery()
            ->where('client_id', $client->getKey())
            ->where('revoked', false)
            ->update(['revoked' => true]);

        $this->revokeTokenIds($tokenIds->all());

        return $tokenIds->count();
    }

    /**
     * @param  string[]  $tokenIds
     */
    private function revokeTokenIds(array $tokenIds): void
    {
        foreach (array_chunk($tokenIds, 500) as $chunk) {
            Passport::token()->newQuery()->whereKey($chunk)->update(['revoked' => true]);
            Passport::refreshToken()->newQuery()->whereIn('access_token_id', $chunk)->update(['revoked' => true]);
        }
    }
}
