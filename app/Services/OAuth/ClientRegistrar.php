<?php

namespace App\Services\OAuth;

use App\Models\OAuth\Client;
use App\Models\OAuth\ClientSetting;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;

/**
 * Registers and manages the school apps that may use "Continue with SIS-OCC".
 * Every change is written to activity_logs, with the app's settings row as subject.
 */
class ClientRegistrar
{
    public function __construct(private TokenRevoker $revoker)
    {
    }

    /**
     * @param  array{name: string, description?: ?string, homepage_url?: ?string, redirect_uris: string[], confidential: bool, scopes: string[], allowed_roles: string[], requires_enrollment: bool, skips_consent: bool}  $data
     * @return Client with ->plainSecret set (null for public clients); show it once.
     */
    public function register(array $data, User $by): Client
    {
        return DB::transaction(function () use ($data, $by) {
            /** @var Client $client */
            $client = Passport::client()->newQuery()->forceCreate([
                'name' => $data['name'],
                'secret' => $data['confidential'] ? Str::random(40) : null,
                'provider' => null,
                'redirect_uris' => array_values($data['redirect_uris']),
                'grant_types' => ['authorization_code', 'refresh_token'],
                'scopes' => array_values($data['scopes']),
                'revoked' => false,
            ]);

            $settings = $client->settings()->create([
                ...Arr::only($data, ['description', 'homepage_url', 'allowed_roles', 'requires_enrollment', 'skips_consent']),
                'status' => ClientSetting::STATUS_ACTIVE,
                'created_by' => $by->id,
            ]);

            log_activity('oauth.app_registered', $settings, "Registered {$client->name} for Continue with SIS-OCC", [
                'client_id' => $client->getKey(),
                'confidential' => $data['confidential'],
                'redirect_uris' => $client->redirect_uris,
                'scopes' => $client->scopes,
                'allowed_roles' => $settings->allowed_roles,
                'requires_enrollment' => $settings->requires_enrollment,
            ]);

            return $client->setRelation('settings', $settings);
        });
    }

    /**
     * Tightening who may use the app or what it may read ends its current sessions,
     * so everyone is checked against the new rules the next time they sign in.
     *
     * @param  array{name: string, description?: ?string, homepage_url?: ?string, redirect_uris: string[], scopes: string[], allowed_roles: string[], requires_enrollment: bool, skips_consent: bool}  $data
     */
    public function update(Client $client, array $data): void
    {
        DB::transaction(function () use ($client, $data) {
            $settings = $client->settings;
            $before = [
                'name' => $client->name,
                'redirect_uris' => $client->redirect_uris,
                'scopes' => $client->scopes ?? [],
                'allowed_roles' => $settings->allowed_roles,
                'requires_enrollment' => $settings->requires_enrollment,
                'skips_consent' => $settings->skips_consent,
            ];

            $client->forceFill([
                'name' => $data['name'],
                'redirect_uris' => array_values($data['redirect_uris']),
                'scopes' => array_values($data['scopes']),
            ])->save();

            $settings->update(Arr::only($data, ['description', 'homepage_url', 'allowed_roles', 'requires_enrollment', 'skips_consent']));

            $after = [
                'name' => $client->name,
                'redirect_uris' => $client->redirect_uris,
                'scopes' => $client->scopes ?? [],
                'allowed_roles' => $settings->allowed_roles,
                'requires_enrollment' => $settings->requires_enrollment,
                'skips_consent' => $settings->skips_consent,
            ];

            $changed = array_keys(array_filter($after, fn ($value, $key) => $value != $before[$key], ARRAY_FILTER_USE_BOTH));

            if ($changed === []) {
                return;
            }

            $tightened = array_diff($before['allowed_roles'], $after['allowed_roles']) !== []
                || array_diff($before['scopes'], $after['scopes']) !== []
                || (! $before['requires_enrollment'] && $after['requires_enrollment']);

            $ended = $tightened ? $this->revoker->revokeForClient($client) : 0;

            log_activity('oauth.app_updated', $settings, "Changed {$client->name}: ".implode(', ', $changed), [
                'client_id' => $client->getKey(),
                'before' => Arr::only($before, $changed),
                'after' => Arr::only($after, $changed),
                'sessions_ended' => $ended,
            ]);
        });
    }

    /**
     * Issue a new client secret. The old one stops working immediately.
     *
     * @return string the new secret, to show once
     */
    public function rotateSecret(Client $client): string
    {
        $secret = Str::random(40);
        $client->forceFill(['secret' => $secret])->save();

        log_activity('oauth.secret_rotated', $client->settings, "Issued a new client secret for {$client->name}", [
            'client_id' => $client->getKey(),
        ]);

        return $secret;
    }

    public function setStatus(Client $client, string $status): void
    {
        $settings = $client->settings;

        if ($settings->status === $status) {
            return;
        }

        $settings->update(['status' => $status]);
        $ended = $status === ClientSetting::STATUS_SUSPENDED ? $this->revoker->revokeForClient($client) : 0;

        log_activity(
            $status === ClientSetting::STATUS_SUSPENDED ? 'oauth.app_suspended' : 'oauth.app_activated',
            $settings,
            ($status === ClientSetting::STATUS_SUSPENDED ? 'Switched off ' : 'Switched on ').$client->name,
            ['client_id' => $client->getKey(), 'sessions_ended' => $ended]
        );
    }

    public function addMaintainer(Client $client, User $maintainer, User $by): void
    {
        if ($client->maintainers()->whereKey($maintainer->id)->exists()) {
            return;
        }

        $client->maintainers()->attach($maintainer->id, ['added_by' => $by->id]);

        log_activity('oauth.maintainer_added', $client->settings, "Gave {$maintainer->user_id_no} access to manage {$client->name}", [
            'client_id' => $client->getKey(),
            'user_id_no' => $maintainer->user_id_no,
        ]);
    }

    public function removeMaintainer(Client $client, User $maintainer): void
    {
        if ($client->maintainers()->detach($maintainer->id) === 0) {
            return;
        }

        log_activity('oauth.maintainer_removed', $client->settings, "Removed {$maintainer->user_id_no} from managing {$client->name}", [
            'client_id' => $client->getKey(),
            'user_id_no' => $maintainer->user_id_no,
        ]);
    }
}
