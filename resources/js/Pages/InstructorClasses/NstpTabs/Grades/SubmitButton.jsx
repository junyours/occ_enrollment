import { useState } from 'react'
import { router } from '@inertiajs/react'
import axios from 'axios'
import { toast } from 'sonner'
import { ConfirmGradeAction, gradeConfirmText, SubmissionBar, SubmissionPanel } from '../../ClassComponents/GradePartials/SubmissionBar'

const PERIODS = [
    { type: 'midterm', title: 'Midterm grade' },
    { type: 'final', title: 'Final grade' },
]

// `gradeUpload` is schoolYear.grade_upload: when each period's grades can be
// entered, submitted (late after closing) or unsubmitted. Submitting and
// unsubmitting ask first.
export default function SubmitButton({ nstpSectionId, allowMidtermUpload, allowFinalUpload, gradeUpload, localGrades, setMissingFields, gradeSubmissionStatus, refetchGradeSubmissionStatus }) {
    const [submitting, setSubmitting] = useState(false);
    const [expandedRejection, setExpandedRejection] = useState({ midterm: false, final: false });
    // { action: 'submit' | 'unsubmit', type } while asking.
    const [confirm, setConfirm] = useState(null);

    const validateGradesBeforeSubmit = (type) => {
        const missing = {};

        Object.entries(localGrades).forEach(([studentId, student]) => {
            const missingMidterm = type === 'midterm' ? (student.midterm_grade === '' || student.midterm_grade === null || student.midterm_grade === undefined) : false;
            const missingFinal = type === 'final' ? (student.final_grade === '' || student.final_grade === null || student.final_grade === undefined) : false;

            if (missingMidterm || missingFinal) {
                missing[studentId] = {
                    midterm: missingMidterm,
                    final: missingFinal,
                };
            }
        });

        setMissingFields(missing);

        if (Object.keys(missing).length !== 0) {
            toast.error("Please fill all grade fields before submitting.");
        }

        return Object.keys(missing).length === 0;
    }

    // Whether grades can be typed follows the submission, so the page's
    // flags (schoolYear.allow_upload_*) are refreshed after a change.
    const refresh = async () => {
        await refetchGradeSubmissionStatus();
        router.reload({ only: ['schoolYear'] });
    }

    const send = async (type, routeName, success, failure) => {
        setSubmitting(type);

        try {
            await axios.post(route(routeName, { period: type, nstpSectionId }));
            toast.success(success);
        } catch (error) {
            toast.error(failure, { description: error.response?.data?.message ?? 'Please try again.' });
        } finally {
            await refresh();
            setSubmitting(false);
        }
    }

    const askSubmit = (type) => {
        // Missing grades are pointed out first; nothing to confirm yet.
        if (validateGradesBeforeSubmit(type)) setConfirm({ action: 'submit', type });
    }

    const askUnsubmit = (type) => setConfirm({ action: 'unsubmit', type });

    const runConfirmed = () => {
        const { action, type } = confirm;
        setConfirm(null);

        if (action === 'submit') {
            send(type, 'nstp-grades.submit-grades', 'Grades submitted.', 'Couldn’t submit the grades');
        } else {
            send(type, 'nstp-grades.cancel-submission', 'Grades unsubmitted. You can change them again.', 'Couldn’t unsubmit the grades');
        }
    }

    const confirmText = gradeConfirmText({
        confirm,
        grades: Object.values(localGrades),
        upload: confirm && gradeUpload?.[confirm.type],
        status: confirm && gradeSubmissionStatus[`${confirm.type}_status`],
        reviewer: 'NSTP director',
    });

    return (
        <>
            <SubmissionBar>
                {PERIODS.map(({ type, title }) => (
                    <SubmissionPanel
                        key={type}
                        type={type}
                        title={title}
                        data={gradeSubmissionStatus}
                        canUpload={type === 'final' ? allowFinalUpload : allowMidtermUpload}
                        upload={gradeUpload?.[type]}
                        submitting={submitting}
                        onSubmit={askSubmit}
                        onCancel={askUnsubmit}
                        reasonOpen={expandedRejection[type]}
                        onToggleReason={() => setExpandedRejection((prev) => ({ ...prev, [type]: !prev[type] }))}
                    />
                ))}
            </SubmissionBar>

            <ConfirmGradeAction
                text={confirmText}
                onClose={() => setConfirm(null)}
                onConfirm={runConfirmed}
            />
        </>
    )
}
