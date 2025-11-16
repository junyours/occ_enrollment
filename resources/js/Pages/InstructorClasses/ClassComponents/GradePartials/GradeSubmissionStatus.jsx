import {
    AlertCircle,
    CheckCircle2,
    Clock,
    SendHorizonal,
    ShieldX,
    Rocket
} from "lucide-react";
import { cn, convertToAMPM } from "@/Lib/Utils"; // optional utility for merging class names

export default function GradeSubmissionStatus({ gradeStatus, className }) {

    if (!gradeStatus) return null;

    const baseClass = cn("rounded-2xl shadow-md px-4 py-2 border flex items-start gap-3", className);

    if (gradeStatus.is_rejected) {
        return (
            <div className={cn(baseClass, "bg-red-50 border-red-300 text-red-800 animate-pulse")}>
                <ShieldX className="mt-1 h-5 w-5 text-red-600" />
                <div>
                    <div className="font-bold text-red-700">Rejected</div>
                    <div className="italic text-sm">{gradeStatus.rejection_message || "No reason provided."}</div>
                </div>
            </div>
        );
    }

    if (gradeStatus.is_deployed) {
        const [deployedDate, deployedTimeRaw] = gradeStatus.deployed_at.split(' ')
        const [hour, minute] = deployedTimeRaw.split(':')
        const deployedTime = `${hour}:${minute}`

        return (
            <div className={cn(baseClass, "bg-green-50 border-green-300 text-green-800")}>
                <Rocket className="mt-1 h-5 w-5 text-green-600" />
                <div>
                    <div className="font-bold">Deployed</div>
                    <div className="text-xs">
                        Deployed on: <span className="font-mono">{deployedDate} at  {convertToAMPM(deployedTime)}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (gradeStatus.is_verified) {
        const [verifiedDate, verifiedTimeRaw] = gradeStatus.verified_at.split(' ')
        const [hour, minute] = verifiedTimeRaw.split(':')
        const verifiedTime = `${hour}:${minute}`

        return (
            <div className={cn(baseClass, "bg-blue-50 border-blue-300 text-blue-800")}>
                <CheckCircle2 className="mt-1 h-5 w-5 text-blue-600" />
                <div>
                    <div className="font-bold">Verified</div>
                    <div className="text-xs">
                        Verified on: <span className="font-mono">{verifiedDate} at  {convertToAMPM(verifiedTime)}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (gradeStatus.is_submitted) {
        const [submittedDate, submittedTimeRaw] = gradeStatus.submitted_at.split(' ')
        const [hour, minute] = submittedTimeRaw.split(':')
        const submittedTime = `${hour}:${minute}`
        return (
            <div className={cn(baseClass, "bg-orange-50 border-orange-300 text-orange-800")}>
                <SendHorizonal className="mt-1 h-5 w-5 text-orange-600" />
                <div>
                    <div className="font-bold">Submitted</div>
                    <div className="text-xs">
                        Submitted on: <span className="font-mono">{submittedDate} at {convertToAMPM(submittedTime)}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(baseClass, "bg-gray-50 border-gray-300 text-gray-800")}>
            <Clock className="mt-1 h-5 w-5 text-gray-500" />
            <div>
                <div className="font-bold">Not Submitted</div>
                <div className="text-xs">Waiting for instructor to submit grades.</div>
            </div>
        </div>  
    );
}

// Helper: Date formatter
function formatDateTime(dateTime) {
    if (!dateTime) return "N/A";
    const date = new Date(dateTime);
    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}
