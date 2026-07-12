import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Separator } from '@/Components/ui/separator'
import { formatName } from '@/Lib/InfoUtils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Check, Pencil, X, Loader2 } from 'lucide-react'
import { useState } from 'react'

const Record = ({ subject }) => {
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        grade: subject.grade || '',
        re_exam: subject.re_exam || '',
        units: subject.units || ''
    });

    const handleCancel = () => {
        setFormData({
            grade: subject.grade || '',
            re_exam: subject.re_exam || '',
            units: subject.units || ''
        });
        setEditing(false);
    };

    const handleSave = async () => {
        await axios.patch(route('permanent-record.update-subject', {id: subject.id}), { formData })
        setEditing(false);
    };

    return (
        <div className="grid grid-cols-[8rem_1fr_5rem_5rem_5rem_6rem] gap-4 w-full items-center py-2 border-b last:border-0 hover:bg-muted/50 px-2 rounded-md transition-colors">
            <div className="font-medium text-sm">{subject.subject_code}</div>
            <div className="text-sm truncate pr-4" title={subject.descriptive_title}>
                {subject.descriptive_title}
            </div>

            {/* Editable Fields */}
            {editing ? (
                <>
                    <div>
                        <Input
                            value={formData.grade}
                            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                            className="h-8 w-full px-2"
                        />
                    </div>
                    <div>
                        <Input
                            value={formData.re_exam}
                            onChange={(e) => setFormData({ ...formData, re_exam: e.target.value })}
                            className="h-8 w-full px-2"
                        />
                    </div>
                    <div>
                        <Input
                            value={formData.units}
                            onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                            className="h-8 w-full px-2"
                            type="number"
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className="text-sm">{subject.grade}</div>
                    <div className="text-sm text-muted-foreground">{subject.re_exam ? subject.re_exam : '-'}</div>
                    <div className="text-sm">{subject.units}</div>
                </>
            )}

            {/* Actions */}
            <div className="flex justify-end">
                {editing ? (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={handleCancel} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleSave} className="text-green-500 hover:text-green-600 hover:bg-green-50 h-8 w-8">
                            <Check className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary h-8 w-8">
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}

import { Plus } from 'lucide-react'; // Make sure to import Plus

const NewSubjectRow = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        subject_code: '',
        descriptive_title: '',
        grade: '',
        re_exam: '',
        units: ''
    });

    const handleSave = () => {
        // Basic validation could go here
        onSave(formData);
    };

    return (
        <div className="grid grid-cols-[8rem_1fr_5rem_5rem_5rem_6rem] gap-4 w-full items-center py-2 border-b border-dashed border-primary/50 bg-primary/5 px-2 rounded-md mt-2">
            <div>
                <Input
                    placeholder="Code"
                    value={formData.subject_code}
                    onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                    className="h-8 w-full px-2 text-sm"
                    autoFocus
                />
            </div>
            <div>
                <Input
                    placeholder="Descriptive Title"
                    value={formData.descriptive_title}
                    onChange={(e) => setFormData({ ...formData, descriptive_title: e.target.value })}
                    className="h-8 w-full px-2 text-sm"
                />
            </div>
            <div>
                <Input
                    placeholder="Grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="h-8 w-full px-2 text-sm"
                />
            </div>
            <div>
                <Input
                    placeholder="Re-Exam"
                    value={formData.re_exam}
                    onChange={(e) => setFormData({ ...formData, re_exam: e.target.value })}
                    className="h-8 w-full px-2 text-sm"
                />
            </div>
            <div>
                <Input
                    placeholder="Units"
                    value={formData.units}
                    onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                    className="h-8 w-full px-2 text-sm"
                    type="number"
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={onCancel} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                    <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSave} className="text-green-500 hover:text-green-600 hover:bg-green-50 h-8 w-8">
                    <Check className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default function ViewRecords({ student, open, onClose }) {

    const getRecords = async () => {
        try {
            const response = await axios.get(route('permanent-record.student-added-records', { id: student.id }));
            return response.data;
        } catch (error) {
            console.error("Failed to fetch records:", error);
            throw error;
        }
    }

    const { data, isLoading, isError } = useQuery({
        queryKey: ['permanent-record.student-added-records', student.id],
        queryFn: getRecords,
        enabled: open, // Only fetch when the modal is open
    })

    // State to track which record ID we are currently adding a subject to
    const [addingToRecord, setAddingToRecord] = useState(null);

    const handleSaveNewSubject = (recordId, newSubjectData) => {
        console.log(`Adding to record ${recordId}:`, newSubjectData);
        // Trigger your Axios POST request or React Query mutation here
        // e.g., axios.post(route('subjects.store', { record_id: recordId }), newSubjectData)

        setAddingToRecord(null); // Close the form on success
    };

    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className="sm:max-w-4xl w-full max-h-[90vh] flex flex-col p-0">
                <div className="px-6 pt-6 pb-4">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl">Student Records</AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-foreground">
                            {formatName(student, { format: 'FML' })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </div>

                <Separator />

                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-4" />
                            <p>Loading records...</p>
                        </div>
                    ) : isError ? (
                        <div className="text-center py-8 text-destructive">
                            Failed to load student records. Please try again.
                        </div>
                    ) : data?.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No records found for this student.
                        </div>
                    ) : (
                        <Accordion className="w-full space-y-4" type="multiple">
                            {data.map(record => (
                                <AccordionItem
                                    key={`school-year-${record.id}`}
                                    value={`school-year-${record.id}`}
                                    className="border rounded-lg px-4 bg-card"
                                >
                                    <AccordionTrigger className="hover:no-underline py-4">
                                        <div className="flex flex-col items-start text-left">
                                            <div className="font-semibold text-base">
                                                {record.school_year} — {record.semester} Semester <span className="text-muted-foreground font-normal mx-2">|</span> {record.school_name}
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                {record.program} {record.major ? `• Major in ${record.major}` : ''}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4">

                                        {/* Table Header */}
                                        <div className="grid grid-cols-[8rem_1fr_5rem_5rem_5rem_6rem] gap-4 w-full items-center mb-2 px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                                            <div>Code</div>
                                            <div>Descriptive Title</div>
                                            <div>Grade</div>
                                            <div>Re-Exam</div>
                                            <div>Units</div>
                                            <div className="text-right">Actions</div>
                                        </div>

                                        {/* Table Body */}
                                        <div className="flex flex-col">
                                            {record.subjects.map(subject => (
                                                <Record
                                                    key={`subject-${subject.id}`}
                                                    subject={subject}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex flex-col">
                                            {record.subjects.map(subject => (
                                                <Record
                                                    key={`subject-${subject.id}`}
                                                    subject={subject}
                                                />
                                            ))}

                                            {/* Add Subject Inline Form or Trigger Button */}
                                            {addingToRecord === record.id ? (
                                                <NewSubjectRow
                                                    onCancel={() => setAddingToRecord(null)}
                                                    onSave={(newSubjectData) => handleSaveNewSubject(record.id, newSubjectData)}
                                                />
                                            ) : (
                                                <div className="mt-4 flex justify-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setAddingToRecord(record.id)}
                                                        className="text-muted-foreground border-dashed w-full hover:border-primary hover:text-primary transition-colors"
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Add Subject to {record.semester} Semester
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>

                <Separator />

                <div className="px-6 py-4 bg-muted/20">
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => onClose(false)}>Close</AlertDialogCancel>
                        <AlertDialogAction>
                            Confirm Updates
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}