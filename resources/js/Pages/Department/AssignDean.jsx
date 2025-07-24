import { Button } from '@/Components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Table, TableBody, TableCell, TableRow } from '@/Components/ui/table'
import { formatFullName } from '@/Lib/Utils';
import React, { useState } from 'react'
import { toast } from 'sonner';

function AssignDean({ open, setOpen, department, faculties, getDepartmentsAndPrograms }) {

    const [submitting, setSubmitting] = useState(false);
    const [assigningHeadId, setAssigningHeadId] = useState(0)

    const submitDeptHead = async (deptid, facid) => {
        setSubmitting(true);
        setAssigningHeadId(facid);

        await axios.post(route('assign.department.head', { deptID: deptid, facID: facid }))
            .then(response => {
                if (response.data.message == 'success') {
                    setOpen(false);
                    getDepartmentsAndPrograms();
                    toast.success('Dean assigned successfully.')
                };
            })
            .finally(() => {
                setSubmitting(false);
                setAssigningHeadId(0);
            })
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Dean</DialogTitle>
                    <DialogDescription>
                        {department.department_name} - {department.department_name_abbreviation}
                    </DialogDescription>
                </DialogHeader>
                <div className="mb-6 h-64 max-h-64 overflow-y-auto">
                    <Table>
                        <TableBody>
                            {faculties.map((fac) => (
                                <TableRow key={fac.id}>
                                    <TableCell>
                                        {formatFullName(fac)}
                                    </TableCell>
                                    <TableCell className='text-right'>
                                        <Button
                                            disabled={fac.user_role == 'program_head' || fac.user_role == 'registrar' || submitting}
                                            className='py-1 h-max disabled:cursor-not-allowed'
                                            onClick={() => { submitDeptHead(department.id, fac.id) }}
                                        >
                                            {fac.id == assigningHeadId ? 'Assigning' : 'Assign'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default AssignDean
