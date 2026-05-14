import React from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import StudentList from '../ClassComponents/Students/StudentList';

export default function Students({ id, nameClass }) {
    const getStudents = async () => {
        try {
            const response = await axios.post(route('nstp.students', { id }));
            return response.data;
        } catch (error) {
            console.error('Error fetching students:', error);
            throw error;
        }
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['nstp-students', id],
        queryFn: getStudents,
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });

    if (error) {
        return <div>Error loading students.</div>;
    }

    return (
        <div>
            <StudentList students={data || []} isLoading={isLoading} nameClass={nameClass} />
        </div>
    );
}