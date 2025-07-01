import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


function DeletionDialog({ openDeleteDialog, setOpenDeleteDialog, classType, classIdToDelete, getCLasses, setClassIdToDelete }) {

    const { toast } = useToast()
    const [deleting, setDeleting] = useState(false);

    const deleteClass = async () => {
        setDeleting(true)
        let routeName

        if (classType == 'main') {
            routeName = 'delete-main-class';
        } else if (classType == 'second') {
            routeName = 'delete-second-class';
        }

        await axios.post(route(routeName, { id: classIdToDelete }))
            .then(response => {
                if (response.data.message) {
                    getCLasses();
                    setOpenDeleteDialog(false);
                    setClassIdToDelete(0);
                    toast({
                        description: "Class deleted",
                        variant: "success",
                    })
                }
            })
            .finally(() => {
                setDeleting(false)
            })
    }

    return (
        <AlertDialog open={openDeleteDialog} setOpen={setOpenDeleteDialog}>
            <AlertDialogContent className="">
                <AlertDialogHeader className="flex items-start gap-3">
                    <AlertTriangle className="text-red-600 mt-1" size={24} />
                    <div>
                        <AlertDialogTitle className="text-red-700 text-xl font-bold">
                            Confirm Deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm mt-1">
                            This action <span className="font-semibold text-red-600">cannot be undone</span>.
                            Are you sure you want to permanently delete this item? All related data will be lost.
                        </AlertDialogDescription>
                    </div>
                </AlertDialogHeader>

                <AlertDialogFooter className="mt-6">
                    <Button
                        disabled={deleting}
                        onClick={deleteClass}
                        variant="destructive"
                        className="w-full sm:w-auto"
                    >
                        Yes, delete permanently
                    </Button>
                    <Button
                        onClick={() => setOpenDeleteDialog(false)}
                        variant="outline"
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default DeletionDialog
