import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Checkbox } from '@/Components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Label } from '@/Components/ui/label'
import { formatDateShort } from '@/Lib/Utils'
import axios from 'axios'
import React, { useEffect, useState } from 'react'

function SchoolYearSettings({ schoolYearId, open, setOpen }) {
    const [loading, setLoading] = useState(true)
    const [schoolYear, setSchoolYear] = useState({})

    const getSchoolYearSettings = async () => {
        await axios.post(route('get.school-year', { id: schoolYearId }))
            .then(response => {
                setSchoolYear(response.data)
            })
            .finally(() => {
                setLoading(false);
            })
    }

    useEffect(() => {
        getSchoolYearSettings()
    }, [])

    const handleToggle = async (field, value) => {
        // Example: send PATCH request or store locally
        setSchoolYear(prev => ({
            ...prev,
            [field]: value ? 1 : 0,
        }));
        const convertedValue = value ? 1 : 0
        console.log(value);
        console.log(convertedValue);

        await axios.patch(`/school-year/${field}/${schoolYear.id}`, { value: convertedValue })
    };

    const getEnrollmentStatus = (startDate, endDate) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set to end of day

        // Check if currently within enrollment period
        if (now >= start && now <= end) {
            return 'ongoing';
        }

        // Check if within 14 days before start date (preparing for upcoming enrollment)
        const fourteenDaysBeforeStart = new Date(start);
        fourteenDaysBeforeStart.setDate(fourteenDaysBeforeStart.getDate() - 14);

        if (now >= fourteenDaysBeforeStart && now < start) {
            return 'preparing';
        }

        return null;
    };

    if (loading) return <></>

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center">
                        <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings: {schoolYear?.start_year}-{schoolYear?.end_year}
                    </DialogTitle>
                    <DialogDescription>Manage settings for {schoolYear?.semester_name} Semester</DialogDescription>
                </DialogHeader>
                <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Status Management
                    </h3>

                    <div className="space-y-3">
                        {/* Enrollment Status */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                                <Label className="font-medium">Enrollment Status</Label>
                                <p className="text-xs text-muted-foreground">
                                    {getEnrollmentStatus(schoolYear?.start_date, schoolYear?.end_date) === 'ongoing'
                                        ? 'Currently accepting enrollments'
                                        : getEnrollmentStatus(schoolYear?.start_date, schoolYear?.end_date) === 'preparing'
                                            ? 'Preparing (within 2 weeks of start)'
                                            : 'No active enrollment period'}
                                </p>
                            </div>
                            <Badge
                                className={
                                    getEnrollmentStatus(schoolYear?.start_date, schoolYear?.end_date) === 'ongoing'
                                        ? 'bg-blue-500 hover:bg-blue-500'
                                        : getEnrollmentStatus(schoolYear?.start_date, schoolYear?.end_date) === 'preparing'
                                            ? 'bg-yellow-500 hover:bg-yellow-500'
                                            : 'bg-gray-500 hover:bg-gray-500'
                                }
                            >
                                {getEnrollmentStatus(schoolYear?.start_date, schoolYear?.end_date) === 'ongoing'
                                    ? 'Ongoing'
                                    : getEnrollmentStatus(schoolYear?.start_date, schoolYear?.end_date) === 'preparing'
                                        ? 'Preparing'
                                        : 'None'}
                            </Badge>
                        </div>

                        {/* Enrollment Period */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                                <Label className="font-medium">Enrollment Period</Label>
                                <p className="text-xs text-muted-foreground">
                                    {schoolYear?.start_date && formatDateShort(schoolYear.start_date)} -{" "}
                                    {schoolYear?.end_date && formatDateShort(schoolYear.end_date)}
                                </p>
                            </div>
                        </div>

                        {/* Current Year Toggle */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                                <Label className="font-medium">Set as Current Year</Label>
                                <p className="text-xs text-muted-foreground">Mark this as the active school year</p>
                            </div>
                            <Checkbox
                                checked={schoolYear?.is_current === 1}
                                onCheckedChange={(checked) => handleToggle('is_current', checked)}
                                className="h-5 w-5"
                            />
                        </div>

                        {/* Enrollment Toggles */}
                        <div className="space-y-3 mt-4">
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <Label className="font-medium">Allow Enrollment</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Toggle if enrollment is currently open.
                                    </p>
                                </div>
                                <Checkbox
                                    checked={schoolYear?.allow_enrollment === 1}
                                    onCheckedChange={(checked) => handleToggle('allow_enrollment', checked)}
                                    className="h-5 w-5"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <Label className="font-medium">Evaluating</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Enable evaluation period for this school year.
                                    </p>
                                </div>
                                <Checkbox
                                    checked={schoolYear?.evaluating === 1}
                                    onCheckedChange={(checked) => handleToggle('evaluating', checked)}
                                    className="h-5 w-5"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <Label className="font-medium">Allow Midterm Grade Upload</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Control if faculty can upload midterm grades.
                                    </p>
                                </div>
                                <Checkbox
                                    checked={schoolYear?.allow_upload_midterm === 1}
                                    onCheckedChange={(checked) => handleToggle('allow_upload_midterm', checked)}
                                    className="h-5 w-5"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <Label className="font-medium">Allow Final Grade Upload</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Control if faculty can upload final grades.
                                    </p>
                                </div>
                                <Checkbox
                                    checked={schoolYear?.allow_upload_final === 1}
                                    onCheckedChange={(checked) => handleToggle('allow_upload_final', checked)}
                                    className="h-5 w-5"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default SchoolYearSettings