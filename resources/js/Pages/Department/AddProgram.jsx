import { Button } from '@/Components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'

import { useForm } from '@inertiajs/react'
import React, { useEffect } from 'react'
import { toast } from 'sonner'

function AddProgram({ open, setOpen, department, setDepartment, getDepartmentsAndPrograms, editing, setEditing, program }) {

    const { data, setData, post, processing, errors, setError, clearErrors, reset } = useForm({
        id: 0,
        department_id: department?.id ?? '',
        course_name: '',
        major: '',
        course_name_abbreviation: '',
    });

    useEffect(() => {
        if (editing && program) {
            setData({
                id: program.id,
                department_id: department?.id ?? '',
                course_name: program.course_name || '',
                major: program.major || '',
                course_name_abbreviation: program.course_name_abbreviation || '',
            });
        }
    }, [editing, program]);


    useEffect(() => {
        setData('department_id', department.id)
    }, [department])

    const submitProgram = async () => {
        if (checkerrors()) return;

        const routeName = editing ? 'department.edit.program' : 'department.add.program';

        await post(route(routeName, data), {
            onSuccess: () => {
                reset()
                toast.success("Program added successfuly");
                setOpen(false);
                getDepartmentsAndPrograms();
                setEditing(false);
            },
            preserveScroll: true,
        });
    };

    const handleProgramChange = (e) => {
        const { name, value } = e.target;
        if (value.trim() === '') {
            setError(name, 'Required');
        } else {
            clearErrors(name);
        }
        setData(name, value);
    };


    const checkerrors = () => {
        clearErrors();

        let errors = {};

        if (data.course_name == '') errors.course_name = "Required";
        if (data.course_name_abbreviation == '') errors.course_name_abbreviation = "Required";

        if (Object.keys(errors).length > 0) {
            setError(errors);
            return true;
        }
        return;
    }

    function handleAutoResize(e) {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
        handleProgramChange(e); // your original handler
    }

    return (
        <Dialog open={open} onOpenChange={() => { setOpen(false), setEditing(false), setDepartment({}) }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Program{editing ? 'editing' : 'not editing'}</DialogTitle>
                    <DialogDescription>
                        {department.department_name} - {department.department_name_abbreviation}
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-64">
                    <Label>Name:</Label>

                    <Textarea
                        name="course_name"
                        value={data.course_name}
                        onChange={handleAutoResize}
                        className={`mb-2 resize-none overflow-hidden ${errors.course_name ? 'border-red-500' : ''}`}
                        rows={1}
                    />

                    <Label>Major:</Label>
                    <Input
                        name="major"
                        value={data.major}
                        onChange={handleProgramChange}
                        className={`mb-2 ${errors.major && 'border-red-500'}`}
                    />
                    <Label>Abbreviation:</Label>
                    <Input
                        name="course_name_abbreviation"
                        value={data.course_name_abbreviation}
                        onChange={handleProgramChange}
                        className={`mb-2 ${errors.course_name_abbreviation && 'border-red-500'}`}
                    />
                </div>
                <DialogFooter>
                    <Button disabled={processing} onClick={submitProgram} type="submit">Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default AddProgram
