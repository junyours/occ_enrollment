import React from "react";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/Components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card";

const CurriculumTable = ({ data, yearlevel }) => {
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
                        {data.curriculum_term_subject.map((subject) => (
                            <TableRow key={subject.id}>
                                <TableCell>{subject.subject.subject_code}</TableCell>
                                <TableCell>{subject.subject.descriptive_title}</TableCell>
                                <TableCell className="text-center">{subject.subject.credit_units}</TableCell>
                                <TableCell className="text-center">{subject.subject.lecture_hours || "-"}</TableCell>
                                <TableCell className="text-center">{subject.subject.laboratory_hours || "-"}</TableCell>
                                <TableCell className="text-center">
                                    {(subject.subject.lecture_hours || 0) +
                                        (subject.subject.laboratory_hours || 0)}
                                </TableCell>
                                <TableCell>
                                    {subject.pre_requisite_name || "None"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default CurriculumTable;
