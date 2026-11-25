import { useEffect, useRef } from 'react'
import { Link, router, usePage, usePoll } from '@inertiajs/react'
import { CalendarDays } from 'lucide-react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Button } from '@/Components/ui/button'
import { formatName } from '@/Lib/InfoUtils'
import { cn } from '@/Lib/Utils'
import ClassList from './Partials/ClassList'
import StudentsToWatch from './Partials/StudentsToWatch'
import TodayClasses from './Partials/TodayClasses'
import TodoList from './Partials/TodoList'
import { formatDay, schoolHour } from './dashboardUtils'

// Keeps the numbers current while the page stays open: every few minutes,
// and right away on coming back to the tab after a while.
function useFreshDashboard() {
    usePoll(3 * 60 * 1000, { only: ['dashboard'] })
    const hiddenAt = useRef(null)

    useEffect(() => {
        const onChange = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAt.current = Date.now()
                return
            }

            if (hiddenAt.current && Date.now() - hiddenAt.current > 60 * 1000) {
                router.reload({ only: ['dashboard'] })
            }

            hiddenAt.current = null
        }

        document.addEventListener('visibilitychange', onChange)

        return () => document.removeEventListener('visibilitychange', onChange)
    }, [])
}

function greeting(hour) {
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'

    return 'Good evening'
}

function semesterLabel(schoolYear) {
    if (!schoolYear) return null

    return [schoolYear.semester && `${schoolYear.semester} Semester`, `${schoolYear.start_year}–${schoolYear.end_year}`]
        .filter(Boolean)
        .join(' ')
}

function NoClasses({ schoolYear }) {
    return (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
            <CalendarDays aria-hidden="true" className="size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">
                {schoolYear ? 'No classes this semester' : 'No current semester'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {schoolYear
                    ? 'Classes assigned to you will show up here.'
                    : 'Your classes will show up here once the registrar sets the current semester.'}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/classes">All classes</Link>
            </Button>
        </div>
    )
}

export default function Dashboard({ dashboard }) {
    useFreshDashboard()

    const { auth } = usePage().props
    const {
        school_year: schoolYear,
        now,
        drop_after: dropAfter,
        today: meetings,
        todo,
        watch,
        classes,
    } = dashboard

    // `now` is school time, so its date is the school's today.
    const today = now.slice(0, 10)
    const name = formatName({ first_name: auth.user.first_name }, { defaultValue: '' })
    const semester = semesterLabel(schoolYear)

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                    {greeting(schoolHour(now))}{name && `, ${name}`}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {formatDay(today, { weekday: 'long', month: 'long', year: 'numeric' })}
                    {semester && <> · <span className="whitespace-nowrap">{semester}</span></>}
                </p>
            </div>

            {classes.length === 0 ? (
                <NoClasses schoolYear={schoolYear} />
            ) : (
                <>
                    <div className={cn(
                        'grid grid-cols-1 gap-6',
                        // The watch list sits beside Today and To do on wide screens,
                        // between them on narrow ones.
                        watch.length > 0 && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:grid-rows-[auto_1fr] xl:items-start',
                    )}>
                        <TodayClasses meetings={meetings} className="xl:col-start-1" />
                        {watch.length > 0 && (
                            <StudentsToWatch
                                students={watch}
                                dropAfter={dropAfter}
                                today={today}
                                className="xl:col-start-2 xl:row-span-2 xl:row-start-1"
                            />
                        )}
                        <TodoList items={todo} today={today} className="xl:col-start-1" />
                    </div>

                    <ClassList classes={classes} today={today} />
                </>
            )}
        </div>
    )
}

Dashboard.layout = (page) => <AuthenticatedLayout title="Dashboard" children={page} />
