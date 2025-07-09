import React, { useState } from "react";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/Components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Pencil, Trash } from "lucide-react";
import axios from "axios";
import { useForm } from "@inertiajs/react";

const CurriculumTable = ({ termId, data, yearlevel, semesterId, adding, addSubject, form, setAdding, submit, onChange, onNumberFormChange, errors, processing, getCurriculumInfo }) => {
    const [deleting, setDeleting] = useState(false);
    const [editing, setEditing] = useState(false);
    const [currSubjectId, setCurrSubjectId] = useState(0);
    const [subject, setSubject] = useState([]);

    const { data: editingForm, setData, post, processing: editingProcessing, errors: editingErrors, reset, setError, clearErrors } = useForm({
        id: '',
        subject_id: '',
        subject_code: '',
        descriptive_title: '',
        credit_units: 3,
        lecture_hours: 3,
        laboratory_hours: 0,
    });

    const deleteCurriculum = async (id) => {
        setDeleting(true);
        setCurrSubjectId(id);
        axios.post(route('delete.curr.subject', { id }))
            .then(response => {
                if (response.data.message == 'success') {
                    setDeleting(false)
                    getCurriculumInfo()
                    setCurrSubjectId(0);
                }
            })
            .finally(() => {
                setDeleting(false);
                setCurrSubjectId(0);
            })
    }

    const editSubject = (subject) => {
        setEditing(true);
        setSubject(subject)
        setData('id', subject.id)
        setData('subject_id', subject.subject_id)
        setData('subject_code', subject.subject_code)
        setData('subject_code', subject.subject.subject_code)
        setData('descriptive_title', subject.subject.descriptive_title)
        setData('credit_units', subject.subject.credit_units)
        setData('lecture_hours', subject.subject.lecture_hours)
        setData('laboratory_hours', subject.subject.laboratory_hours)
    }

    const onChangeEditing = (e) => {
        const { name, value } = e.target;
        if (name == 'subject_code' && value.includes(' ')) return;
        setData(name, value);
        clearErrors(name);
        if (!value) setError(name, { error: true });
    }

    const onNumberFormChangeEditing = (name) => (value) => {
        if (name === 'subject_code' && value.includes(' ')) return;
        setData(name, value);
        console.log('change');
    };

    const submitEdit = async () => {
        console.log(editingForm);

        let error
        if (!editingForm.subject_code) {
            setError('subject_code', { error: true })
            error = true
        }
        if (!editingForm.descriptive_title) {
            setError('descriptive_title', { error: true })
            error = true
        }

        if (error) return

        await post(route('curr.editsubject'), {
            onSuccess: () => {
                reset();
                setEditing(false);
                getCurriculumInfo();
            },
        })
    }

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
                            data.curriculum_term_subject.map((subject) => {

                                if (editing && editingForm.id == subject.id) {
                                    return (
                                        <TableRow className="hover:bg-transparent border-y-green-500" key={subject.id}>
                                            <TableCell className="text-center">
                                                <Input className={`${editingErrors.subject_code ? 'border border-red-500' : ''}`} name='subject_code' value={editingForm.subject_code} onChange={onChangeEditing} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input className={`${editingErrors.descriptive_title ? 'border border-red-500' : ''}`} name='descriptive_title' value={editingForm.descriptive_title} onChange={onChangeEditing} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Select name="credit_units" value={editingForm.credit_units} onValueChange={onNumberFormChangeEditing('credit_units')}>
                                                    <SelectTrigger className="p-2 rounded-md text-sm w-20">
                                                        <SelectValue placeholder="" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={2}>2</SelectItem>
                                                        <SelectItem value={3}>3</SelectItem>
                                                        <SelectItem value={6}>6</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Select name="lecture_hours" value={editingForm.lecture_hours} onValueChange={onNumberFormChangeEditing('lecture_hours')}>
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
                                                <Select name="laboratory_hours" value={editingForm.laboratory_hours} onValueChange={onNumberFormChangeEditing('laboratory_hours')}>
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
                                                <Input readOnly value={Number(editingForm.lecture_hours) + Number(editingForm.laboratory_hours)} />
                                            </TableCell >
                                            <TableCell className='items-end'>
                                                <div className="w-full gap-2 flex">
                                                    <Button
                                                        onClick={() => {
                                                            setEditing(false)
                                                            reset();
                                                        }}
                                                        variant="secondary"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        disabled={editingProcessing}
                                                        onClick={submitEdit}
                                                    >
                                                        Done
                                                    </Button>
                                                </div>
                                            </TableCell >
                                        </TableRow >
                                    )
                                }

                                return (
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
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Pencil
                                                    disabled={deleting}
                                                    size={15}
                                                    className={`text-green-500 ${(currSubjectId) ? '' : 'cursor-pointer'}`}
                                                    onClick={() => editSubject(subject)}
                                                />
                                                <Trash
                                                    disabled={deleting}
                                                    size={15}
                                                    className={`text-red-500 ${deleting ? '' : 'cursor-pointer'}`}
                                                    onClick={() => deleteCurriculum(subject.id)}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
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
                                            <SelectItem value={6}>6</SelectItem>
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
