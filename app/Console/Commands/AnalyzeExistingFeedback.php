<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FeedbackAnalyzerService;
use App\Models\EvaluationFeedback;
use App\Models\FeedbackAnalysis;

class AnalyzeExistingFeedback extends Command
{
    protected $signature = 'feedback:analyze-existing
                            {--only-missing : Analyze only feedback without analysis rows}
                            {--evaluation_id= : Limit to one evaluation_session_id}
                            {--faculty_id= : Limit to one faculty (via student_subjects/year_section_subjects)}
                            {--chunk=200 : Chunk size}';

    protected $description = 'Analyze existing evaluation_feedback and populate feedback_analysis';

    public function handle(FeedbackAnalyzerService $analyzer)
{
    $count = EvaluationFeedback::whereDoesntHave('analyses')->count();
    $this->info("To analyze: {$count}");

    EvaluationFeedback::whereDoesntHave('analyses')
        ->orderBy('id')
        ->chunk(200, function ($rows) use ($analyzer) {
            foreach ($rows as $fb) {
                $analyzer->analyze($fb);
            }
        });

    $this->info("Done ✅");
}
}
