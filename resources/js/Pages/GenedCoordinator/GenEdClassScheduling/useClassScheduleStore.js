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

const useScheduleStore = create((set) => ({
    classes: [],
    setClasses: (classes) =>
        set({ classes }),

    selectedSubject: { ...initialSelectedSubject },

    setSelectedSubject: (subject) => set({ selectedSubject: subject }),

    setSelectedSubjectField: (key, value) =>
        set((state) => ({
            selectedSubject: {
                ...state.selectedSubject,
                [key]: value,
            },
        })),
    clearSelectedSubject: () =>
        set({ selectedSubject: { ...initialSelectedSubject } }),

    dayType: 'single',
    setDayType: (dayType) =>
        set({ dayType }),

    meridiem: 'AM',
    setMeridiem: (meridiem) =>
        set({ meridiem }),

    classHour: '3',
    setClassHour: (classHour) =>
        set({ classHour }),

    mainScheduleConflictList: [],
    setMainScheduleConflictList: (conflicts) =>
        set({ mainScheduleConflictList: conflicts }),

    secondScheduleConflictList: [],
    setSecondScheduleConflictList: (conflicts) =>
        set({ SecondScheduleConflictList: conflicts }),

    errors: {
        faculty_id: false,
        room_id: false,
        start_time: false,
        end_time: false,
    },
    setError: (key, value) =>
        set((state) => ({
            errors: {
                ...state.errors,
                [key]: value
            }
        })),
    clearErrors: () =>
        set({
            errors: {
                faculty_id: false,
                room_id: false,
                start_time: false,
                end_time: false,
            }
        }),

    rooms: [],
    setRooms: (rooms) =>
        set({ rooms }),

    instructors: [],
    setInstructors: (instructors) =>
        set({ instructors }),

    roomConflict: false,
    setRoomConflict: (roomConflict) =>
        set({ roomConflict }),

    instructorConflict: false,
    setInstructorConflict: (instructorConflict) =>
        set({ instructorConflict }),

}))

export default useScheduleStore
