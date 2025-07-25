import { useState } from 'react'
import { Button } from '@/Components/ui/button'
import { convertToAMPM } from '@/Lib/Utils'
import { Clock, Loader2, Send } from "lucide-react"

export default function InstructorSubmitButton({ gradeSubmission, onSubmit, cancel }) {
    const {
        submitted_at,
        is_submitted,
        is_verified,
        is_deployed,
        is_rejected,
    } = gradeSubmission ?? {}

    const [loading, setLoading] = useState(false)

    const canSubmit = !is_submitted || is_rejected
    const disabled = is_deployed || is_verified || loading

    // When submitted but pending approval
    if (!canSubmit && !disabled) {
        const [submittedDate, submittedTimeRaw] = submitted_at.split(' ')
        const [hour, minute] = submittedTimeRaw.split(':')
        const submittedTime = `${hour}:${minute}`

        return (
            <div className="w-full flex items-end justify-end">
                <div className="flex flex-col gap-1 text-sm text-yellow-800 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 shadow-md max-w-md w-fit">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span>
                            Submitted on <span className="font-semibold">{submittedDate}</span> at{' '}
                            <span className="font-semibold">{convertToAMPM(submittedTime)}</span>
                        </span>
                    </div>
                    <span className="pl-6 text-sm italic text-yellow-700">Awaiting approval</span>
                    <Button
                        onClick={async () => {
                            setLoading(true)
                            try {
                                await cancel()
                            } finally {
                                setLoading(false)
                            }
                        }}
                        variant='destructive'
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        )
    }

    // When already deployed or approved
    if (is_deployed || is_verified) {
        return (
            <div className="w-full flex items-end justify-end">
                <span className="inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-300 rounded-xl px-4 py-2 shadow-md">
                    <Clock className="w-4 h-4 text-green-600" />
                    {is_deployed ? 'Grades Deployed' : 'Grades Approved'}
                </span>
            </div>
        )
    }

    // Submittable state with loading
    return (
        <div className="w-full flex items-end justify-end">
            <Button
                onClick={async () => {
                    setLoading(true)
                    try {
                        await onSubmit()
                    } finally {
                        setLoading(false)
                    }
                }}
                disabled={loading}
                variant="default"
                className="gap-2 px-6 py-2 text-sm"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        Submit Grades
                    </>
                )}
            </Button>
        </div>
    )
}
