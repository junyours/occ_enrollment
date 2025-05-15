<?php

namespace App\Http\Controllers\Department;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    public function view()
    {
        return Inertia::render('Department/Department');
    }
}
