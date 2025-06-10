import React from "react";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/Components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";

const CurriculumTable = ({ termId, data, yearlevel, semesterId, adding, addSubject, form, setAdding, submit, onChange, onNumberFormChange, errors, processing }) => {

    return (
        <Card className="shadow-md">
            <CardHeader className="m-0 px-0">
                <CardTitle className="text-center border-b-2 py-1">{yearlevel.toUpperCase()} - {data.semester.semester_name.toUpperCase()} {data.semester.semester_name != "Summer" && "SEM"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-28">Subject Code</TableHead>
                            <TableHead className="">Descriptive Title</TableHead>
                            <TableHead className="w-24 text-center">Credit Units</TableHead>
                            <TableHead className="w-20 text-center">Lec Hours</TableHead>
                            <TableHead className="w-24 text-center">Lab Hours</TableHead>
                            <TableHead className="w-16 text-center">Hrs/Week</TableHead>
                            <TableHead className="w-28">Pre-requisites</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.isArray(data.curriculum_term_subject) && data.curriculum_term_subject.length > 0 ? (
                            data.curriculum_term_subject.map((subject) => (
                                <TableRow key={subject.id}>
                                    <TableCell>{subject.subject.subject_code}</TableCell>
                                    <TableCell>{subject.subject.descriptive_title}</TableCell>
                                    <TableCell className="text-center">{subject.subject.credit_units}</TableCell>
                                    <TableCell className="text-center">{subject.subject.lecture_hours || "-"}</TableCell>
                                    <TableCell className="text-center">{subject.subject.laboratory_hours || "-"}</TableCell>
                                    <TableCell className="text-center">
                                        {(subject.subject.lecture_hours || 0) + (subject.subject.laboratory_hours || 0)}
                                    </TableCell>
                                    <TableCell>{subject.pre_requisite_name || "None"}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            !adding && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-gray-500">
                                        No subjects available.
                                    </TableCell>
                                </TableRow>
                            )
                        )}
                        {(adding && form.year_level == yearlevel && form.semester_id == semesterId) && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell className="text-center">
                                    <Input className={`${errors.subject_code ? 'border border-red-500' : ''}`} name='subject_code' value={form.subject_code} onChange={onChange} />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Input className={`${errors.descriptive_title ? 'border border-red-500' : ''}`} name='descriptive_title' value={form.descriptive_title} onChange={onChange} />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Select name="credit_units" value={form.credit_units} onValueChange={onNumberFormChange('credit_units')}>
                                        <SelectTrigger className="p-2 rounded-md text-sm w-20">
                                            <SelectValue placeholder="" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={2}>2</SelectItem>
                                            <SelectItem value={3}>3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Select name="lecture_hours" value={form.lecture_hours} onValueChange={onNumberFormChange('lecture_hours')}>
                                        <SelectTrigger className="p-2 rounded-md text-sm w-20">
                                            <SelectValue placeholder="" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={2}>2</SelectItem>
                                            <SelectItem value={3}>3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Select name="laboratory_hours" value={form.laboratory_hours} onValueChange={onNumberFormChange('laboratory_hours')}>
                                        <SelectTrigger className="p-2 rounded-md text-sm w-20">
                                            <SelectValue placeholder="" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={0}>none</SelectItem>
                                            <SelectItem value={3}>3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Input readOnly value={Number(form.lecture_hours) + Number(form.laboratory_hours)} />
                                </TableCell >
                            </TableRow >
                        )}

                        {(adding && form.year_level == yearlevel && form.semester_id == semesterId) && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7} className="text-center">
                                    <div className="w-full gap-2 flex justify-end">
                                        <Button
                                            onClick={() => setAdding(false)}
                                            variant="secondary"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            disabled={processing}
                                            onClick={submit}
                                        >
                                            Submit
                                        </Button>
                                    </div>
                                </TableCell >
                            </TableRow>
                        )}

                        {!adding && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7} className="text-center">
                                    <Button
                                        onClick={() => addSubject(termId, yearlevel, semesterId)}
                                        variant="secondary"
                                    >
                                        Add Subject
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody >
                </Table >
            </CardContent >
        </Card >
    );
};

export default CurriculumTable;
