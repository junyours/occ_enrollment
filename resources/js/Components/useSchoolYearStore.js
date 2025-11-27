import { create } from 'zustand';
import axios from 'axios';

export const useSchoolYearStore = create((set, get) => ({
    // State
    schoolYears: [],
    selectedSchoolYear: '',
    selectedSemester: '',
    selectedSchoolYearEntry: null, // Store the full entry object
    isLoaded: false,
    isCollapsed: false, // Store collapse state

    // Initialize from localStorage or fetch new data
    initializeSchoolYears: async () => {
        try {
            // Try to load from localStorage first
            const cachedData = localStorage.getItem('schoolYears');
            const cachedEntry = localStorage.getItem('selectedSchoolYearEntry');
            const cachedCollapsed = localStorage.getItem('schoolYearPickerCollapsed');

            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                set({
                    schoolYears: parsedData,
                    isLoaded: true,
                    isCollapsed: cachedCollapsed === 'true' // Load collapse state
                });

                // Load cached selection if exists
                if (cachedEntry) {
                    const entry = JSON.parse(cachedEntry);
                    const schoolYear = `${entry.start_year}–${entry.end_year}`;
                    const semester = entry.semester.semester_name;

                    set({
                        selectedSchoolYear: schoolYear,
                        selectedSemester: semester,
                        selectedSchoolYearEntry: entry
                    });
                    return;
                }
            }

            // If no cache or no selection, fetch from API
            const response = await axios.post('/school-years-data');
            const data = response.data;

            // Save to localStorage
            localStorage.setItem('schoolYears', JSON.stringify(data));
            set({ schoolYears: data, isLoaded: true });

            // Find default (current or latest)
            let defaultYear = data.find(sy => sy.is_current === 1);

            if (!defaultYear && data.length > 0) {
                // Sort by start_year desc, then by end_year desc
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
                    selectedSchoolYearEntry: defaultYear
                });

                // Save full entry to localStorage
                localStorage.setItem('selectedSchoolYearEntry', JSON.stringify(defaultYear));
            }
        } catch (error) {
            console.error('Error initializing school years:', error);
            set({ isLoaded: true });
        }
    },

    // Set selected school year and save full entry to localStorage
    setSelectedSchoolYear: (schoolYear) => {
        const { schoolYears, selectedSemester } = get();

        // Find the matching entry
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

        // Save full entry to localStorage
        if (entry) {
            localStorage.setItem('selectedSchoolYearEntry', JSON.stringify(entry));
        }
    },

    // Set selected semester and save full entry to localStorage
    setSelectedSemester: (semester) => {
        const { schoolYears, selectedSchoolYear } = get();

        // Find the matching entry
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

            // Save full entry to localStorage
            if (entry) {
                localStorage.setItem('selectedSchoolYearEntry', JSON.stringify(entry));
            }
        } else {
            set({ selectedSemester: semester });
        }
    },

    // Get the full selected school year entry (now from state)
    getSelectedSchoolYearEntry: () => {
        return get().selectedSchoolYearEntry;
    },

    // Get available semesters for a school year
    getAvailableSemesters: (schoolYear) => {
        const { schoolYears } = get();
        if (!schoolYear) return [];

        const [startYear, endYear] = schoolYear.split('–').map(Number);
        return schoolYears
            .filter(sy => sy.start_year === startYear && sy.end_year === endYear)
            .map(sy => sy.semester.semester_name);
    },

    // Refresh school years from API
    refreshSchoolYears: async () => {
        try {
            const response = await axios.post('/school-years-data');
            const data = response.data;

            localStorage.setItem('schoolYears', JSON.stringify(data));
            set({ schoolYears: data });

            // Update the selected entry if it exists in new data
            const { selectedSchoolYear, selectedSemester } = get();
            if (selectedSchoolYear && selectedSemester) {
                const [startYear, endYear] = selectedSchoolYear.split('–').map(Number);
                const entry = data.find(
                    sy => sy.start_year === startYear &&
                        sy.end_year === endYear &&
                        sy.semester.semester_name === selectedSemester
                );

                if (entry) {
                    set({ selectedSchoolYearEntry: entry });
                    localStorage.setItem('selectedSchoolYearEntry', JSON.stringify(entry));
                }
            }
        } catch (error) {
            console.error('Error refreshing school years:', error);
        }
    },

    // Clear all data (useful for logout)
    clearSchoolYears: () => {
        localStorage.removeItem('schoolYears');
        localStorage.removeItem('selectedSchoolYearEntry');
        localStorage.removeItem('schoolYearPickerCollapsed');
        set({
            schoolYears: [],
            selectedSchoolYear: '',
            selectedSemester: '',
            selectedSchoolYearEntry: null,
            isLoaded: false,
            isCollapsed: false
        });
    },

    // Toggle collapse state and save to localStorage
    toggleCollapse: () => {
        const newCollapsedState = !get().isCollapsed;
        set({ isCollapsed: newCollapsedState });
        localStorage.setItem('schoolYearPickerCollapsed', String(newCollapsedState));
    }
}));