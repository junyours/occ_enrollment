import { useState } from 'react'
import { Button } from '@/Components/ui/button'
import { convertToAMPM } from '@/Lib/Utils'
import { Clock, SendHorizonal} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'

export default function ProgramHeadGradeVerificationButton({ disabledButton, handleCancel, type, status, rejectionMessage, setRejectionMessage, handleReject, verify, unReject }) {

    const [loading, setLoading] = useState(false)

    // DRAFT
    if (status.status == "draft") return <></>

    // SUBMITTED
    if (status.status == "submitted") {
        return (
            <div>
                <div className='flex gap-2'>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="destructive" className="" disabled={disabledButton}>Reject</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 space-y-2">
                            <Label htmlFor="rejection-message">Message <span className='text-xs italic'>(not required)</span></Label>
                            <Input
                                id="rejection-message"
                                value={rejectionMessage}
                                onChange={(e) => setRejectionMessage(e.target.value)}
                                className="w-full"
                                placeholder="Enter reason for rejection"
                            />
                            <Button onClick={() => handleReject(type)} disabled={disabledButton}>
                                Send <SendHorizonal className="ml-2 h-4 w-4" />
                            </Button>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={() => verify(type)} className='' disabled={disabledButton}>Verify</Button>
                </div>
            </div>
        )
    }

    // VERIFIED
    if (status.status == "verified") {
        const [verifiedDate, verifiedTimeRaw] = status.verified_at.split(' ')
        const [hour, minute] = verifiedTimeRaw.split(':')
        const verifiedTime = `${hour}:${minute}`

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
                Unverify
            </Button>
        )
    }

    // REJECTED
    if (status.status === "rejected") {
        return (
            <>
                <Button
                    onClick={() => unReject(type)}
                    variant="default"
                    disabled={disabledButton}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    Unreject
                </Button>
            </>
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
