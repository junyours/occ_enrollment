<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Models\UserInformation;
use App\Models\UserParents;
use App\Models\UserPresentAddress;

Route::middleware(['auth', 'maintenance'])->post('/update-additional-info', function (Request $request) {
    $userId = $request->user()->id; // or however you get the user ID

    $addressParts = array_filter([
        $request->street,
        $request->barangay,
        $request->city,
        $request->province
    ]);

    $presentAddress = implode(', ', $addressParts);

    UserInformation::where('user_id', $userId)
        ->update([
            'suffix' => $request->suffix,
            'nationality' => $request->nationality,
            'religion' => $request->religion,
            'present_address' => $presentAddress,
            'zip_code' => $request->zipCode,
            'civil_status' => $request->civilStatus,
            'birthday' => $request->birthday,
        ]);

    UserPresentAddress::updateOrCreate(
        ['user_id' => $userId],
        [
            'street' => $request->street,
            'barangay' => $request->barangay,
            'barangay_code' => $request->barangayCode,
            'city' => $request->city,
            'city_code' => $request->cityCode,
            'province' => $request->province,
            'province_code' => $request->provinceCode,
            'region' => $request->region,
            'region_code' => $request->regionCode,
            'zip_code' => $request->zipCode,
        ]
    );

    UserParents::updateOrCreate(
        ['user_id' => $userId],
        [
            'father_first_name' => $request->fatherFirstName,
            'father_last_name' => $request->fatherLastName,
            'father_middle_name' => $request->fatherMiddleName,
            'father_suffix' => $request->fatherSuffix,
            'father_contact_number' => $request->fatherContact,
            'mother_first_name' => $request->motherFirstName,
            'mother_maiden_last_name' => $request->motherLastName,
            'mother_middle_name' => $request->motherMiddleName,
            'mother_suffix' => $request->motherSuffix,
            'mother_contact_number' => $request->motherContact,
        ]
    );
})->name('update-additional-info');
