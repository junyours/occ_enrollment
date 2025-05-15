<?php

namespace App\Http\Controllers\SchoolYear;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SchoolYear extends Controller
{
    public function view()
    {
        return Inertia::render('SchoolYear/SchoolYear');
    }
}
