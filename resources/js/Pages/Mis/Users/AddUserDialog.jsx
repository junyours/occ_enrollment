import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AddUserDialog({ open, onOpenChange }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        user_id_no: '',
        password: '',
        password_confirmation: '',
        user_role: '',
    });

    const userRoles = [
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'president', label: 'President' },
        { value: 'program_head', label: 'Program Head' },
        { value: 'registrar', label: 'Registrar' },
        { value: 'evaluator', label: 'Evaluator' },
        { value: 'mis', label: 'MIS' },
        { value: 'guidance', label: 'Guidance' },
        { value: 'announcement_admin', label: 'Announcement Admin' },
        { value: 'faculty', label: 'Faculty' },
        { value: 'student', label: 'Student' },
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('mis-users.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                        Create a new user account. User can complete their profile later.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="user_id_no">
                            User ID Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="user_id_no"
                            type="text"
                            placeholder="Enter user ID number"
                            value={data.user_id_no}
                            onChange={(e) => setData('user_id_no', e.target.value)}
                            className={errors.user_id_no ? 'border-red-500' : ''}
                        />
                        {errors.user_id_no && (
                            <p className="text-sm text-red-500">{errors.user_id_no}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user_role">
                            User Role <span className="text-red-500">*</span>
                        </Label>
                        <Select value={data.user_role} onValueChange={(value) => setData('user_role', value)}>
                            <SelectTrigger className={errors.user_role ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {userRoles.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.user_role && (
                            <p className="text-sm text-red-500">{errors.user_role}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">
                            Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className={errors.password ? 'border-red-500' : ''}
                        />
                        {errors.password && (
                            <p className="text-sm text-red-500">{errors.password}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password_confirmation">
                            Confirm Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            placeholder="Confirm password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className={errors.password_confirmation ? 'border-red-500' : ''}
                        />
                        {errors.password_confirmation && (
                            <p className="text-sm text-red-500">{errors.password_confirmation}</p>
                        )}
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            The user will be created without personal information. They can complete their profile later.
                        </AlertDescription>
                    </Alert>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={processing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={processing}
                    >
                        {processing ? 'Creating...' : 'Create User'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
