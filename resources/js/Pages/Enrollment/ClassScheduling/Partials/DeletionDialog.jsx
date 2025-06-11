import React from 'react'
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog';

function DeletionDialog({ openDeleteDialog, setOpenDeleteDialog, deleteClass }) {

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
