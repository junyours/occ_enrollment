<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_assignment_questions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('assignment_id')
                ->constrained('class_assignments')
                ->cascadeOnDelete();

            $table->unsignedInteger('position')->default(0);

            // essay | short_answer (multiple choice comes later).
            $table->string('type', 30);
            $table->text('prompt');
            $table->boolean('required')->default(false);

            // Removed questions are soft-deleted so answers already turned
            // in for them are kept.
            $table->softDeletes();
            $table->timestamps();

            $table->index(['assignment_id', 'position']);
        });

        Schema::create('class_submission_answers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('submission_id')
                ->constrained('class_submissions')
                ->cascadeOnDelete();

            $table->foreignId('question_id')
                ->constrained('class_assignment_questions')
                ->cascadeOnDelete();

            $table->text('answer')->nullable();
            $table->timestamps();

            $table->unique(['submission_id', 'question_id']);
        });

        // Each assignment now takes one kind of work, file upload by default.
        // Assignments where students only ever typed an answer (no files)
        // become a single "Your answer" question, so that work stays in use.
        // Typed answers on file assignments move to a removed "Your answer"
        // question, so teachers and students still see them. The old
        // class_submissions.answer column is left untouched.
        DB::table('class_assignments')->orderBy('id')->chunkById(200, function ($assignments) {
            foreach ($assignments as $assignment) {
                $settings = json_decode($assignment->submission_settings ?? '', true);
                $settings = is_array($settings) ? $settings : [];

                $submissions = DB::table('class_submissions')
                    ->where('assignment_id', $assignment->id);

                $typed = (clone $submissions)
                    ->whereNotNull('answer')
                    ->where('answer', '<>', '')
                    ->exists();

                $uploaded = DB::table('classwork_files')
                    ->whereIn('submission_id', (clone $submissions)->select('id'))
                    ->exists();

                $type = in_array($settings['type'] ?? null, ['files', 'questions', 'links'], true)
                    ? $settings['type']
                    : ($typed && ! $uploaded ? 'questions' : 'files');

                DB::table('class_assignments')
                    ->where('id', $assignment->id)
                    ->update(['submission_settings' => json_encode(['type' => $type] + $settings)]);

                if ($type !== 'questions' && ! $typed) {
                    continue;
                }

                $questionId = DB::table('class_assignment_questions')->insertGetId([
                    'assignment_id' => $assignment->id,
                    'position' => 1,
                    'type' => 'essay',
                    'prompt' => 'Your answer',
                    'required' => true,
                    'deleted_at' => $type === 'questions' ? null : now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('class_submissions')
                    ->where('assignment_id', $assignment->id)
                    ->whereNotNull('answer')
                    ->where('answer', '<>', '')
                    ->orderBy('id')
                    ->chunkById(500, function ($submissions) use ($questionId) {
                        DB::table('class_submission_answers')->insert(
                            $submissions->map(fn($submission) => [
                                'submission_id' => $submission->id,
                                'question_id' => $questionId,
                                'answer' => $submission->answer,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ])->all()
                        );
                    });
            }
        });
    }

    public function down(): void
    {
        // Answers written before this change are still in class_submissions.answer.
        Schema::dropIfExists('class_submission_answers');
        Schema::dropIfExists('class_assignment_questions');
    }
};
