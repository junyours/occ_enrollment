import {
    BookOpen,
    User,
    Presentation,
    Building,
    Calendar1,
    User2,
    Library,
    UsersIcon,
    Construction,
    Hourglass,
    FileText,
    RefreshCcw,
    Archive,
    BarChart2,
    KeyRound,
    NotebookText,
    ClipboardList,
    ListTodo,
    FileQuestion,
    FolderPlus,
    User2Icon,
    ListChecks,
    BookOpenText,
    Inbox,
    Trash2,
    FileChartColumn,
    BookCheck,
    FileBadge,
    Handshake,
    FlaskConical,
    Shield,
    Users,
    GraduationCap,
    Users2,
    BookA,
    BookType,
    BookKey,
    Languages,
    HandCoins,
    School,
    Shapes,
    FileClock,
    UserX,
} from "lucide-react";

import { PiStudent } from "react-icons/pi";
import { MdOutlineMeetingRoom } from "react-icons/md";

export const MENU_CONFIG = {
    program_head: [
        {
            label: "Academic",
            items: [
                { name: "School Year", route: "school-year", icon: Calendar1 },
                { name: "Curriculum", route: "curriculum", icon: BookOpen },
                { name: "Classes", route: "classes", icon: Presentation },
            ],
        },
        {
            label: "People",
            items: [
                { name: "Faculty List", route: "faculty-list", icon: User },
                { name: "Student List", route: "student-list", icon: PiStudent },
            ],
        },
        {
            label: "Grades",
            items: [
                { name: "Subjects", route: "subjects-list", icon: BookOpenText },
                { name: "Requests", route: "requests", icon: Inbox },
                { name: "Submitted Grades", route: "submitted-grades", icon: FileText },
            ],
        },
        {
            label: "Evalaution Result",
            items: [
                { name: "Faculty Result", route: "ph.result", icon: User },
            ],
        },
    ],
    registrar: [
        {
            label: "Academic",
            items: [
                { name: "Classes", route: "classes", icon: Presentation },
                { name: "School Year", route: "school-year", icon: Calendar1 },
                { name: "Department", route: "department", icon: Building },
            ],
        },
        {
            label: "People",
            items: [
                { name: "Faculty List", route: "faculty-list", icon: User2 },
                { name: "Student List", route: "student-list", icon: PiStudent },
                { name: "Not Enrolled List", route: "not-enrolled-list", icon: UserX },
            ],
        },
        {
            label: "Grades",
            items: [
                { name: "Grade Submission", route: "verified-grades", icon: FileText },
                { name: "Change Request", route: "change-requests", icon: RefreshCcw },
            ],
        },
        {
            label: "Reports",
            items: [
                { name: "Enrollment Record", route: "enrollment-record", icon: Library },
                { name: "Promotional Report", route: "promotional-report", icon: BarChart2 },
                { name: "Faculty Teaching Load", route: "faculties-report", icon: User },
                { name: "Subjects Report", route: "subjects-report", icon: NotebookText },
                { name: "Permanent Record", route: "permanent-record", icon: ClipboardList },
            ],
        },
        {
            label: "Others",
            items: [
                { name: "Rooms", route: "rooms", icon: MdOutlineMeetingRoom },
            ],
        },
    ],
    student: [
        {
            label: "Academic",
            items: [
                { name: "Classes", route: "classes", icon: Presentation },
                { name: "Enrollment Record", route: "enrollment-record", icon: Library },
                { name: "Faculty Evaluation", route: "student.evaluation", icon: ListTodo },
            ],
        },
    ],
    faculty: [
        {
            label: "Academic",
            items: [
                { name: "Classes", route: "classes", icon: Presentation },
            ],
        },
        {
            label: "Grades",
            items: [
                { name: "Subjects", route: "subjects-list", icon: BookOpenText },
                { name: "Requests", route: "requests", icon: Inbox },
            ],
        },
        {
            label: "Evaluation Result",
            items: [
                { name: "Faculty Result", route: "fac.faculty.report", icon: User },
            ],
        },
    ],
    evaluator: [
        {
            label: "Academic",
            items: [
                { name: "Classes", route: "classes", icon: Presentation },
            ],
        },
        {
            label: "Evaluation Result",
            items: [
                { name: "Faculty Result", route: "eval.faculty.report", icon: User },
            ],
        },
    ],
    super_admin: [
        {
            label: "Administration",
            items: [
                { name: "Users", route: "users", icon: UsersIcon },
                { name: "Maintenance", route: "maintenance-settings", icon: Construction },
                { name: "Reset Credentials", route: "reset-credentials", icon: KeyRound },
                { name: "System Logs", route: "admin.logs.index", icon: FileText },
            ],
        },
    ],
    mis: [
        {
            label: "People",
            items: [
                { name: "Users", route: "mis-users", icon: UsersIcon },
            ],
        },
        {
            label: "Others",
            items: [
                { name: "Recycle Bin", route: "recycle-bin", icon: Presentation },
            ],
        },
    ],
    president: [
        {
            label: "President",
            items: [
                { name: "Enrollment", route: "president.ongoing-enrollment", icon: Hourglass },
            ],
        },
    ],
    announcement_admin: [
        {
            items: [
                { name: "Announcement", route: "announcement", icon: Hourglass },
            ],
        },
    ],
    guidance: [
        {
            label: "Dashboard",
            items: [
                { name: "Dashboard", route: "guidance.dashboard", icon: Presentation },
            ],
        },
        {
            label: "Evaluation Manager",
            items: [
                { name: "Criteria", route: "guidance.criteria", icon: ListChecks },
                { name: "Questionnaires", route: "guidance.questionnaire", icon: FileQuestion },
                { name: "Evaluation", route: "guidance.evaluation", icon: FolderPlus },
            ],
        },
        {
            label: "People",
            items: [
                { name: "Faculty", route: "guidance.faculty.index", icon: User2Icon },
                { name: "Faculty Ranking", route: "guidance.faculty.ranking", icon: FileChartColumn },
                { name: "Student", route: "guidance.student.index", icon: ClipboardList },
            ],
        },
        {
            label: "Archives",
            items: [
                { name: "Archives", route: "guidance.archive", icon: Archive },
            ],
        },
        {
            label: "Recommendation Management",
            items: [
                { name: "Language", route: "languages.index", icon: Languages },
                { name: "Categories", route: "feedback-categories.index", icon: BookType },
                { name: "Keywords", route: "feedback-keywords.index", icon: BookKey },
                { name: "Unknown Keywords", route: "unknown-keywords.index", icon: BookA },
            ],
        },
        {
            label: "Trash",
            items: [
                { name: "Trash", route: "guidance.trash", icon: Trash2 },
            ],
        },
    ],
    librarian: [
        {
            label: "Clearance",
            items: [
                { name: "Approval Sheet", route: "approval-sheets", icon: BookCheck },
            ],
        },
    ],
    ojt_coordinator: [
        {
            label: "Clearance",
            items: [
                { name: "MOA", route: "classes", icon: Handshake },
                { name: "OJT Cert", route: "classes", icon: FileBadge },
            ],
        },
    ],
    research_coordinator: [
        {
            label: "Clearance",
            items: [
                { name: "Approval Sheet", route: "classes", icon: FlaskConical },
            ],
        },
    ],
    vpaa: [
        {
            label: "Dashboard",
            items: [
                { name: "Dashboard", route: "vdashboard", icon: Presentation },
            ],
        },
        {
            label: "People",
            items: [
                { name: "Faculty", route: "vpaa.faculty.index", icon: User2Icon },
                { name: "Faculty Ranking", route: "vpaa.faculty.ranking", icon: FileChartColumn },
                { name: "Student", route: "vpaa.student.index", icon: ClipboardList },
            ],
        },
        {
            label: "Archives",
            items: [
                { name: "Archives", route: "vpaa.archive", icon: Archive },
            ],
        },
    ],
    gened_coordinator: (courses) => [
        {
            label: "Courses",
            items: courses.map((course) => ({
                name: course.course_name_abbreviation,
                route: "gened-coordinator.sections",
                params: { hashedCourseID: course.hashed_course_id },
                icon: BookOpen,
            })),
        },
        {
            label: "Schedules",
            items: [
                { name: "Room", route: "gened-coordinator.rooms-schedules", icon: MdOutlineMeetingRoom },
                { name: "Faculty", route: "gened-coordinator.faculties-schedules", icon: UsersIcon },
            ],
        },
    ],
    nstp_director: [
        {
            items: [
                { name: "Dashboard", route: "nstp-director.dashboard", icon: Presentation },
                { name: "Students", route: "nstp-director.students", icon: Users },
            ],
        },
        {
            label: "NSTP Components",
            items: [
                { name: "ROTC", route: "nstp-director.component.sections", params: "rotc", icon: Shield },
                { name: "CWTS", route: "nstp-director.component.sections", params: "cwts", icon: Users },
                { name: "LTS", route: "nstp-director.component.sections", params: "lts", icon: GraduationCap },
            ],
        },
        {
            label: "Schedules",
            items: [
                { name: "Room", route: "nstp-director.rooms-schedules", icon: MdOutlineMeetingRoom },
                { name: "Faculty", route: "nstp-director.faculties-schedules", icon: UsersIcon },
            ],
        },
        {
            label: "Grades",
            items: [
                { name: "Submitted Grades", route: "submitted-grades", icon: FileText },
            ],
        },
        {
            label: "Others",
            items: [
                { name: "Serial Numbering", route: "nstp-director.serial-numbering", icon: Users2 },
                { name: "Evaluators", route: "nstp-director.nstp-evaluators", icon: Users2 },
            ],
        },
    ],
    cwts_evaluator: [
        {
            items: [
                { name: "Dashboard", route: "nstp-director.dashboard", icon: Presentation },
                { name: "Students", route: "nstp-director.students", icon: Users },
            ],
        },
        {
            label: "NSTP Components",
            items: [
                { name: "CWTS", route: "nstp-director.component.sections", params: "cwts", icon: Users },
            ],
        },
    ],
    ltts_evaluator: [
        {
            items: [
                { name: "Dashboard", route: "nstp-director.dashboard", icon: Presentation },
                { name: "Students", route: "nstp-director.students", icon: Users },
            ],
        },
        {
            label: "NSTP Components",
            items: [
                { name: "LTS", route: "nstp-director.component.sections", params: "lts", icon: Users },
            ],
        },
    ],
    billing: [
        {
            label: "Fees",
            items: [
                { name: "Student Balances", route: "billing.student.balance", icon: HandCoins },
            ],
        },
        {
            label: "Others",
            items: [
                { name: "School Years", route: "billing.school.year", icon: School },
                { name: "Semesters", route: "billing.semester", icon: GraduationCap },
                { name: "Types", route: "billing.type", icon: Shapes },
            ],
        },
        {
            label: "Reports",
            items: [
                { name: "Transaction History", route: "billing.transaction.history", icon: FileClock },
                { name: "Enrollment Record", route: "enrollment-record", icon: Library },
            ],
        },
    ],
    academic_dean: [
        {
            label: "Schedules",
            items: [
                { name: "Faculty", route: "schedules.view-faculty-schedules", icon: UsersIcon },
                { name: "Room", route: "schedules.view-room-schedules", icon: MdOutlineMeetingRoom },
            ],
        },
    ],
};