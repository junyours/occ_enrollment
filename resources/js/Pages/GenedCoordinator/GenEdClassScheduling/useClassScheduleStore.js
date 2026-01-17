import { create } from 'zustand'

const initialSelectedSubject = {
    id: 0,
    year_section_id: 0,
    faculty_id: 0,
    room_id: 0,
    subject_id: 0,
    class_code: "",
    descriptive_title: "",
    day: "Monday",
    start_time: "7:30",
    end_time: "10:30",
};

const initialState = {
    classes: [],
    selectedSubject: { ...initialSelectedSubject },

    dayType: 'single',
    meridiem: 'AM',
    classHour: '3',

    mainScheduleConflictList: [],
    secondScheduleConflictList: [],

    errors: {
        faculty_id: false,
        room_id: false,
        start_time: false,
        end_time: false,
    },

    rooms: [],
    instructors: [],

    roomConflict: false,
    instructorConflict: false,
};

const useScheduleStore = create((set) => ({
    ...initialState,

    setClasses: (classes) => set({ classes }),

    setSelectedSubject: (subject) =>
        set({ selectedSubject: subject }),

    setSelectedSubjectField: (key, value) =>
        set((state) => ({
            selectedSubject: {
                ...state.selectedSubject,
                [key]: value,
            },
        })),

    clearSelectedSubject: () =>
        set({ selectedSubject: { ...initialSelectedSubject } }),

    setDayType: (dayType) => set({ dayType }),
    setMeridiem: (meridiem) => set({ meridiem }),
    setClassHour: (classHour) => set({ classHour }),

    setMainScheduleConflictList: (conflicts) =>
        set({ mainScheduleConflictList: conflicts }),

    setSecondScheduleConflictList: (conflicts) =>
        set({ secondScheduleConflictList: conflicts }),

    setError: (key, value) =>
        set((state) => ({
            errors: {
                ...state.errors,
                [key]: value,
            },
        })),

    clearErrors: () =>
        set({ errors: { ...initialState.errors } }),

    setRooms: (rooms) => set({ rooms }),
    setInstructors: (instructors) => set({ instructors }),

    setRoomConflict: (roomConflict) => set({ roomConflict }),
    setInstructorConflict: (instructorConflict) => set({ instructorConflict }),

    reset: () =>
        set({
            ...initialState,
            selectedSubject: { ...initialSelectedSubject },
        }),
}));

export default useScheduleStore;
