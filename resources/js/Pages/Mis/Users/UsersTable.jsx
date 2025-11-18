import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import React from 'react'
import { formatRole, getRoleBadgeColor } from './Utility'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'

function UsersTable({ users, setSelectedUser }) {
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                No users found
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.data.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.user_id_no}</TableCell>
                                <TableCell>
                                    {user.first_name && user.last_name
                                        ? `${user.first_name} ${user.last_name}`
                                        : <span className="text-gray-400 italic">No information</span>
                                    }
                                </TableCell>
                                <TableCell>
                                    {user.email || <span className="text-gray-400 italic">No email</span>}
                                </TableCell>
                                <TableCell>
                                    <Badge className={`${getRoleBadgeColor(user.user_role)} text-white`}>
                                        {formatRole(user.user_role)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.contact_number || <span className="text-gray-400 italic">No contact</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        View Details
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

export default UsersTable