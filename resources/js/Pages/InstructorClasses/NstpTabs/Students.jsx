import React from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import StudentList from '../ClassComponents/Students/StudentList';

export default function Students({ id, nameClass, students }) {
    return (
        <div>
            <StudentList students={students || []} nameClass={nameClass} />
        </div>
    );
}