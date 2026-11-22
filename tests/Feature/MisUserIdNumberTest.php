<?php

namespace Tests\Feature;

use App\Http\Middleware\DatabaseBasedMaintenance;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogAuthenticatedUserActivity;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MisUserIdNumberTest extends TestCase
{
    private User $mis;

    protected function setUp(): void
    {
        parent::setUp();

        // Build only isolated in-memory tables; never run production migrations.
        config([
            'app.key' => str_repeat('a', 32),
            'database.default' => 'sqlite',
            'database.connections.sqlite' => [
                'driver' => 'sqlite', 'url' => null, 'database' => ':memory:',
                'prefix' => '', 'foreign_key_constraints' => true,
            ],
            'session.driver' => 'array', 'cache.default' => 'array',
            'mail.default' => 'array', 'hashing.bcrypt.rounds' => 4,
        ]);
        DB::purge('sqlite');
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
        $this->withoutMiddleware([
            DatabaseBasedMaintenance::class, EnsurePasswordChanged::class,
            HandleInertiaRequests::class, LogAuthenticatedUserActivity::class,
        ]);

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('user_id_no')->unique();
            $table->string('user_role');
            $table->string('email')->nullable();
            $table->string('password');
            $table->boolean('password_change')->default(true);
            $table->boolean('active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('user_information', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->timestamps();
        });

        $this->mis = User::forceCreate([
            'user_id_no' => 'MIS-0001',
            'user_role' => 'mis',
            'password' => 'secret',
        ]);
    }

    public function test_creating_a_user_stores_the_id_number_in_uppercase(): void
    {
        $this->actingAs($this->mis)
            ->post('/mis/users', [
                'user_id_no' => 'fac-0042',
                'user_role' => 'faculty',
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ])
            ->assertRedirect(route('mis-users'));

        $this->assertDatabaseHas('users', ['user_id_no' => 'FAC-0042']);
    }

    public function test_editing_a_user_stores_the_id_number_in_uppercase(): void
    {
        $user = User::forceCreate([
            'user_id_no' => 'FAC-0042',
            'user_role' => 'faculty',
            'password' => 'secret',
        ]);

        $this->actingAs($this->mis)
            ->put("/mis/users/{$user->id}", [
                'user_id_no' => 'fac-0042',
                'user_role' => 'faculty',
            ])
            ->assertRedirect(route('mis-users'));

        $this->assertSame('FAC-0042', $user->fresh()->user_id_no);
    }
}
