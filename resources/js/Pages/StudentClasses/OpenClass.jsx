import React from 'react'
import { Link } from '@inertiajs/react'
import { ArrowLeft, UserRound } from 'lucide-react'

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { formatFullName } from '@/Lib/Utils'
import Classwork from '@/Pages/InstructorClasses/ClassComponents/Classwork'

function classTitle({ subjectCode, descriptiveTitle, courseSection }) {
    return `${subjectCode} - ${descriptiveTitle}${courseSection ? ` | ${courseSection}` : ''}`
}

// A student's page for one class: its assignments and materials. Classwork
// is the same component teachers use; the server decides what each user
// can see and do.
export default function OpenClass({
    id,
    classKey,
    subjectCode,
    descriptiveTitle,
    courseSection,
    instructor,
}) {
    return (
        <div className="flex min-w-0 flex-col gap-4">
            <div className="space-y-3">
                <Link
                    href={route('classes')}
                    className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    All classes
                </Link>

                <div className="space-y-1">
                    {instructor && (
                        <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                            <UserRound className="size-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                                Instructor: <span className="text-foreground">{formatFullName(instructor)}</span>
                            </span>
                        </p>
                    )}
                </div>
            </div>

            <Classwork
                classId={id}
                assignmentHref={(assignmentId) => `/classes/classroom/${classKey}/assignments/${assignmentId}`}
            />
        </div>
    )
}

OpenClass.layout = (page) => (
    <AuthenticatedLayout title={classTitle(page.props)}>
        {page}
    </AuthenticatedLayout>
)
