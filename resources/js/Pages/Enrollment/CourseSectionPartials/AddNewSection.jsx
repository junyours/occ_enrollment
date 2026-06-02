import { Button } from '@/Components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import React from 'react'

function AddNewSection({
    isDialogOpen,
    setIsDialogOpen,
    data,
    yearLevel,
    handleSubmit,
    maxStudentsOnChange,
    errors,
    processing,
    closeAddingSectionDialog
}) {
    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Section</DialogTitle>
                    <DialogDescription>
                        Adding a new section <span className="text-green-500 font-semibold">{data.section}</span> for {yearLevel}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="max-students">Max students</Label>
                        <Input
                            name="max_students"
                            value={data.max_students}
                            onChange={maxStudentsOnChange}
                            type="text"
                            id="max-students"
                            placeholder="Max students"
                        />
                        {errors.max_students && <p className="text-red-500">{errors.max_students}</p>}
                    </div>{errors.curriculum_id && (
                        <div className="text-red-500">{errors.curriculum_id}</div>
                    )}
                    <DialogFooter>
                        {/* Cancel button explicitly set to type="button" so it's not triggered on Enter */}
                        <Button
                            type="button"
                            disabled={processing}
                            variant="outline"
                            onClick={closeAddingSectionDialog}>
                            Cancel
                        </Button>
                        {/* Submit button comes first, so Enter triggers this instead of Cancel */}
                        <Button
                            type="submit"
                            disabled={processing}
                            className="disabled:bg-blue-400">
                            Submit
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default AddNewSection
