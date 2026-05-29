import { useQuery } from '@tanstack/react-query';
import StudentList from './StudentList';

export default function GradesIndex({ id, allowMidtermUpload, allowFinalUpload }) {
    
    return (
        <div>
            <StudentList
                id={id}
                allowMidtermUpload={allowMidtermUpload}
                allowFinalUpload={allowFinalUpload}
            />
        </div>
    )
}