<?php

use App\Models\NstpComponent;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('nstp_components', function (Blueprint $table) {
            $table->id();
            $table->string('component_name')->unique();
            $table->timestamps();
        });

        NstpComponent::create([
            'component_name' => 'rotc',
        ]);
        NstpComponent::create([
            'component_name' => 'cwts',
        ]);
        NstpComponent::create([
            'component_name' => 'lts',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nstp_components');
    }
};
