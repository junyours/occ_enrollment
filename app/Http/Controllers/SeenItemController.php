<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Remembers that the signed-in user has seen something once, like a guide
 * or a "New" label, so it stays hidden on every device. Pages get the list
 * with the user (auth.user.seen).
 */
class SeenItemController extends Controller
{
    // Enough for every guide and label; keeps the shared list small.
    private const MAX_ITEMS = 200;

    public function store(Request $request)
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9][a-z0-9:._-]*$/'],
        ]);

        $userId = $request->user()->id;
        $items = DB::table('user_seen_items')->where('user_id', $userId);

        if ((clone $items)->where('key', $data['key'])->exists()) {
            return response()->json(['seen' => true]);
        }

        if ($items->count() >= self::MAX_ITEMS) {
            throw ValidationException::withMessages([
                'key' => 'Too many saved items.',
            ]);
        }

        // Two tabs saving at once: the unique index keeps one row.
        DB::table('user_seen_items')->insertOrIgnore([
            'user_id' => $userId,
            'key' => $data['key'],
            'seen_at' => now(),
        ]);

        return response()->json(['seen' => true]);
    }
}
