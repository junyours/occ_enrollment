// useGradeSubmissionStore.js
import { create } from "zustand";

export const useGradeSubmissionStore = create((set) => ({
    gradeSubmission: null, // stores fetched object

    // load data into the store
    setGradeSubmission: (data) => set({ gradeSubmission: data }),

    // clear data (e.g. on logout or page change)
    clearGradeSubmission: () => set({ gradeSubmission: null }),

    // updater for nested properties
    updateGradeSubmission: (updates) =>
        set((state) => ({
            gradeSubmission: { ...state.gradeSubmission, ...updates },
        })),
}));
