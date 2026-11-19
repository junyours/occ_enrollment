import React from 'react'
import { Link } from '@inertiajs/react'
import { Megaphone } from 'lucide-react'

// "2 new" beside a class in the student's class list; opens its announcements.
export default function NewAnnouncementsBadge({ classInfo, href }) {
    const count = Number(classInfo.unread_announcements) || 0

    if (!count || !href) return null

    return (
        <Link
            href={`${href}?tab=announcements`}
            aria-label={`${count} new announcement${count === 1 ? '' : 's'} in ${classInfo.descriptive_title}`}
            className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
            <Megaphone className="size-3" aria-hidden="true" />
            {count > 9 ? '9+' : count} new
        </Link>
    )
}
