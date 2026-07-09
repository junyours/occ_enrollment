import React from 'react'

export default function AddStudentInfo() {
    return (
        <div>
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
                                        setError('school', false)
                                    } else {
                                        setData('school', '')
                                        setError('school', true)
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
                                className={`${data.recordType === 'old' ? 'bg-muted text-muted-foreground focus-visible:ring-0' : ''} ${errors.school ? 'border-red-500' : ''}`}
                            />
                        </div>

                        {/* Row 3: School Year and Semester (Side-by-side) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <RequiredLabel htmlFor="schoolYear" label="School Year">School Year</RequiredLabel>
                                    {errors.schoolYear && <p className="text-red-500 text-xs">{errors.schoolYear}</p>}
                                </div>
                                <Input
                                    id="schoolYear"
                                    name="schoolYear"
                                    placeholder="e.g., 2023-2024"
                                    value={data.schoolYear}
                                    onChange={handleFormOnChange}
                                    className={`${errors.schoolYear ? 'border-red-500' : ''}`}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <RequiredLabel label="Semester" />
                                <ToggleGroup
                                    name="semester"
                                    variant="outline"
                                    type="single"
                                    value={data.semester}
                                    className="justify-start"
                                    onValueChange={(value) => setData('semester', value)}
                                >
                                    <ToggleGroupItem value="first">1st</ToggleGroupItem>
                                    <ToggleGroupItem value="second">2nd</ToggleGroupItem>
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
                                    className={`${errors.program ? 'border-red-500' : ''}`}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Major</Label>
                                <Input
                                    id="major"
                                    name="major"
                                    placeholder=""
                                    value={data.major}
                                    onChange={handleFormOnChange}
                                    className={`${errors.major ? 'border-red-500' : ''}`}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Row 5: Subjects */}
                        <div className="flex flex-col gap-3">
                            <RequiredLabel label="Subjects" />
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-8"></TableHead>
                                            <TableHead className="w-[140px]">Subject Code</TableHead>
                                            <TableHead>Descriptive Title</TableHead>
                                            <TableHead className="w-[100px] text-center">Grade</TableHead>
                                            <TableHead className="w-[120px] text-center">Re-</TableHead>
                                            <TableHead className="w-[100px] text-center">Units</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subjects.map((subject, index) => (
                                            <TableRow key={subject.id}>
                                                <TableCell className='text-end'>
                                                    {index + 1}.
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        className={`h-9 w-full text-center ${subjectErrors[index]?.code ? 'border-red-500' : ''}`}
                                                        placeholder="Code"
                                                        value={subject.code}
                                                        onChange={(e) => handleSubjectChange(subject.id, 'code', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        className={`h-9 w-full ${subjectErrors[index]?.title ? 'border-red-500' : ''}`}
                                                        placeholder="Subject Title"
                                                        value={subject.title}
                                                        onChange={(e) => handleSubjectChange(subject.id, 'title', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        className={`h-9 w-full text-center ${subjectErrors[index]?.grade ? 'border-red-500' : ''}`}
                                                        placeholder=""
                                                        value={subject.grade}
                                                        onChange={(e) => handleSubjectChange(subject.id, 'grade', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        className="h-9 w-full text-center"
                                                        placeholder=""
                                                        type="text"
                                                        value={subject.re_exam}
                                                        onChange={(e) => handleSubjectChange(subject.id, 're_exam', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        className={`h-9 w-full text-center ${subjectErrors[index]?.units ? 'border-red-500' : ''}`}
                                                        placeholder=""
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
                                                            <Trash className="h-4 w-4" />
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
                                <Plus className="mr-2 h-4 w-4" /> Add Subject
                            </Button>
                        </div>
                    </div>

                    <AlertDialogFooter className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-4">
                        <AlertDialogCancel onClick={() => onClose(false)}>Close</AlertDialogCancel>
                        <AlertDialogAction disabled={submitting} onClick={handleSubmit}>
                            Submit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
