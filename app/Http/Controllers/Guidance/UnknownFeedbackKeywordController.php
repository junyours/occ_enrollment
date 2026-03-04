<?php

namespace App\Http\Controllers\Guidance;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use App\Models\UnknownFeedbackKeyword;
use App\Models\FeedbackKeyword;
use App\Models\FeedbackCategory;
use App\Models\Language;
use Illuminate\Http\Request;

class UnknownFeedbackKeywordController extends Controller
{
    public function index()
    {
        return Inertia::render(
            'Guidance/UnknownKeywords/Index',
            [
                'unknownKeywords' =>
                    UnknownFeedbackKeyword::pending()
                        ->latest()
                        ->get(),
                'mode' => 'pending',
                'categories' => FeedbackCategory::all(),
                'languages' => Language::all(),
            ]
        );
    }

    public function approve(Request $request, $id)
    {
        $request->validate([
            'feedback_category_id' => 'required',
            'language_id' => 'required',
            'type' => 'required|in:strength,weakness',
            'sentiment' => 'required|in:positive,neutral,negative',
        ]);

        $unknown = UnknownFeedbackKeyword::findOrFail($id);

        // move to real keywords
        FeedbackKeyword::create([
            'keyword' => $unknown->term,
            'feedback_category_id' => $request->feedback_category_id,
            'language_id' => $request->language_id,
            'type' => $request->type,
            'sentiment' => $request->sentiment,
        ]);

        $unknown->approve();

        return back();
    }

    public function reject($id)
    {
        UnknownFeedbackKeyword::findOrFail($id)
            ->reject();

        return back();
    }

    public function rejected()
    {
        return Inertia::render('Guidance/UnknownKeywords/Index', [
            'unknownKeywords' => UnknownFeedbackKeyword::rejected()->latest()->get(),
            'mode' => 'rejected', // ✅ tells frontend which tab
            'categories' => FeedbackCategory::all(),
            'languages' => Language::all(),
        ]);
    }

    public function destroy($id)
    {
        UnknownFeedbackKeyword::findOrFail($id)->delete();
        return back()->with('success', 'Keyword deleted permanently.');
    }
}
