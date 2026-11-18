import React from 'react'

// What each first-run guide says to instructors. Targets are `data-tour`
// attributes; steps whose control isn't on screen are skipped.

const strong = (text) => <strong className="font-medium text-foreground">{text}</strong>

export function assignmentsGuide() {
    return [
        {
            title: 'Welcome to Classwork',
            body: (
                <>
                    <p>
                        Post assignments and materials for this class, collect your students’ work,
                        and grade it, all in one place.
                    </p>
                    <p>This quick guide shows you around. It takes about a minute.</p>
                </>
            ),
            next: 'Start the guide',
        },
        {
            target: '[data-tour="classwork-tabs"]',
            title: 'Assignments and materials',
            body: (
                <>
                    <p>{strong('Assignments')} collect work from your students and record their scores.</p>
                    <p>{strong('Materials')} are handouts, slides and readings students can open anytime.</p>
                </>
            ),
        },
        {
            target: '[data-tour="add-assignment"]',
            title: 'Create an assignment',
            body: (
                <p>
                    Write the instructions, attach files, and choose what students hand in:
                    files, answers to questions, or links. Link it to a grading assessment so
                    scores go straight to {strong('Grading')}.
                </p>
            ),
        },
        {
            target: '[data-tour-item="assignments"]',
            title: 'Open an assignment',
            body: (
                <p>
                    Click an assignment to see its files and your students’ work. Open each
                    submission to give a score and feedback. Use {strong('Edit')} to change it.
                </p>
            ),
        },
        {
            target: '[data-tour="guide-assignments"]',
            title: 'Need a refresher?',
            body: <p>Open this guide again anytime from here.</p>,
            placement: 'left',
        },
    ]
}

export function materialsGuide() {
    return [
        {
            target: '[data-tour="add-material"]',
            title: 'Post a material',
            body: (
                <p>
                    Share handouts, slides and readings. Give it a title, add files and a
                    description, then post it. Students see published materials right away.
                </p>
            ),
        },
        {
            target: '[data-tour-item="materials"]',
            title: 'Keep materials tidy',
            body: (
                <p>
                    Click a material to see its files. {strong('Edit')} it anytime, or{' '}
                    {strong('Archive')} it to hide it from students. Archived materials can be
                    restored, or deleted for good.
                </p>
            ),
        },
    ]
}

const editStep = {
    target: '[data-tour="review-edit"]',
    title: 'Make changes',
    body: <p>Edit the instructions, files, due date or what students hand in. Students see the changes right away.</p>,
    placement: 'left',
}

// The Student work tab of a teacher's assignment page.
export function studentWorkGuide() {
    return [
        {
            target: '[data-tour="review-tabs"]',
            title: 'Everything about this assignment',
            body: (
                <p>
                    {strong('Student work')} shows where each student is. {strong('Instructions')}{' '}
                    shows what you posted and what students hand in.
                </p>
            ),
        },
        {
            target: '[data-tour="review-grade-queue"]',
            title: 'Grade what’s waiting',
            body: (
                <p>
                    Opens each turned-in submission that still needs a score, one after another.{' '}
                    {strong('Save & next')} moves to the next student.
                </p>
            ),
        },
        {
            target: '[data-tour="review-filters"]',
            title: 'Find a student',
            body: <p>Search by name or ID number, or show only the students who still need grading, are graded, or haven’t turned in.</p>,
        },
        {
            target: '[data-tour="review-list"]',
            title: 'Check each student’s work',
            body: (
                <p>
                    Click {strong('Grade')} or {strong('Review')} beside a student to see their work,
                    give a score and leave feedback. Scores are saved to Grading.
                </p>
            ),
            placement: 'top',
        },
        editStep,
    ]
}

// The Instructions tab of a teacher's assignment page.
export function instructionsGuide() {
    return [
        {
            target: '[data-tour="review-instructions"]',
            title: 'What students read',
            body: <p>Your instructions, as students see them on the assignment.</p>,
        },
        {
            target: '[data-tour="review-attachments"]',
            title: 'Attach or remove files',
            body: <p>Add handouts or templates here, or remove ones students no longer need. Students see the change right away.</p>,
        },
        {
            target: '[data-tour="review-materials"]',
            title: 'Related materials',
            body: <p>Materials you linked to this assignment. Students can open them from the assignment.</p>,
        },
        {
            target: '[data-tour="review-hand-in"]',
            title: 'What students hand in',
            body: <p>The kind of work students turn in and its rules, or the questions they answer.</p>,
            placement: 'top',
        },
        editStep,
    ]
}

export function editorGuide({ assignment, editing }) {
    if (!assignment) {
        return [
            {
                target: '[data-tour="editor-details"]',
                title: 'Describe the material',
                body: <p>Give it a clear title. The description is optional: add notes, steps or links.</p>,
            },
            {
                target: '[data-tour="editor-attachments"]',
                title: 'Attach files',
                body: <p>Add slides, PDFs or any other files. Students can preview and download them.</p>,
            },
            {
                target: '[data-tour="editor-actions"]',
                title: editing ? 'Save your changes' : 'Save or post',
                body: editing
                    ? <p>{strong('Save changes')} updates it for your students right away.</p>
                    : <p>{strong('Save draft')} keeps it hidden from students. {strong('Post material')} shares it with the class.</p>,
                placement: 'top',
            },
        ]
    }

    return [
        {
            target: '[data-tour="editor-details"]',
            title: 'Describe the work',
            body: <p>Give the assignment a clear title. Instructions are optional: use them for steps, rubrics or links.</p>,
        },
        {
            target: '[data-tour="editor-attachments"]',
            title: 'Attach files',
            body: <p>Add handouts or templates students need. You can remove attached files later.</p>,
        },
        {
            target: '[data-tour="editor-submit"]',
            title: 'Choose what students hand in',
            body: (
                <p>
                    Pick one: {strong('File upload')}, {strong('Questions')} for typed answers, or{' '}
                    {strong('Links')}. Students see exactly what to hand in, and can’t turn in
                    until it’s done.
                </p>
            ),
        },
        {
            target: '[data-tour="editor-settings"]',
            title: 'Link it to grading',
            body: (
                <p>
                    Choose or create the assessment where scores are saved. Then set an
                    optional due date and whether late work is accepted.
                </p>
            ),
            placement: 'left',
        },
        {
            target: '[data-tour="editor-actions"]',
            title: editing ? 'Save your changes' : 'Save or assign',
            body: editing
                ? <p>{strong('Save changes')} updates the assignment for your students.</p>
                : <p>{strong('Save draft')} keeps it hidden from students. {strong('Assign')} publishes it to the class.</p>,
            placement: 'top',
        },
    ]
}
