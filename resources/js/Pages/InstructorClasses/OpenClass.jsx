import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import React, { useEffect, useState } from 'react'
import { useSeenItems } from '@/Lib/seenItems'

import Students from './ClassComponents/Students'
import Attendance from './ClassComponents/Attendance'
import Grades from './ClassComponents/Grades'
import PreLoader from '@/Components/preloader/PreLoader'
import Grading from './ClassComponents/Grading'
import Materials from './ClassComponents/Materials'
import Classwork from './ClassComponents/Classwork.jsx'
import Announcements from './ClassComponents/Announcements'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select'

import NavigationTabs from '@/Components/ui/NavigationTabs'

import {
    Users,
    CalendarDays,
    ChartNoAxesColumnIncreasing,
    ClipboardList,
    FolderOpen,
    Megaphone,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'


const navigationTabs = [
    {
        value: 'students',
        label: 'Students',
        icon: Users,
    },
    {
        value: 'attendance',
        label: 'Attendance',
        icon: CalendarDays,
    },
    {
        value: 'grades',
        label: 'Grades',
        icon: ChartNoAxesColumnIncreasing,
    },
    {
        value: 'grading',
        label: 'Grading',
        icon: ClipboardList,
    },
    // {
    //     value: 'materials',
    //     label: 'Materials',
    //     icon: FolderOpen,
    // },
    {
        value: 'classwork',
        label: 'Classwork',
        icon: FolderOpen,
    },
    {
        value: 'announcements',
        label: 'Announcements',
        icon: Megaphone,
    },
]

// The tab named in the URL (?tab=classwork), so links and the Back button
// return to the same tab.
function initialTab() {
    const requested = new URLSearchParams(window.location.search).get('tab')
    return navigationTabs.some((item) => item.value === requested) ? requested : 'students'
}

// Recently added sections show a "New" mark until each teacher first opens
// them (remembered on their account, so on every device), and for nobody
// after Dec 11, 2026 (Philippine time).
const NEW_TABS = ['attendance', 'grading', 'classwork', 'announcements']
const NEW_UNTIL = new Date('2026-12-11T00:00:00+08:00').getTime()
const newTabKey = (tab) => `class-tab:${tab}`

function NewMark() {
    return (
        <span className="ml-1.5 inline-flex items-center rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold uppercase leading-4 tracking-wide text-primary-foreground">
            New
        </span>
    )
}

export default function OpenClass({
    subjectCode,
    descriptiveTitle,
    id,
    classKey,
    courseSection,
    gradeStatus,
    schoolYear,
}) {
    const [tab, setTabState] = useState(initialTab)
    const { hasSeen, markSeen } = useSeenItems()
    const showNew = Date.now() < NEW_UNTIL

    // Opening a new section clears its mark for this teacher.
    useEffect(() => {
        if (showNew && NEW_TABS.includes(tab)) markSeen(newTabKey(tab))
    }, [showNew, tab, markSeen])

    const tabs = navigationTabs.map((item) => (
        showNew && NEW_TABS.includes(item.value) && !hasSeen(newTabKey(item.value))
            ? { ...item, label: <>{item.label}<NewMark /><span className="sr-only">, new</span></> }
            : item
    ))

    // Keep the tab in the URL without a new history entry. Inertia's page
    // state stays as it is, so going Back here restores this tab.
    function setTab(value) {
        setTabState(value)
        const url = new URL(window.location.href)
        url.searchParams.set('tab', value)
        window.history.replaceState(window.history.state, '', url)
    }
    const [currentPage, setCurrentPage] = useState(1)

    const getClassStudents = async () => {
        try {
            const response = await axios.post(
                route('class.students', { id })
            )

            return response.data
        } catch (err) {
            console.error(err)
        }
    }

    const { data: students = [], isLoading } = useQuery({
        queryKey: ['class.students', id],
        queryFn: getClassStudents
    })

    const section = `${subjectCode} - ${descriptiveTitle} | ${courseSection}`


    return (
        <div className="flex flex-col gap-4">
            {/* <PageTitle align="center">
                {section}
            </PageTitle> */}

            {/* Desktop navigation */}
            <div className="hidden md:block">
                <NavigationTabs
                    value={tab}
                    onValueChange={setTab}
                    items={tabs}
                />
            </div>

            {/* Mobile: the header truncates the class name, so show it in full. */}
            <div className="space-y-0.5 md:hidden">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {subjectCode} · {courseSection}
                </p>
                <p className="text-base font-semibold leading-snug text-foreground">
                    {descriptiveTitle}
                </p>
            </div>

            {/* Mobile navigation */}
            <div className="block w-full md:hidden">
                <Select
                    value={tab}
                    onValueChange={setTab}
                >
                    <SelectTrigger aria-label="Class section">
                        <SelectValue placeholder="Select Section" />
                    </SelectTrigger>

                    <SelectContent>
                        {tabs.map((item) => (
                            <SelectItem
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                {tab === 'students' && (
                    <Students
                        getClassStudents={getClassStudents}
                        students={students}
                        currentPage={currentPage}
                        setPage={setCurrentPage}
                        isLoading={isLoading}
                        nameClass={section}
                    />
                )}

                {tab === 'attendance' && (
                    <Attendance classId={id} section={section} />
                )}

                {/* The grade sheet takes its rows from the students once, when it
                    opens, so it waits for them: opened straight from a link, it
                    would otherwise start (and stay) empty. */}
                {tab === 'grades' && isLoading && (
                    <div className="grid min-h-[240px] place-items-center">
                        <PreLoader />
                    </div>
                )}

                {tab === 'grades' && !isLoading && (
                    <Grades
                        students={students}
                        subjectCode={subjectCode}
                        descriptiveTitle={descriptiveTitle}
                        courseSection={courseSection}
                        yearSectionSubjectsId={id}
                        gradeStatus={gradeStatus}
                        getClassStudents={getClassStudents}
                        schoolYear={schoolYear}
                    />
                )}

                {tab === 'grading' && (
                    <Grading classId={id} />
                )}

                {tab === 'classwork' && (
                    <Classwork
                        classId={id}
                        assignmentHref={(assignmentId) => `/classes/classroom/${classKey}/assignments/${assignmentId}`}
                    />
                )}

                {/* {tab === 'materials' && (
                    <Materials />
                )} */}

                {tab === 'announcements' && (
                    <Announcements classId={id} />
                )}
            </div>
        </div>
    )
}

OpenClass.layout = (page) => {
    const {
        subjectCode,
        descriptiveTitle,
        courseSection,
    } = page.props

    const section = `${subjectCode} - ${descriptiveTitle} | ${courseSection}`

    return (
        <AuthenticatedLayout title={section}>
            {page}
        </AuthenticatedLayout>
    )
}