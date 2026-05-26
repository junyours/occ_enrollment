import { useQuery } from '@tanstack/react-query';
import StudentList from './StudentList';

export default function GradesIndex({ id, allowMidtermUpload, allowFinalUpload }) {

    const getNstpSubmissionInfo = async () => {
        try {
            const response = await axios.post(route('nstp-class.grade-submission-details', { id }));
            console.log(response.data);

            return response.data;
        } catch (error) {
            toast.error('Something went wrong! Please try refreshing your browser');
            throw error;
        }
    }

    const { data, isLoading, isError } = useQuery({
        queryKey: ['nstp-class.grade-submission-details', id],
        queryFn: getNstpSubmissionInfo,
        enabled: !!id,
    });

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