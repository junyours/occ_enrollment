<?php

namespace App\Http\Controllers\OAuth\Concerns;

use App\Models\ActivityLog;
use App\Models\OAuth\Client;
use App\Models\OAuth\ClientSetting;
use App\Models\User;
use App\Services\OAuth\AccessPolicy;
use App\Services\OAuth\Scopes;
use Illuminate\Support\Carbon;
use Laravel\Passport\Passport;

/**
 * Shapes registered apps for the MIS "Connected apps" pages and "My apps".
 */
trait PresentsOAuthClients
{
    protected function presentClient(Client $client): array
    {
        $client->loadMissing(['settings.creator.information']);
        $settings = $client->settings;

        return [
            'id' => $client->getKey(),
            'name' => $client->name,
            'description' => $settings?->description,
            'homepage_url' => $settings?->homepage_url,
            'redirect_uris' => $client->redirect_uris,
            'scopes' => $client->scopes ?? [],
            'confidential' => $client->confidential(),
            'allowed_roles' => $settings?->allowed_roles ?? [],
            'allowed_roles_text' => ucfirst(AccessPolicy::describeRoles($settings?->allowed_roles ?? [])),
            'requires_enrollment' => (bool) $settings?->requires_enrollment,
            'skips_consent' => (bool) $settings?->skips_consent,
            'status' => $settings?->status ?? ClientSetting::STATUS_SUSPENDED,
            'created_at' => $client->created_at?->toIso8601String(),
            'created_by' => $settings?->creator ? $this->personName($settings->creator) : null,
            'stats' => $this->clientStats($client),
        ];
    }

    protected function clientStats(Client $client): array
    {
        $since = Carbon::now()->subDays(7);
        $settingsId = $client->settings?->id;

        $logCount = fn (string $action): int => $settingsId === null ? 0 : ActivityLog::query()
            ->where('subject_type', ClientSetting::class)
            ->where('subject_id', $settingsId)
            ->where('action', $action)
            ->where('created_at', '>=', $since)
            ->count();

        return [
            'active_sessions' => Passport::token()->newQuery()
                ->where('client_id', $client->getKey())
                ->where('revoked', false)
                ->where('expires_at', '>', Carbon::now())
                ->count(),
            'sign_ins_7d' => $logCount('oauth.sign_in_allowed'),
            'blocked_7d' => $logCount('oauth.sign_in_blocked'),
        ];
    }

    protected function recentActivity(Client $client, int $limit = 30): array
    {
        if (! $client->settings) {
            return [];
        }

        return ActivityLog::query()
            ->with('user.information')
            ->where('subject_type', ClientSetting::class)
            ->where('subject_id', $client->settings->id)
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (ActivityLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'by' => $log->user ? $this->personName($log->user) : null,
                'by_id_no' => $log->user?->user_id_no,
                'failed_checks' => $log->properties['failed_checks'] ?? [],
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->all();
    }

    protected function presentMaintainers(Client $client): array
    {
        return $client->maintainers()
            ->with('information')
            ->orderBy('user_id_no')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'user_id_no' => $user->user_id_no,
                'name' => $this->personName($user),
                'role' => $user->user_role,
                'added_at' => $user->pivot?->created_at?->toIso8601String(),
            ])
            ->all();
    }

    protected function endpoints(): array
    {
        return [
            'authorize' => url('/oauth/authorize'),
            'token' => url('/oauth/token'),
            'userinfo' => url('/api/oauth/me'),
        ];
    }

    protected function options(): array
    {
        return [
            'scopes' => collect(Scopes::descriptions())->map(fn ($description, $id) => compact('id', 'description'))->values(),
            'roles' => collect(AccessPolicy::availableRoles())->map(fn ($role) => [
                'value' => $role,
                'label' => ucfirst(AccessPolicy::roleLabel($role)),
            ])->values(),
        ];
    }

    protected function personName(User $user): string
    {
        $info = $user->information;
        $name = trim(collect([$info?->first_name, $info?->last_name])->filter()->implode(' '));

        return $name !== '' ? $name : $user->user_id_no;
    }
}
