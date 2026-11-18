import React from 'react'
import { usePage } from '@inertiajs/react'

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import AssignmentPage from '@/Pages/InstructorClasses/ClassComponents/Classwork/Assignments/AssignmentPage'
import { ClassworkProvider } from '@/Pages/InstructorClasses/ClassComponents/Classwork/Shared/api'

// A student's page for one assignment in one of their classes.
export default function Assignment({
    id,
    classKey,
    descriptiveTitle,
    instructor,
    assignmentId,
}) {
    const { auth } = usePage().props

    return (
        <ClassworkProvider
            key={`${auth.user.id}:${id}`}
            classId={id}
            userId={auth.user.id}
        >
            <AssignmentPage
                assignmentId={assignmentId}
                backHref={`/classes/classroom/${classKey}`}
                backLabel={descriptiveTitle}
                instructor={instructor}
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
