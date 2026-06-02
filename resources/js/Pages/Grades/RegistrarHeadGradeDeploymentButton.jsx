import { Button } from '@/Components/ui/button'
import { convertToAMPM } from '@/Lib/Utils'
import { Clock, Undo2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip'

export default function RegistrarHeadGradeDeploymentButton({ deploy, disabledButton, unDeploy, type, status }) {


    // DRAFT
    if (status.status == "draft") return <></>

    // SUBMITTED
    if (status.status == "submitted") return <></>

    // VERIFIED
    if (status.status == "verified") return <Button onClick={() => deploy(type)} disabled={disabledButton}>Deploy</Button>

    // REJECTED
    if (status.status === "rejected") return <></>

    if (status.status == "deployed") {
        const [deployedDate, deployedTimeRaw] = status.deployed_at.split(' ')
        const [hour, minute] = deployedTimeRaw.split(':')
        const deployedTime = `${hour}:${minute}`
        return (
            <div>
                <div className='flex gap-2'>
                    <Tooltip className='p-0 bg-transparent'>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent className='p-0 bg-transparent'>
                            <Button variant='destructive' onClick={() => unDeploy(type)} disabled={disabledButton}>
                                Undeploy <Undo2 className="ml-2 h-4 w-4" />
                            </Button>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        )
    }

    // Submittable state with loading
    return <></>
}
