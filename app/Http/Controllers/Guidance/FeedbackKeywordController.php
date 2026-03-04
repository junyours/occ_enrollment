<?php

namespace App\Http\Controllers\Guidance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\FeedbackKeyword;
use App\Models\FeedbackCategory;
use App\Models\Language;
use App\Models\EvaluationFeedback;
use App\Services\FeedbackAnalyzerService;

class FeedbackKeywordController extends Controller
{
    public function index()
    {
        return inertia('Guidance/FeedbackKeywords/Index', [
            'keywords' => FeedbackKeyword::with(['category', 'language'])->get(),
            'categories' => FeedbackCategory::all(),
            'languages' => Language::all(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'feedback_category_id' => 'required|exists:feedback_categories,id',
            'language_id' => 'required|exists:languages,id',
            'keyword' => 'required|string',
            'type' => 'required|in:strength,weakness',
            'sentiment' => 'required|in:positive,neutral,negative',
        ]);

        $keyword = strtolower(trim($request->keyword));
        $keyword = preg_replace('/\s+/', ' ', $keyword);

        FeedbackKeyword::create([
            'feedback_category_id' => $request->feedback_category_id,
            'language_id' => $request->language_id,
            'keyword' => $keyword,
            'type' => $request->type,
            'sentiment' => $request->sentiment,
        ]);

        return back()->with('success', 'Keyword added');
    }

    public function update(Request $request, string $id, FeedbackAnalyzerService $analyzer)
    {
        $request->validate([
            'feedback_category_id' => 'required|exists:feedback_categories,id',
            'language_id' => 'required|exists:languages,id',
            'keyword' => 'required|string',
            'type' => 'required|in:strength,weakness',
            'sentiment' => 'required|in:positive,neutral,negative',
        ]);

        $row = FeedbackKeyword::findOrFail($id);

        // ✅ keep old keyword for matching (important if user edits keyword text)
        $oldKeyword = $row->keyword;

        $newKeyword = strtolower(trim($request->keyword));
        $newKeyword = preg_replace('/\s+/', ' ', $newKeyword);

        // 1) update keyword row
        $row->update([
            'feedback_category_id' => $request->feedback_category_id,
            'language_id' => $request->language_id,
            'keyword' => $newKeyword,
            'type' => $request->type,
            'sentiment' => $request->sentiment,
        ]);

        // 2) re-analyze affected feedback rows
        $affectedFeedback = EvaluationFeedback::query()
            ->where(function ($q) use ($oldKeyword, $newKeyword) {
                $q->where('strengths', 'like', '%' . $oldKeyword . '%')
                  ->orWhere('weaknesses', 'like', '%' . $oldKeyword . '%')
                  ->orWhere('strengths', 'like', '%' . $newKeyword . '%')
                  ->orWhere('weaknesses', 'like', '%' . $newKeyword . '%');
            })
            ->get();

        foreach ($affectedFeedback as $fb) {
            $analyzer->analyze($fb); // ✅ should overwrite feedback_analysis for this feedback
        }

        return back()->with(
            'success',
            'Keyword updated and affected faculty results were recalculated.'
        );
    }

    public function destroy(string $id)
    {
        FeedbackKeyword::findOrFail($id)->delete();
        return back()->with('success', 'Keyword deleted');
    }
}
