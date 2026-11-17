import React from 'react'

import { DEFAULT_PROMPT, isAnswered } from './submissionRules'

/**
 * Rows for AnswerList from an assignment's questions and an answers map
 * (question id => answer). A lone default "Your answer" prompt is left out,
 * since the section heading already says it.
 */
export function answerItems(questions, answers) {
    const single = questions.length === 1

    return questions.map((question, index) => ({
        key: question.id,
        label: single ? null : `Question ${index + 1}`,
        prompt: single && question.prompt === DEFAULT_PROMPT ? null : question.prompt,
        type: question.type,
        value: answers?.[question.id] ?? '',
    }))
}

/**
 * Questions with a student's answers, for turned-in work and grading.
 * Answers are plain text, shown with their line breaks.
 */
export default function AnswerList({ items }) {
    return (
        <ol className="space-y-4">
            {items.map((item) => (
                <li key={item.key} className="min-w-0 space-y-1.5">
                    {item.label && (
                        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                    )}
                    {item.prompt && (
                        <p className="whitespace-pre-wrap break-words text-sm font-medium text-foreground">{item.prompt}</p>
                    )}
                    {isAnswered(item.value) ? (
                        <p className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-3 text-sm leading-6">
                            {item.value}
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">No answer</p>
                    )}
                </li>
            ))}
        </ol>
    )
}
