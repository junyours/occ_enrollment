<?php

use App\Models\Faculty;
use App\Models\User;
use App\Models\UserInformation;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('faculty', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('faculty_id');
            $table->foreign('faculty_id')->references('id')->on('users')->onDelete('cascade')->unique();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->foreign('department_id')->references('id')->on('department');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        $user = User::create([
            'user_id_no' => 'FAC-24117',
            'password' => Hash::make('password'),
            'user_role' => 'registrar',
        ]);

        UserInformation::create([
            'user_id' => $user->id,
            'first_name'  => 'BERNADETH',
            'last_name'  => 'NACUA',
            'middle_name'  => 'T',
            'gender'  => 'female',
            'birthday'  => '1990-09-03',
            'contact_number'  => '09993334444',
            'email_address'  => 'nacua.bernadeth@occ.edu.ph',
            'present_address'  => 'Zone ',
            'zip_code'  => '9016',
        ]);
        
        Faculty::create([
            'faculty_id' => $user->id,
            'department_id' => null,
            'active' => 1,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('faculty');
    }
};
