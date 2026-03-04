<?php

namespace App\Services;

use App\Models\FeedbackKeyword;
use App\Models\FeedbackAnalysis;
use App\Models\UnknownFeedbackKeyword;

class FeedbackAnalyzerService
{
    // Optional: stopwords so you don't flood unknown queue
    private array $stopwords = [
        // English
        'the',
        'and',
        'or',
        'but',
        'so',
        'to',
        'of',
        'in',
        'on',
        'at',
        'for',
        'with',
        'a',
        'an',
        'is',
        'are',
        'was',
        'were',
        'it',
        'this',
        'that',
        // Tagalog
        'ang',
        'ng',
        'sa',
        'na',
        'pa',
        'po',
        'opo',
        'si',
        'sila',
        'kami',
        'tayo',
        'kayo',
        'ako',
        'ikaw',
        'siya',
        'mga',
        'yung',
        'yan',
        'ito',
        // Bisaya
        'ug',
        'og',
        'sa',
        'kay',
        'si',
        'sila',
        'kami',
        'kamo',
        'ako',
        'ikaw',
        'siya',
        'mga',
        'adto',
        'ani',
        'kana',
        'ni',
        'nga'
    ];

    public function analyze($feedback): void
    {

        // If you re-run analysis, clear previous analysis rows first (recommended)
        FeedbackAnalysis::where('evaluation_feedback_id', $feedback->id)->delete();

        $raw = strtolower(trim(($feedback->strengths ?? '') . ' ' . ($feedback->weaknesses ?? '')));

        // Clean punctuation (unicode safe)
        $clean = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $raw);
        $clean = preg_replace('/\s+/', ' ', $clean);

        if (!$clean) {
            $feedback->update(['sentiment' => 'neutral', 'sentiment_score' => 0]);
            return;
        }

        $tokens = explode(' ', $clean);

        // Load all keywords (assume stored lowercase)
        $all = FeedbackKeyword::all();

        // Separate phrases vs single words
        $phrases = $all->filter(fn($k) => str_contains($k->keyword, ' '))
            ->sortByDesc(fn($k) => substr_count($k->keyword, ' ')); // longest first

        $words = $all->filter(fn($k) => !str_contains($k->keyword, ' '))
            ->keyBy('keyword');

        $used = array_fill(0, count($tokens), false); // token consumption
        $score = 0;

        // ---------- A) PHRASE MATCHING FIRST ----------
        foreach ($phrases as $kw) {
            $phrase = strtolower(trim($kw->keyword));
            $phrase = preg_replace('/\s+/', ' ', $phrase);

            $phraseTokens = explode(' ', $phrase);
            $n = count($phraseTokens);
            if ($n < 2) continue;

            for ($i = 0; $i <= count($tokens) - $n; $i++) {

                // if any token already used by a longer phrase, skip
                $blocked = false;
                for ($j = 0; $j < $n; $j++) {
                    if ($used[$i + $j]) {
                        $blocked = true;
                        break;
                    }
                }
                if ($blocked) continue;

                // compare window
                $window = array_slice($tokens, $i, $n);
                if ($window === $phraseTokens) {

                    // sentiment score
                    $score += $this->sentimentToScore($kw->sentiment);

                    // save analysis
                    FeedbackAnalysis::create([
                        'evaluation_feedback_id' => $feedback->id,
                        'feedback_category_id'   => $kw->feedback_category_id,
                        'type'                   => $kw->type,
                        'match_count'            => 1,
                    ]);

                    // consume tokens so single words inside won't be counted
                    for ($j = 0; $j < $n; $j++) {
                        $used[$i + $j] = true;
                    }
                }
            }
        }

        // ---------- B) SINGLE-WORD MATCHING (only unused tokens) ----------
        for ($i = 0; $i < count($tokens); $i++) {
            if ($used[$i]) continue;

            $w = strtolower(trim($tokens[$i]));
            if ($w === '' || mb_strlen($w) <= 2) continue;
            if (in_array($w, $this->stopwords, true)) continue;

            if ($words->has($w)) {
                $kw = $words[$w];

                // Optional negation flip: "not good", "dili klaro"
                $negated = $this->isNegated($tokens, $i);

                $base = $this->sentimentToScore($kw->sentiment);
                $score += $negated ? (-1 * $base) : $base;

                FeedbackAnalysis::create([
                    'evaluation_feedback_id' => $feedback->id,
                    'feedback_category_id'   => $kw->feedback_category_id,
                    'type'                   => $kw->type,
                    'match_count'            => 1,
                ]);
            } else {
                // queue unknown word
                $this->queueUnknown($w, $raw);
            }
        }

        // ---------- C) Save overall sentiment ----------
        $sentiment = $score > 0 ? 'positive' : ($score < 0 ? 'negative' : 'neutral');

        $feedback->update([
            'sentiment'       => $sentiment,
            'sentiment_score' => $score,
        ]);
    }

    private function sentimentToScore(?string $sentiment): int
    {
        return match ($sentiment) {
            'positive' => 1,
            'negative' => -1,
            default    => 0,
        };
    }

    private function isNegated(array $tokens, int $i): bool
    {
        $negators = ['not', 'no', 'never', 'dili', 'wala', 'way', 'ayaw', 'hindi', 'di'];

        $prev = $i > 0 ? strtolower($tokens[$i - 1]) : null;
        if ($prev && in_array($prev, $negators, true)) return true;

        $prev2 = $i > 1 ? strtolower($tokens[$i - 2]) : null;
        if ($prev2 && in_array($prev2, $negators, true)) return true;

        return false;
    }

    private function queueUnknown(string $term, string $sample): void
    {
        $term = strtolower(trim($term));
        $term = preg_replace('/\s+/', ' ', $term);

        if ($term === '' || mb_strlen($term) <= 2) return;
        if (in_array($term, $this->stopwords, true)) return;

        $row = UnknownFeedbackKeyword::where('term', $term)->first();

        if ($row) {
            $row->increment('count');
        } else {
            UnknownFeedbackKeyword::create([
                'term'        => $term,
                'count'       => 1,
                'sample_text' => $sample,
                'status'      => 'pending',
            ]);
        }
    }
}
