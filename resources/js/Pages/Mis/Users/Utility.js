export const getRoleBadgeColor = (role) => {
    const colors = {
        super_admin: 'bg-red-500',
        president: 'bg-purple-500',
        registrar: 'bg-blue-500',
        mis: 'bg-cyan-500',
        program_head: 'bg-green-500',
        evaluator: 'bg-yellow-500',
        guidance: 'bg-pink-500',
        faculty: 'bg-orange-500',
        student: 'bg-gray-500',
        announcement_admin: 'bg-indigo-500',
    };
    return colors[role] || 'bg-gray-500';
};

export const formatRole = (role) => {
    return role
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
