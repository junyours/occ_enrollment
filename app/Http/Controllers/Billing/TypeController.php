<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\BillingType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TypeController extends Controller
{
    public function type()
    {
        return Inertia::render('billing/type');
    }

    public function getType(Request $request)
    {
        $search = $request->search;

        $types = BillingType::select('id', 'type_name')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where("type_name", "like", "%{$search}%");
                });
            })
            ->paginate(50);

        return response()->json($types);
    }

    public function addType(Request $request)
    {
        $request->validate([
            'type_name' => ['required', 'unique:billing_types,type_name']
        ]);

        BillingType::create([
            'type_name' => $request->type_name
        ]);
    }

    public function updateType(Request $request, $id)
    {
        $type = BillingType::findOrFail($id);

        $request->validate([
            'type_name' => ['required', 'unique:billing_types,type_name,' . $id]
        ]);

        $type->update([
            'type_name' => $request->type_name
        ]);
    }
}
