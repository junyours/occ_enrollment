<?php

use App\Models\User;
use App\Models\UserInformation;
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
        Schema::table('contact', function (Blueprint $table) {
            $users = UserInformation::all();

            foreach ($users as $user) {
                // Normalize contact number
                $number = preg_replace('/\D/', '', $user->contact_number);
                if (strlen($number) === 10) {
                    $number = '0' . $number;
                }
                if (strlen($number) !== 11 || $number[0] !== '0') {
                    continue; // skip invalid numbers
                }

                // Normalize email
                $email = strtolower($user->email_address);

                // Update UserInformation
                $user->update([
                    'contact_number' => $number,
                    'email_address' => $email,
                ]);

                // Update related User model
                User::where('id', $user->user_id)->update([
                    'email' => $email,
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contact', function (Blueprint $table) {
            //
        });
    }
};
