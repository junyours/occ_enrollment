
export function MiscellaneousFeesList(courseId, yearLevel, semester) {

    const filteredList = list.map(item => {
        // Zero Computer Fee if not BSIT
        if (courseId !== 1 && item.name === 'Computer Fee') {
            return { ...item, fee: 0 };
        }

        // Zero fees depending on year and semester
        const conditionalFees = ['Handbook', 'School ID', 'Entrance Exam Fee'];
        if (!(yearLevel === 1 && semester === 'First') && conditionalFees.includes(item.name)) {
            return { ...item, fee: 0 };
        }

        if (semester !== 'First' && item.name === 'Student Insurance') {
            return { ...item, fee: 0 };
        }

        return item;
    });

    return filteredList;
}

export function MiscellaneousFeesTotal(courseName, yearLevel, semester) {
    const miscellaneousFees = MiscellaneousFeesList(courseName, yearLevel, semester);
    const miscellaneousFeesTotal = miscellaneousFees.reduce((acc, item) => acc + item.fee, 0)

    return miscellaneousFeesTotal;
}

const list = [
    {
        name: 'Athletic Fee',
        fee: 100
    },
    {
        name: 'Cultural Fee',
        fee: 100
    },
    {
        name: 'Guidance Fee',
        fee: 50
    },
    {
        name: 'Computer Fee',
        fee: 200
    },
    {
        name: 'Handbook',
        fee: 100
    },
    {
        name: 'Library Fee',
        fee: 150
    },
    {
        name: 'Medical & Dental Fee',
        fee: 100
    },
    {
        name: 'Registration Fee',
        fee: 1000
    },
    {
        name: 'School ID',
        fee: 100
    },
    {
        name: 'Student Insurance',
        fee: 100
    },
    {
        name: 'Entrance Exam Fee',
        fee: 250
    },
]
