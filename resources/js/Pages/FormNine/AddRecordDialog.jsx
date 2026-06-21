import React, { useState } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/Components/ui/toggle-group'
import { Separator } from '@/Components/ui/separator'
import { Button } from '@/Components/ui/button'
import { formatName } from '@/Lib/InfoUtils'
import { Trash } from 'lucide-react'
import RequiredLabel from '@/Components/ui/RequiredLabel'
import { useForm } from '@inertiajs/react'

export default function AddRecordDialog({ student, open, onClose }) {
    const [recordType, setRecordType] = useState('old');
    const [schoolYear, setSchoolYear] = useState("");
    const [semester, setSemester] = useState("1st");
    const [school, setSchool] = useState("Opol Community College");

    const { data, setData, post, processing, errors, reset } = useForm({
        recordType: "old",
        schoolYear: "",
        school: "",
        program: "",
        major: "",
        semester: "",
    })

    const handleFormOnChange = (e) => {
        const { name, value } = e.target;

        console.log({
            name,
            value
        });

        setData(name, value);
    }

    // Initialize subjects with one empty row
    const [subjects, setSubjects] = useState([
        { id: crypto.randomUUID(), code: '', title: '', grade: '', units: '' }
    ]);

    // Handle adding a new blank row
    const handleAddSubject = () => {
        setSubjects([
            ...subjects,
            { id: crypto.randomUUID(), code: '', title: '', grade: '', units: '' }
        ]);
    };

    // Handle removing a specific row
    const handleRemoveSubject = (id) => {
        setSubjects(subjects.filter(subject => subject.id !== id));
    };

    // Handle updating a specific input in a specific row
    const handleSubjectChange = (id, field, value) => {
        setSubjects(subjects.map(subject =>
            subject.id === id ? { ...subject, [field]: value } : subject
        ));
    };

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>Adding Record</AlertDialogTitle>
                    <AlertDialogDescription>
                        Student: {formatName(student, { format: 'FML' })}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <Separator />

                <div className="flex flex-col gap-6 py-2">

                    {/* Row 1: Record Type */}
                    <div className="flex flex-col gap-2">
                        <RequiredLabel label="Record Type" />
                        <ToggleGroup
                            variant="outline"
                            type="single"
                            value={data.recordType}
                            className="justify-start"
                            onValueChange={(value) => {
                                if (!value) return;

                                if (value === 'old') {
                                    setData('school', 'Opol Community College')
                                } else {
                                    setData('school', '')
                                }
                                setData('recordType', value)
                            }}
                        >
                            <ToggleGroupItem value="old" aria-label="Toggle old record">
                                Old
                            </ToggleGroupItem>
                            <ToggleGroupItem value="transferee" aria-label="Toggle transferee record">
                                Transferee
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    {/* Row 2: School Input */}
                    <div className="flex flex-col gap-2">
                        <RequiredLabel htmlFor="school" label="School" />
                        <Input
                            id="school"
                            name="school"
                            placeholder="Enter school name..."
                            value={data.school}
                            onChange={handleFormOnChange}
                            readOnly={data.recordType === 'old'}
                            className={data.recordType === 'old' ? 'bg-muted text-muted-foreground focus-visible:ring-0' : ''}
                        />
                    </div>

                    {/* Row 3: School Year and Semester (Side-by-side) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <RequiredLabel htmlFor="schoolYear" label="School Year">School Year</RequiredLabel>
                            <Input
                                id="schoolYear"
                                placeholder="e.g., 2023-2024"
                                value={schoolYear}
                                onChange={(e) => setSchoolYear(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <RequiredLabel label="Semester" />
                            <ToggleGroup
                                variant="outline"
                                type="single"
                                value={semester}
                                className="justify-start"
                                onValueChange={(value) => {
                                    if (!value) return; // Prevent unselecting
                                    setSemester(value);
                                }}
                            >
                                <ToggleGroupItem value="1st">1st</ToggleGroupItem>
                                <ToggleGroupItem value="2nd">2nd</ToggleGroupItem>
                                <ToggleGroupItem value="summer">Summer</ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                    </div>

                    {/* Row 4: Program and Major (Side-by-side) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <RequiredLabel htmlFor="program" label="Program">Program</RequiredLabel>
                            <Input
                                id="program"
                                name="program"
                                placeholder=""
                                value={data.program}
                                onChange={handleFormOnChange}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <RequiredLabel label="Major" />
                            <Input
                                id="major"
                                name="major"
                                placeholder=""
                                value={data.major}
                                onChange={handleFormOnChange}
                            />
                        </div>
                    </div>

                    {/* Row 5: Subjects */}
                    <div className="flex flex-col gap-3">
                        <RequiredLabel label="Subjects" />
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[140px]">Subject Code</TableHead>
                                        <TableHead>Descriptive Title</TableHead>
                                        <TableHead className="w-[100px] text-center">Grade</TableHead>
                                        <TableHead className="w-[100px] text-center">Units</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjects.map((subject) => (
                                        <TableRow key={subject.id}>
                                            <TableCell className="p-2">
                                                <Input
                                                    className="h-9 w-full text-center"
                                                    placeholder="Code"
                                                    value={subject.code}
                                                    onChange={(e) => handleSubjectChange(subject.id, 'code', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input
                                                    className="h-9 w-full"
                                                    placeholder="Subject Title"
                                                    value={subject.title}
                                                    onChange={(e) => handleSubjectChange(subject.id, 'title', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input
                                                    className="h-9 w-full text-center"
                                                    placeholder="0.0"
                                                    value={subject.grade}
                                                    onChange={(e) => handleSubjectChange(subject.id, 'grade', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input
                                                    className="h-9 w-full text-center"
                                                    placeholder="0"
                                                    type="number"
                                                    value={subject.units}
                                                    onChange={(e) => handleSubjectChange(subject.id, 'units', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="p-2 text-center">
                                                {subjects.length > 1 && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => handleRemoveSubject(subject.id)}
                                                    >
                                                        <Trash />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed"
                            onClick={handleAddSubject}
                        >
                            + Add Subject
                        </Button>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onClose(false)}>Close</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => console.log({ recordType, schoolYear, semester, school, subjects })}
                    >
                        Submit
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}