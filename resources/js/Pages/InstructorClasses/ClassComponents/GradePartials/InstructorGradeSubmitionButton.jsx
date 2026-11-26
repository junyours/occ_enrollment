import { Button } from '@/Components/ui/button'
import { Clock } from 'lucide-react'
import { formatStamp } from './UploadWindow'

// When a period's grades were verified or deployed: "Verified Sun, Nov 22,
// 9:30 AM".
function Stamp({ label, at }) {
    return (
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <Clock aria-hidden="true" className="size-3.5" />
            {at ? `${label} ${at}` : label}
        </span>
    )
}

// A period's main action, by status. (On the Grades tab the submit and
// unsubmit handlers ask for confirmation first.)
export default function InstructorGradeSubmitionButton({ handleSubmit, disabledButton, handleCancel, type, status }) {
    switch (status.status) {
        case 'draft':
            return (
                <Button variant="outline" onClick={() => handleSubmit(type)} disabled={disabledButton}>
                    Submit grades
                </Button>
            )
        case 'submitted':
            return (
                <Button variant="outline" onClick={() => handleCancel(type)} disabled={disabledButton}>
                    Unsubmit
                </Button>
            )
        case 'rejected':
            return (
                <Button onClick={() => handleSubmit(type)} disabled={disabledButton}>
                    Resubmit grades
                </Button>
            )
        case 'verified':
            return <Stamp label="Verified" at={formatStamp(status.verified_at)} />
        case 'deployed':
            return <Stamp label="Deployed" at={formatStamp(status.deployed_at)} />
        default:
            return null
    }
}
