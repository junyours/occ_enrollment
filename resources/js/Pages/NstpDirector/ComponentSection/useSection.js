import { create } from 'zustand';

const initialSelectedSection = {
    id: 0,
    faculty_id: 0,
    room_id: 0,
    day: 'Monday',
    start_time: '7:30',
    end_time: '10:30',
    section: null,
};

const initialErrors = {
    faculty_id: false,
    room_id: false,
    start_time: false,
    end_time: false,
};

export const useSection = create((set) => ({
    // data
    sections: [],
    selectedSection: { ...initialSelectedSection },

    setSelectedSection: (section) =>
        set({ selectedSection: section }),

    setSelectedSectionField: (key, value) =>
        set((state) => ({
            selectedSection: {
                ...state.selectedSection,
                [key]: value,
            },
        })),

    clearSelectedSection: () =>
        set({ selectedSection: { ...initialSelectedSection } }),

    // ui state
    addingSection: false,
    editingSection: false,

    // loading indicator room and instructor schedules
    loadingInstructorSchedules: false,
    loadingRoomSchedules: false,

    // conflicts
    mainScheduleConflictList: [],
    secondScheduleConflictList: [],
    roomConflict: false,
    instructorConflict: false,

    // scheduling controls
    dayType: 'single',
    meridiem: 'AM',
    classHour: '3',

    // async resources (intentionally not reset)
    rooms: [],
    instructors: [],
    loadingRooms: false,
    loadingInstructors: false,

    // errors
    errors: initialErrors,

    roomConflict: false,
    instructorConflict: false,

    setRoomConflict: (roomConflict) => set({ roomConflict }),
    setInstructorConflict: (instructorConflict) => set({ instructorConflict }),

    /* ---------------- setters ---------------- */

    setSections: (sections) => set({ sections }),

    setAddingSection: (addingSection) =>
        set({ addingSection }),

    setEditingSection: (editingSection) =>
        set({ editingSection }),

    setRooms: (rooms) =>
        set({ rooms }),

    setInstructors: (instructors) =>
        set({ instructors }),

    setLoadingRooms: (loadingRooms) =>
        set({ loadingRooms }),

    setLoadingInstructors: (loadingInstructors) =>
        set({ loadingInstructors }),

    setLoadingRoomSchedules: (loadingRoomSchedules) =>
        set({ loadingRoomSchedules }),

    setLoadingInstructorSchedules: (loadingRoomSchedules) =>
        set({ loadingRoomSchedules }),

    setMainScheduleConflictList: (conflicts) =>
        set({ mainScheduleConflictList: conflicts }),

    setSecondScheduleConflictList: (conflicts) =>
        set({ secondScheduleConflictList: conflicts }),

    setMeridiem: (meridiem) =>
        set({ meridiem }),

    setClassHour: (classHour) =>
        set({ classHour }),

    setError: (key, value) =>
        set((state) => ({
            errors: {
                ...state.errors,
                [key]: value,
            },
        })),

    clearErrors: () =>
        set({ errors: initialErrors }),

    /* ---------------- resets ---------------- */

    reset: () =>
        set({
            sections: [],
            selectedSection: { ...initialSelectedSection },
            addingSection: false,
            editingSection: false,
            mainScheduleConflictList: [],
            secondScheduleConflictList: [],
            roomConflict: false,
            instructorConflict: false,
            errors: initialErrors,
            loadingInstructorSchedules: false,
            loadingRoomSchedules: false,
        }),
}));
