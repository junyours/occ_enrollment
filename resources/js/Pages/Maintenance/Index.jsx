import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, useForm } from '@inertiajs/react'
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Settings, Users } from 'lucide-react';

const roles = [
    { value: 'faculty', label: 'Faculty' },
    { value: 'student', label: 'Student' },
    { value: 'program_head', label: 'Program Head' },
    { value: 'evaluator', label: 'Evaluator' },
    { value: 'registrar', label: 'Registrar' },
    { value: 'mis', label: 'MIS' },
]

export default function Index({ settings, errors }) {
    const { data, setData } = useForm({
        maintenance_mode: settings.maintenance_mode,
        blocked_roles: settings.blocked_roles || [],
    })

    const updateMaintenanceMode = async (checked) => {
        const maintenance_mode = checked ? 1 : 0
        setData('maintenance_mode', checked)

        await axios.patch(route('maintenance', { maintenance_mode: maintenance_mode }))
    }

    const updateBlockedRoles = async (updatedRoles) => {
        await axios.patch(route('maintenance.roles', { blocked_roles: updatedRoles }))
    }

    const handleRoleToggle = (role) => {
        const updated = data.blocked_roles.includes(role)
            ? data.blocked_roles.filter(r => r !== role)
            : [...data.blocked_roles, role]

        setData('blocked_roles', updated)
        updateBlockedRoles(updated)
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <Head title='Maintenance' />
            <div className="flex items-center gap-3 mb-6">
                <Settings className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Maintenance Settings</h1>
            </div>

            {/* Maintenance Mode Toggle */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Maintenance Mode
                    </CardTitle>
                    <CardDescription>
                        When enabled, the system will be temporarily unavailable for selected user roles
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="maintenance-mode" className="text-sm font-medium">
                                Enable Maintenance Mode
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Temporarily restrict access to the system
                            </p>
                        </div>
                        <Switch
                            id="maintenance-mode"
                            checked={data.maintenance_mode}
                            onCheckedChange={updateMaintenanceMode}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Blocked Roles */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Blocked Roles
                    </CardTitle>
                    <CardDescription>
                        Select which user roles should be blocked during maintenance mode
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {roles.map(({ value, label }) => (
                            <div key={value} className="flex items-center space-x-3">
                                <Checkbox
                                    id={`role-${value}`}
                                    checked={data.blocked_roles.includes(value)}
                                    onCheckedChange={() => handleRoleToggle(value)}
                                />
                                <Label
                                    htmlFor={`role-${value}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {label}
                                </Label>
                            </div>
                        ))}
                    </div>

                    {errors.blocked_roles && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{errors.blocked_roles}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Status Summary */}
            {data.maintenance_mode && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Maintenance mode is <strong>enabled</strong>.
                        {data.blocked_roles.length > 0 && (
                            <>
                                {' '}The following roles are blocked: {' '}
                                <strong>{data.blocked_roles.join(', ')}</strong>
                            </>
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>
