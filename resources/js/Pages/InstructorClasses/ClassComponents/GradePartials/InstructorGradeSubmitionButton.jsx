import { useState } from 'react'
import { Button } from '@/Components/ui/button'
import { convertToAMPM } from '@/Lib/Utils'
import { AlertCircle, Clock, Loader2, Send, XCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip'

export default function InstructorGradeSubmitionButton({ handleSubmit, disabledButton, handleCancel, type, status }) {

    const [loading, setLoading] = useState(false)

    // DRAFT
    if (status.status == "draft") {
        return (
            <div>
                <Button
                    variant="outline"
                    onClick={() => handleSubmit(type)}
                    disabled={disabledButton || (status.is_submitted && !status.is_rejected)}
                >
                    Submit Grades
                </Button>
            </div>
        )
    }

    // SUBMITTED
    if (status.status == "submitted") {
        const [submittedDate, submittedTimeRaw] = status.submitted_at.split(' ')
        const [hour, minute] = submittedTimeRaw.split(':')
        const submittedTime = `${hour}:${minute}`

        return (
            <Button
                onClick={async () => {
                    setLoading(true)
                    try {
                        await handleCancel(type)
                    } finally {
                        setLoading(false)
                    }
                }}
                variant='destructive'
                disabled={loading || disabledButton}
            >
                Unsubmit 
            </Button>
        )
    }

    // VERIFIED
    if (status.status == "verified") {
        const [verifiedDate, verifiedTimeRaw] = status.verified_at.split(' ')
        const [hour, minute] = verifiedTimeRaw.split(':')
        const verifiedTime = `${hour}:${minute}`

        return (
            <div>
                <div className="w-full flex items-end justify-end">
                    <div className="flex flex-col gap-1 text-sm text-green-800 bg-green-50 border border-green-300 rounded-lg px-4 shadow-md max-w-md w-fit">
                        <div className="flex items-center gap-2 h-[35px]">
                            <Clock className="w-4 h-4 text-green-600" />
                            <span>
                                Verified on <span className="font-semibold">{verifiedDate}</span> at{' '}
                                <span className="font-semibold">{convertToAMPM(verifiedTime)}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // REJECTED
    if (status.status === "rejected") {
        return (
            <Button
                onClick={() => handleSubmit(type)}
                variant="default"
                disabled={disabledButton}
                className="bg-blue-600 hover:bg-blue-700"
            >
                Resubmit Grades
            </Button>
        );
    }

    if (status.status == "deployed") {
        const [deployedDate, deployedTimeRaw] = status.deployed_at.split(' ')
        const [hour, minute] = deployedTimeRaw.split(':')
        const deployedTime = `${hour}:${minute}`
        return (
            <div>
                <div className="w-full flex items-end justify-end">
                    <div className="flex flex-col gap-1 text-sm text-green-800 bg-green-50 border border-green-300 rounded-lg px-4 shadow-md max-w-md w-fit">
                        <div className="flex items-center gap-2 h-[35px]">
                            <Clock className="w-4 h-4 text-green-600" />
                            <span>
                                Deployed on <span className="font-semibold">{deployedDate}</span> at{' '}
                                <span className="font-semibold">{convertToAMPM(deployedTime)}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Submittable state with loading
    return (
        <></>
    )
}
