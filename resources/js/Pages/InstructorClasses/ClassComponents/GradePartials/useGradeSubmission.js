import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useGradeSubmission = (id) =>
    useQuery({
        queryKey: ["gradeSubmission", id],
        queryFn: async () => {
            const { data } = await axios.post(`/grade-submissions/settings/${id}`);
            return data;
        },
        enabled: !!id,
    });
