<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * School rules for each app that signs people in through SIS-OCC.
 * Passport's own oauth_* tables are left as Passport ships them, apart from
 * the optional `scopes` column Passport reads to limit what a client may request.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('oauth_clients', function (Blueprint $table) {
            // Read by Passport: scopes outside this list are never granted to the client.
            $table->text('scopes')->nullable()->after('grant_types');
        });

        Schema::create('oauth_client_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('oauth_client_id')->unique()->constrained('oauth_clients')->cascadeOnDelete();
            $table->string('description', 500)->nullable();
            $table->string('homepage_url')->nullable();
            // Which SIS roles may sign in, for example ["student", "faculty"].
            $table->json('allowed_roles');
            // Students must have an enrollment record in the current school year.
            $table->boolean('requires_enrollment')->default(false);
            // School-owned apps skip the "allow access?" screen.
            $table->boolean('skips_consent')->default(true);
            // active | suspended. A suspended app can't sign anyone in.
            $table->string('status', 20)->default('active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('oauth_client_maintainers', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('oauth_client_id')->constrained('oauth_clients')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['oauth_client_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_client_maintainers');
        Schema::dropIfExists('oauth_client_settings');

        Schema::table('oauth_clients', function (Blueprint $table) {
            $table->dropColumn('scopes');
        });
    }
};
