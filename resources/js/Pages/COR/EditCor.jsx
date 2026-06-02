import { Button } from '@/Components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

export default function EditCor({ editing, setEditing, enrolledStudentId }) {
    const [studentType, setstudentType] = useState(0);
    const [loading, setLoading] = useState(true)

    const getStudentType = async () => {
        await axios.post(route('enrollment.student-type', enrolledStudentId))
            .then(response => {
                setstudentType(response.data);
            })
            .finally(() => {
                setLoading(false)
            })
    }

    useEffect(() => {
        getStudentType();
    }, [])

    const studentTypeOnChange = async (id) => {
        await axios.post(route('enrollment.set-student-type', enrolledStudentId), { studentTypeId: id })
            .finally(() => {
                setLoading(false)
            })
    }

    return (
        <div>
            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit COR</DialogTitle>
                    </DialogHeader>
                    {!loading ? (
                        <div>
                            <Label>Student type</Label>
                            <Select
                                value={studentType}
                                onValueChange={(value) => {
                                    setstudentType(value)
                                    studentTypeOnChange(value)
                                }}
                            >
                                <SelectTrigger className={`p-2 rounded-md text-sm w-40 MB-2`}>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        { value: 1, name: 'Freshman' },
                                        { value: 2, name: 'Transferee' },
                                        { value: 3, name: 'Old' },
                                        { value: 4, name: 'Returnee' },
                                    ].map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <>Loading</>
                    )}
                </DialogContent>
            </Dialog>
            <Button onClick={() => setEditing(false)}>Close</Button>
        </div>
    )
}