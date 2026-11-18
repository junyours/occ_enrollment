import React from 'react'
import { usePage } from '@inertiajs/react'

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import ReviewPage from './ClassComponents/Classwork/Assignments/ReviewPage'
import { ClassworkProvider } from './ClassComponents/Classwork/Shared/api'

// A teacher's page for one assignment: their students' work on it.
export default function Assignment({ id, classKey, descriptiveTitle, assignmentId }) {
    const { auth } = usePage().props

    return (
        <ClassworkProvider
            key={`${auth.user.id}:${id}`}
            classId={id}
            userId={auth.user.id}
        >
            <ReviewPage
                assignmentId={assignmentId}
                backHref={`/classes/classroom/${classKey}?tab=classwork`}
                backLabel={descriptiveTitle}
            />
        </ClassworkProvider>
    )
}

Assignment.layout = (page) => {
    const { assignmentTitle, subjectCode } = page.props

    return (
        <AuthenticatedLayout title={`${assignmentTitle} · ${subjectCode}`}>
            {page}
        </AuthenticatedLayout>
    )
}
