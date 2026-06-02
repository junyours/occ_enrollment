import React from 'react'
import { Badge } from "@/Components/ui/badge"
import { cn } from '@/Lib/Utils'
import { userRoles } from '@/Lib/UsersUtility'

const getRoleStyles = (role) => {
    switch (role) {
        // TIER 1: Executive / Critical Admin
        case 'super_admin':
        case 'president':
        case 'vpaa':
            return "bg-red-500/15 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-900"

        // TIER 2: Department Heads / Operational Admin
        case 'registrar':
        case 'mis':
        case 'nstp_director':
        case 'program_head':
            return "bg-indigo-500/15 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-900"

        // TIER 3: Academic / Specialized Coordinators
        case 'faculty':
        case 'research_coordinator':
        case 'ojt_coordinator':
        case 'gened_coordinator':
            return "bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-900"

        // TIER 4: Student Services / Support
        case 'librarian':
        case 'guidance':
        case 'evaluator':
        case 'announcement_admin':
            return "bg-amber-500/15 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-900"

        // TIER 5: General User
        case 'student':
        default:
            return "bg-slate-500/15 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-800"
    }
}

export default function UserRoleBadge({ role }) {
    const allRoles = userRoles()
    const roleData = allRoles.find((r) => r.value === role)
    const label = roleData ? roleData.label : role

    return (
        <Badge
            variant="outline"
            className={cn(
                "px-2.5 py-0.5 font-semibold transition-colors",
                getRoleStyles(role)
            )}
        >
            {label}
        </Badge>
    )
}