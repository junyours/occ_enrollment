import React, { useState } from 'react'
import { Link } from '@inertiajs/react'
import { ArrowLeft, FolderOpen, Megaphone, UserRound } from 'lucide-react'

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import NavigationTabs from '@/Components/ui/NavigationTabs'
import { formatFullName } from '@/Lib/Utils'
import Classwork from '@/Pages/InstructorClasses/ClassComponents/Classwork'
import Announcements, { NewAnnouncementsBanner, NewAnnouncementsCount } from '@/Pages/InstructorClasses/ClassComponents/Announcements'

function classTitle({ subjectCode, descriptiveTitle, courseSection }) {
    return `${subjectCode} - ${descriptiveTitle}${courseSection ? ` | ${courseSection}` : ''}`
}

const SECTIONS = ['classwork', 'announcements']

// The section named in the URL (?tab=announcements), so links and the Back
// button return to it.
function initialSection() {
    const requested = new URLSearchParams(window.location.search).get('tab')
    return SECTIONS.includes(requested) ? requested : 'classwork'
}

// A student's page for one class: its classwork and announcements. These
// are the same components teachers use; the server decides what each user
// can see and do.
export default function OpenClass({
    id,
    classKey,
    subjectCode,
    descriptiveTitle,
    courseSection,
    instructor,
}) {
    const [tab, setTabState] = useState(initialSection)

    // Keep the section in the URL without a new history entry.
    function setTab(value) {
        setTabState(value)
        const url = new URL(window.location.href)
        url.searchParams.set('tab', value)
        window.history.replaceState(window.history.state, '', url)
    }

    const sections = [
        { value: 'classwork', label: 'Classwork', icon: FolderOpen },
        {
            value: 'announcements',
            label: <>Announcements<NewAnnouncementsCount classId={id} /></>,
            icon: Megaphone,
        },
    ]

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

            <NavigationTabs value={tab} onValueChange={setTab} items={sections} />

            {tab === 'classwork' && (
                <>
                    <NewAnnouncementsBanner classId={id} onOpen={() => setTab('announcements')} />
                    <Classwork
                        classId={id}
                        assignmentHref={(assignmentId) => `/classes/classroom/${classKey}/assignments/${assignmentId}`}
                    />
                </>
            )}

            {tab === 'announcements' && <Announcements classId={id} />}
        </div>
    )
}

OpenClass.layout = (page) => (
    <AuthenticatedLayout title={classTitle(page.props)}>
        {page}
    </AuthenticatedLayout>
)
