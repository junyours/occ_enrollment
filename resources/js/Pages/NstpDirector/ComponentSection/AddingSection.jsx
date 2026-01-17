import React from 'react'
import { useSection } from './useSection';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { toast } from 'sonner';

function AddingSection() {
    const addingSection = useSection(state => state.addingSection);
    const setAddingSection = useSection(state => state.setAddingSection);

    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        id: 0,
        year_level_id: 0,
        section: "",
        max_students: 50
    });

    const maxStudentsOnChange = (e) => {
        const { name, value } = e.target;
        if (!value) {
            setError('max_students', { error: true })
        } else {
            clearErrors();
        }

        // Allow only numbers
        if (!/^\d*$/.test(value)) return;

        setData("max_students", value);
        clearErrors(name)
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const maxStudents = parseInt(data.max_students, 10);

        if (!maxStudents || maxStudents < 15 || maxStudents > 100) {
            setError("max_students", "Max students must be between 15 and 100.");
            return;
        }

        post(route('nstp-director.add-section', { schoolYearId }), {
            onSuccess: () => {
                reset();
                setAddingSection(false);
                toast({
                    description: "Section added successfully.",
                    variant: "success",
                });
                getEnrollmentCourseSection();
            },
            onError: (errors) => {
                if (errors.curriculum_id) {
                    toast({
                        description: errors.curriculum_id,
                        variant: "destructive",
                    });
                }
            },
            preserveScroll: true,
        });
    }
    
    return (
        <Dialog open={addingSection} onOpenChange={setAddingSection}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Section</DialogTitle>
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
                    </div>
                    <DialogFooter>
                        {/* Cancel button explicitly set to type="button" so it's not triggered on Enter */}
                        <Button
                            type="button"
                            disabled={processing}
                            variant="outline"
                            onClick={() => setAddingSection(false)}>
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

export default AddingSection