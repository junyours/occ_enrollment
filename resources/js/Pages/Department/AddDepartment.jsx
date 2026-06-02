import { Button } from '@/Components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { useForm } from '@inertiajs/react'
import React from 'react'
import { toast } from "sonner";

function AddDepartment({ open, setOpen, getDepartmentsAndPrograms }) {

    const { data, setData, post, processing, errors, setError, reset, clearErrors } = useForm({
        department_name: '',
        department_name_abbreviation: '',
    });

    const handleDepartmentChange = (e) => {
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

        if (data.department_name == '') errors.department_name = "Required";
        if (data.department_name_abbreviation == '') errors.department_name_abbreviation = "Required";

        if (Object.keys(errors).length > 0) {
            setError(errors);
            return true;
        }
        return;
    }

    const submitDepartment = async () => {
        if (checkerrors()) return;
        await post(route('department.add.department', data), {
            onSuccess: () => {
                reset()
                toast.success("Department added successfuly.");
                setOpenDepartment(false);
                getDepartmentsAndPrograms();
            },
            preserveScroll: true,
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Department</DialogTitle>
                </DialogHeader>
                <div className="max-h-64">
                    <Label>Name:</Label>
                    <Input
                        name="department_name"
                        value={data.department_name}
                        onChange={handleDepartmentChange}
                        className={`mb-2 ${errors.department_name && 'border-red-500'}`}
                    />
                    <Label>Abbreviation:</Label>
                    <Input
                        name="department_name_abbreviation"
                        value={data.department_name_abbreviation}
                        onChange={handleDepartmentChange}
                        className={`mb-2 ${errors.department_name_abbreviation && 'border-red-500'}`}
                    />
                </div>
                <DialogFooter>
                    <Button disabled={processing} onClick={submitDepartment} type="submit">Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default AddDepartment
