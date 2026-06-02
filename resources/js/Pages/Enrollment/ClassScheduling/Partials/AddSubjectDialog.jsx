import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog'
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from '@inertiajs/react';
import React, { useState } from 'react'

function AddSubjectDialog({ yearSectionId, getCLasses }) {
    const { toast } = useToast()

    const { data, setData, post, processing, errors, reset } = useForm({
        subject_code: '',
    });

    const [openDialog, setOpenDialog] = useState(false);

    const addSubject = async () => {
        await post(route('class.add.subject', { yearSectionId, subjectCode: data.subject_code }), {
            onSuccess: () => {
                reset();
                getCLasses();
                toast({
                    description: "Subject added successfully",
                    variant: "success",
                });
                setOpenDialog(false);
            },
            onError: (errors) => {
                if (errors.room_name) {
                    setError('subject_code', { message: errors.subject_code });
                }
            },
            preserveScroll: true,
        })
    }

    return (
        <div>
            <Button onClick={() => setOpenDialog(true)}>Add Subject</Button>
            <AlertDialog open={openDialog} setOpen={setOpenDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader className="flex items-start gap-3">
                        <div className='w-full'>
                            <AlertDialogTitle className="text-xl font-bold">
                                Add Subject
                            </AlertDialogTitle>
                            <Label>Subject code</Label>
                            <div className='flex gap-2'>
                                <Input value={data.subject_code} onChange={(e) => setData('subject_code', e.target.value)} />
                                <Button
                                    disabled={processing}
                                    onClick={addSubject}
                                >
                                    Add
                                </Button>
                            </div>
                            <AlertDialogDescription className="text-sm mt-1">
                                Enter the unique subject code, then click “Add” to include it in the list.
                            </AlertDialogDescription>
                            <div className='font-semibold text-red-600'>{errors.subject_code}</div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <div className='w-full'>
                            <Button
                                onClick={() => setOpenDialog(false)}
                                variant="outline"
                            >
                                close
                            </Button>
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default AddSubjectDialog
