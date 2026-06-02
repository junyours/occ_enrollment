import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { formatFullName } from '@/Lib/Utils';

function StudentActions({ show, setShowModal, onConfirm, student }) {

    return (
        <>
            <Dialog open={show} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Unenrollment</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-2 mt-2 text-sm text-muted-foreground">
                        <p>Are you sure you want to unenroll the following student?</p>
                        <p className="text-base text-foreground font-semibold">
                            {formatFullName(student)}
                        </p>
                    </div>

                    <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={onConfirm}>
                            Unenroll
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </>
    );
}

export default StudentActions;
