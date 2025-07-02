<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CorController extends Controller
{

    public function registrarSignature()
    {
        $path = '\signatures\registrar.png';

        // if (!Storage::exists($path)) {
        //     abort(404, 'Signature not found');
        // }

        return response()->file(storage_path("app/{$path}"), [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'inline',
        ]);
    }

    public function billingAssessmentSignature()
    {
        $path = ("\signatures\billing.png");

        // if (!file_exists($path)) {
        //     abort(404, 'Signature not found');
        // }

        return response()->file(storage_path("app/{$path}"), [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'inline'
        ]);
    }
}
