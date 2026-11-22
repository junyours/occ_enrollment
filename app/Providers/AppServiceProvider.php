<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use App\Models\UserInformation;
use Illuminate\Support\Facades\DB;
use App\Models\Course;
use App\Models\EnrolledStudent;
use App\Models\OAuth\Client as OAuthClient;
use App\Models\User;
use App\Services\OAuth\Scopes;
use App\Services\OAuth\TokenRevoker;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // The OAuth routes live in routes/oauth.php so the school's sign-in rules
        // can sit on /oauth/authorize. Only the routes the SIS uses are registered.
        Passport::ignoreRoutes();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Mobile and CSG attendance logins: 10 attempts per minute per account and IP,
        // matching the web login, so students sharing campus Wi-Fi don't lock each other out.
        foreach (['mobile-login', 'csg-login'] as $limiter) {
            RateLimiter::for($limiter, fn (Request $request) => Limit::perMinute(10)
                ->by($limiter.'|'.Str::lower((string) $request->input('user_id_no')).'|'.$request->ip()));
        }

        $this->configureOAuth();

        // Share authentication data globally with Inertia
        Inertia::share([
            'auth' => function () {
                if (Auth::check()) {
                    $user = Auth::user();
                    return [
                        'user' => $user,
                        'user_role' => $user->user_role,
                    ];
                }
                return null;
            }
        ]);
    }

    /**
     * "Continue with SIS-OCC": SIS-OCC as the login provider for other school apps.
     * See docs/oauth/README.md.
     */
    private function configureOAuth(): void
    {
        Passport::useClientModel(OAuthClient::class);
        Passport::tokensCan(Scopes::descriptions());

        // Short-lived access tokens; apps renew them with the refresh token.
        // Status changes still apply at once through revocation and /api/oauth/me.
        Passport::tokensExpireIn(now()->addMinutes(15));
        Passport::refreshTokensExpireIn(now()->addDays(7));

        Passport::authorizationView(function (array $parameters) {
            /** @var \App\Models\OAuth\Client $client */
            $client = $parameters['client'];
            $client->loadMissing('settings');
            $request = $parameters['request'];
            $user = $parameters['user'];
            $user->loadMissing('information');
            $name = trim(collect([$user->information?->first_name, $user->information?->last_name])->filter()->implode(' '));

            return Inertia::render('OAuth/Authorize', [
                'app' => [
                    'name' => $client->name,
                    'description' => $client->settings?->description,
                    'homepage_url' => $client->settings?->homepage_url,
                ],
                'scopes' => collect($parameters['scopes'])->map(fn ($scope) => [
                    'id' => $scope->id,
                    'description' => $scope->description,
                ])->values(),
                'account' => [
                    'name' => $name !== '' ? $name : $user->user_id_no,
                    'user_id_no' => $user->user_id_no,
                ],
                'form' => [
                    'action' => route('passport.authorizations.approve'),
                    'csrf_token' => csrf_token(),
                    'state' => $request->state,
                    'client_id' => $client->getKey(),
                    'auth_token' => $parameters['authToken'],
                ],
                'switchAccountUrl' => $request->fullUrlWithQuery(['prompt' => 'login']),
            ]);
        });

        // When a person's status changes, end the app sessions they no longer qualify for.
        // /api/oauth/me re-checks the rules on every call as well, so a failure here is
        // reported but never blocks the change itself.
        User::updated(function (User $user) {
            if (! $user->wasChanged(['active', 'user_role'])) {
                return;
            }

            rescue(function () use ($user) {
                $revoker = app(TokenRevoker::class);

                if ($user->wasChanged('active') && ! $user->active) {
                    $revoker->revokeForUser($user, null, 'account deactivated');
                } else {
                    $revoker->revokeWhereNoLongerAllowed($user, 'role changed to '.$user->user_role);
                }
            });
        });

        EnrolledStudent::deleted(function (EnrolledStudent $enrollment) {
            rescue(function () use ($enrollment) {
                if ($student = User::find($enrollment->student_id)) {
                    app(TokenRevoker::class)->revokeWhereNoLongerAllowed($student, 'enrollment removed');
                }
            });
        });
    }
}
