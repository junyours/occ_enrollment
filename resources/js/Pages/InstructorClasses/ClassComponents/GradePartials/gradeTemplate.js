import * as XLSX from 'xlsx'

// The Excel file teachers fill in and bring back with Import grades. The
// first sheet is read back by its ID NUMBER, MIDTERM and FINAL headings, so
// those stay as they are; the second explains how to fill it in.

const HEADINGS = ['ID NUMBER', 'NAME', 'MIDTERM', 'FINAL']
// Shown with one decimal in Excel, whatever is typed (2.25 shows as 2.3, and
// imports as 2.3 too).
const GRADE_FORMAT = '0.0'

// A saved grade as a number with one decimal, or nothing.
function asGrade(value) {
    if (value === '' || value == null) return null
    const number = Number(value)

    return Number.isNaN(number) ? null : Math.round(number * 10) / 10
}

/**
 * grades: [{ id_number, name, midterm_grade, final_grade }]
 * notes: { midterm, final } — whether each column will be imported, and why.
 */
export function buildGradeTemplate({ grades, subject, section, notes, downloadedAt = new Date() }) {
    const rows = grades.map((student) => [
        String(student.id_number ?? ''),
        student.name,
        asGrade(student.midterm_grade),
        asGrade(student.final_grade),
    ])

    const sheet = XLSX.utils.aoa_to_sheet([HEADINGS, ...rows])

    rows.forEach((_, index) => {
        const row = index + 1

        // ID numbers stay text, so Excel never turns one into a number or date.
        const id = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
        if (id) id.z = '@'

        // Grade cells, blank ones too, so typed grades also show one decimal.
        // (A truly empty cell isn't written at all; an empty one keeps its
        // format, Excel keeps it when a grade is typed in, and Import grades
        // skips empty values.)
        for (const column of [2, 3]) {
            const ref = XLSX.utils.encode_cell({ r: row, c: column })
            sheet[ref] = sheet[ref] ? { ...sheet[ref], z: GRADE_FORMAT } : { t: 's', v: '', z: GRADE_FORMAT }
        }
    })

    sheet['!cols'] = [{ wch: 16 }, { wch: 34 }, { wch: 10 }, { wch: 10 }]
    sheet['!autofilter'] = { ref: `A1:D${rows.length + 1}` }

    const downloaded = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(downloadedAt)

    const instructions = XLSX.utils.aoa_to_sheet([
        ['How to fill in the Grades sheet'],
        [`${subject} · ${section}`],
        [],
        ['1.', 'Type grades in the MIDTERM and FINAL columns: 1.0 to 5.0, one decimal (2.25 becomes 2.3).'],
        ['2.', 'Dropped students get 0.0. Don’t leave anyone blank before you submit.'],
        ['3.', 'Don’t change the ID NUMBER column or the headings: students are matched by ID number.'],
        ['4.', 'A blank cell keeps the grade already saved in the system.'],
        ['5.', 'Save the file, then choose Import grades on the Grades tab.'],
        [],
        ['Midterm', notes.midterm],
        ['Final', notes.final],
        [],
        ['Downloaded', downloaded],
    ])
    instructions['!cols'] = [{ wch: 12 }, { wch: 90 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Grades')
    XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions')
    workbook.Props = { Title: `${subject} ${section} grades` }

    return workbook
}

export const TEMPLATE_WRITE_OPTIONS = { bookType: 'xlsx' }
