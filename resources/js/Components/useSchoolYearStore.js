import { create } from 'zustand';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Query function to fetch school years
const fetchSchoolYears = async () => {
    const response = await axios.post('/school-years-data');
    return response.data;
};

// Custom hook for school years query
export const useSchoolYearsQuery = () => {
    return useQuery({
        queryKey: ['schoolYears'],
        queryFn: fetchSchoolYears,
        staleTime: 60 * 60 * 1000,
        gcTime: 65 * 60 * 1000,
    });
};

export const useSchoolYearStore = create((set, get) => ({
    // State
    schoolYears: [],
    selectedSchoolYear: '',
    selectedSemester: '',
    selectedSchoolYearEntry: null,
    isCollapsed: false,
    isInitialized: false,
    isLoaded: false,

    // Initialize school years (fetches and sets up defaults)
    initializeSchoolYears: async () => {
        // Don't fetch if already loaded
        if (get().schoolYears.length > 0) {
            return;
        }

        try {
            const response = await axios.post('/school-years-data');
            const data = response.data;

            get().initializeWithData(data);
            set({ isLoaded: true });
        } catch (error) {
            console.error('Error initializing school years:', error);
            set({ isLoaded: true });
        }
    },

    // Initialize with data from query
    initializeWithData: (data) => {
        set({ schoolYears: data, isLoaded: true });

        const currentState = get();

        // If already initialized and has a selection, validate it against new data
        if (currentState.isInitialized && currentState.selectedSchoolYearEntry) {
            const { selectedSchoolYear, selectedSemester } = currentState;
            const [startYear, endYear] = selectedSchoolYear.split('–').map(Number);
            const entry = data.find(
                sy => sy.start_year === startYear &&
                    sy.end_year === endYear &&
                    sy.semester.semester_name === selectedSemester
            );

            if (entry) {
                set({ selectedSchoolYearEntry: entry });
                return; // Keep existing selection if still valid
            }
        }

        // Find default (current or latest)
        let defaultYear = data.find(sy => sy.is_current === 1);

        if (!defaultYear && data.length > 0) {
            const sorted = [...data].sort((a, b) => {
                if (b.start_year !== a.start_year) {
                    return b.start_year - a.start_year;
                }
                return b.end_year - a.end_year;
            });
            defaultYear = sorted[0];
        }

        if (defaultYear) {
            const schoolYearString = `${defaultYear.start_year}–${defaultYear.end_year}`;
            const semesterName = defaultYear.semester.semester_name;

            set({
                selectedSchoolYear: schoolYearString,
                selectedSemester: semesterName,
                selectedSchoolYearEntry: defaultYear,
                isInitialized: true
            });
        }
    },

    // Set selected school year
    setSelectedSchoolYear: (schoolYear) => {
        const { schoolYears, selectedSemester } = get();

        if (schoolYears.length === 0) return;

        const [startYear, endYear] = schoolYear.split('–').map(Number);
        const entry = schoolYears.find(
            sy => sy.start_year === startYear &&
                sy.end_year === endYear &&
                sy.semester.semester_name === selectedSemester
        );

        set({
            selectedSchoolYear: schoolYear,
            selectedSchoolYearEntry: entry || null
        });
    },

    // Set selected semester
    setSelectedSemester: (semester) => {
        const { schoolYears, selectedSchoolYear } = get();

        if (schoolYears.length === 0) return;

        if (selectedSchoolYear) {
            const [startYear, endYear] = selectedSchoolYear.split('–').map(Number);
            const entry = schoolYears.find(
                sy => sy.start_year === startYear &&
                    sy.end_year === endYear &&
                    sy.semester.semester_name === semester
            );

            set({
                selectedSemester: semester,
                selectedSchoolYearEntry: entry || null
            });
        } else {
            set({ selectedSemester: semester });
        }
    },

    // Get the full selected school year entry
    getSelectedSchoolYearEntry: () => {
        return get().selectedSchoolYearEntry;
    },

    // Get available semesters for a school year
    getAvailableSemesters: (schoolYear) => {
        const { schoolYears } = get();
        if (!schoolYear || schoolYears.length === 0) return [];

        const [startYear, endYear] = schoolYear.split('–').map(Number);
        return schoolYears
            .filter(sy => sy.start_year === startYear && sy.end_year === endYear)
            .map(sy => sy.semester.semester_name);
    },

    // Get all school years
    getSchoolYears: () => {
        return get().schoolYears;
    },

    // Get the current school year (marked as is_current)
    getCurrentSchoolYear: () => {
        const { schoolYears } = get();
        return schoolYears.find(sy => sy.is_current === 1) || null;
    },

    // Refresh data using query client
    refreshSchoolYears: async (queryClient) => {
        await queryClient.invalidateQueries({ queryKey: ['schoolYears'] });
    },

    // Clear selection
    clearSelection: () => {
        set({
            schoolYears: [],
            selectedSchoolYear: '',
            selectedSemester: '',
            selectedSchoolYearEntry: null,
            isCollapsed: false,
            isInitialized: false,
            isLoaded: false
        });
    },

    // Toggle collapse state
    toggleCollapse: () => {
        set({ isCollapsed: !get().isCollapsed });
    }
}));