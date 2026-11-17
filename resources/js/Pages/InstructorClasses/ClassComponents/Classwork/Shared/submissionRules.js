// What students hand in for an assignment. Each assignment takes one type:
// file upload (the default), answers to questions, or links. Mirrors
// ClassworkController::normalizeSubmissionSettings so the browser shows the
// same rules the server enforces.

// Fixed for every assignment, like the server's MAX_UPLOAD_MB and
// SUBMISSION_MAX_FILES.
export const MAX_UPLOAD_MB = 100
export const MAX_FILES = 5

export const SUBMISSION_TYPES = {
    files: {
        label: 'File upload',
        description: 'Students attach documents, images, video or audio.',
    },
    questions: {
        label: 'Questions',
        description: 'Students type answers to your essay or short-answer questions.',
    },
    links: {
        label: 'Links',
        description: 'Students paste web addresses, like a GitHub repository or a shared document.',
    },
}

// Question types; multiple choice comes later. Limits match the server.
export const QUESTION_TYPES = {
    essay: { label: 'Essay (long answer)' },
    short_answer: { label: 'Short answer (one line)' },
}
export const SHORT_ANSWER_MAX = 500
export const PROMPT_MAX = 2000
export const MAX_QUESTIONS = 50

// The single answer box every assignment had before questions existed.
export const DEFAULT_PROMPT = 'Your answer'

let nextQuestionKey = 0

// A question that is not saved yet. `key` keeps React rows stable.
export function newQuestion(type = 'essay', prompt = '') {
    nextQuestionKey += 1
    return { key: `new-${nextQuestionKey}`, id: null, type, prompt, required: false }
}

export const FILE_PRESETS = {
    any: { label: 'Any file type', extensions: null },
    documents: {
        label: 'Documents',
        extensions: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'ppt', 'pptx', 'odp', 'xls', 'xlsx', 'ods', 'csv'],
    },
    images: { label: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'] },
    media: {
        label: 'Video and audio',
        extensions: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', 'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'],
    },
    custom: { label: 'Specific file types', extensions: null },
}

const clamp = (value, min, max, fallback) => {
    const number = Number(value)
    return Number.isInteger(number) ? Math.min(max, Math.max(min, number)) : fallback
}

export function parseExtensions(value) {
    const list = Array.isArray(value) ? value : String(value ?? '').split(/[\s,;]+/)
    return [...new Set(
        list
            .map((entry) => String(entry).trim().replace(/^\./, '').toLowerCase())
            .filter((entry) => /^[a-z0-9]{1,10}$/.test(entry))
    )].slice(0, 20)
}

export function parseDomain(value) {
    const domain = String(value ?? '').trim().toLowerCase()
        .replace(/^[a-z]+:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .replace(/\.+$/, '')
    return /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) ? domain : null
}

export function normalizeSettings(raw) {
    const files = raw?.files ?? {}
    const links = raw?.links ?? {}
    const type = Object.keys(SUBMISSION_TYPES).includes(raw?.type) ? raw.type : 'files'

    let types = Object.keys(FILE_PRESETS).includes(files.types) ? files.types : 'any'
    const extensions = parseExtensions(files.extensions ?? [])
    if (types === 'custom' && extensions.length === 0) types = 'any'

    // Only the chosen type is on, and it is what completes the work.
    return {
        type,
        files: {
            enabled: type === 'files',
            required: type === 'files',
            types,
            extensions: types === 'custom' ? extensions : [],
        },
        links: {
            enabled: type === 'links',
            required: type === 'links',
            domain: parseDomain(links.domain),
            max_links: clamp(links.max_links, 1, 10, 5),
        },
    }
}

export function allowedExtensions(files) {
    if (files.types === 'custom') return files.extensions
    return FILE_PRESETS[files.types]?.extensions ?? null
}

// For <input type="file" accept>; undefined means any file.
export function acceptAttribute(files) {
    const allowed = allowedExtensions(files)
    return allowed ? allowed.map((extension) => `.${extension}`).join(',') : undefined
}

export function describeFiles(files) {
    const allowed = allowedExtensions(files)
    const types = allowed
        ? allowed.length > 6
            ? `${FILE_PRESETS[files.types]?.label ?? 'Specific types'} (${allowed.slice(0, 5).map((e) => e.toUpperCase()).join(', ')}…)`
            : allowed.map((extension) => extension.toUpperCase()).join(', ')
        : 'Any file type'

    return `${types} · up to ${MAX_UPLOAD_MB} MB each · up to ${MAX_FILES} files`
}

function extensionOf(name) {
    const value = String(name || '')
    return value.includes('.') ? value.split('.').pop().toLowerCase() : ''
}

// Returns a message when a picked file breaks the rules, before uploading.
export function fileProblem(file, files) {
    const allowed = allowedExtensions(files)

    if (allowed && !allowed.includes(extensionOf(file.name))) {
        return `${file.name}: only ${allowed.map((e) => e.toUpperCase()).join(', ')} files are accepted.`
    }

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        return `${file.name} is larger than ${MAX_UPLOAD_MB} MB.`
    }

    return null
}

export function linkProblem(url, links) {
    let parsed

    try {
        parsed = new URL(url)
    } catch {
        return 'Enter a full web address starting with https://.'
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
        return 'Enter a full web address starting with https://.'
    }

    const host = parsed.hostname.toLowerCase()

    if (links.domain && host !== links.domain && !host.endsWith(`.${links.domain}`)) {
        return `Links must be on ${links.domain}.`
    }

    return null
}

// What the student must hand in, in plain language: one line for the
// assignment's type, plus an optional detail line.
export function requirementList(settings, questions = []) {
    switch (settings.type) {
        case 'files':
            return [{ key: 'files', label: 'Attach at least one file.', hint: describeFiles(settings.files) }]

        case 'links': {
            const { domain, max_links: max } = settings.links
            return [{
                key: 'links',
                label: `Add at least one link${domain ? ` on ${domain}` : ''}.`,
                hint: `Up to ${max} link${max === 1 ? '' : 's'}.`,
            }]
        }

        case 'questions': {
            const total = questions.length
            const required = questions.filter((question) => question.required).length

            if (total === 0) return []
            if (total === 1) return [{ key: 'answers', label: 'Answer the question.' }]

            return [{
                key: 'answers',
                label: required === total
                    ? `Answer all ${total} questions.`
                    : required > 0
                        ? `Answer the ${required} required question${required === 1 ? '' : 's'}; the rest are optional.`
                        : `Answer at least one of the ${total} questions.`,
            }]
        }

        default:
            return []
    }
}

// Answers are plain text; spaces alone do not count.
export function isAnswered(answer) {
    return typeof answer === 'string' && answer.trim() !== ''
}

// Same wording as the server's turn-in check.
export function unansweredMessage(numbers, total) {
    if (numbers.length === 0) return ''
    if (total === 1) return 'Answer the question.'
    return numbers.length === 1
        ? `Answer question ${numbers[0]}.`
        : `Answer questions ${numbers.join(', ')}.`
}

// What still blocks turning in, matching the server's checks.
export function missingParts(settings, { questions = [], answers = {}, fileCount, links }) {
    const asked = settings.type === 'questions' ? questions : []
    const answered = asked.map((question) => isAnswered(answers[question.id]))
    const unanswered = asked.flatMap((question, index) => (question.required && !answered[index] ? [index + 1] : []))
    const filled = settings.links.enabled ? links.map((link) => link.trim()).filter(Boolean) : []
    const missing = []

    const badLink = filled.map((link) => linkProblem(link, settings.links)).find(Boolean)
    if (badLink) missing.push(badLink)

    if (unanswered.length > 0) {
        missing.push(unansweredMessage(unanswered, asked.length))
    } else if (settings.type === 'questions' && !answered.some(Boolean)) {
        missing.push(asked.length === 1 ? 'Answer the question.' : 'Answer at least one question.')
    }

    if (settings.files.required && fileCount === 0) missing.push('Attach at least one file.')
    if (settings.links.required && filled.length === 0) missing.push('Add a link.')

    return missing
}

// Problems in the teacher's settings that block saving the assignment;
// only the chosen type's options are checked. The card skips blank prompts:
// an empty new question explains itself.
export function settingsProblem(draft, { skipBlankPrompts = false } = {}) {
    const { files, links } = draft
    const questions = draft.questions ?? []

    if (draft.type === 'questions') {
        if (questions.length === 0) return 'Add at least one question.'
        if (questions.length > MAX_QUESTIONS) return `An assignment can have up to ${MAX_QUESTIONS} questions.`

        const blank = questions.findIndex((question) => !question.prompt.trim())
        if (blank !== -1 && !skipBlankPrompts) return `Question ${blank + 1} needs a prompt.`

        const long = questions.findIndex((question) => question.prompt.trim().length > PROMPT_MAX)
        if (long !== -1) return `Question ${long + 1} is over ${PROMPT_MAX.toLocaleString('en-US')} characters.`
    }

    if (draft.type === 'files' && files.types === 'custom' && parseExtensions(files.extensionsText ?? '').length === 0) {
        return 'List at least one file type, such as pdf.'
    }

    if (draft.type === 'links') {
        if (String(links.domain ?? '').trim() && !parseDomain(links.domain)) {
            return 'Enter a domain such as github.com, or leave it empty.'
        }

        const count = Number(links.max_links)
        if (!Number.isInteger(count) || count < 1 || count > 10) {
            return 'Max number of links must be 1 to 10.'
        }
    }

    return ''
}

// Editable form state for the teacher (numbers and extensions as text).
// Every type keeps its options, so switching back and forth loses nothing.
export function toDraft(settings, questions) {
    const normalized = normalizeSettings(settings)
    const saved = (questions ?? []).map((question) => ({
        key: `saved-${question.id}`,
        id: question.id,
        type: QUESTION_TYPES[question.type] ? question.type : 'essay',
        prompt: question.prompt ?? '',
        required: Boolean(question.required),
    }))

    return {
        type: normalized.type,
        files: {
            types: normalized.files.types,
            extensionsText: normalized.files.extensions.join(', '),
        },
        links: {
            domain: normalized.links.domain ?? '',
            max_links: normalized.links.max_links,
        },
        // Switching to questions starts with one answer box.
        questions: saved.length > 0 ? saved : [newQuestion('essay', DEFAULT_PROMPT)],
    }
}

// The question list the editor saves; other types remove the questions.
export function questionsPayload(draft) {
    if (draft.type !== 'questions') return []

    return draft.questions.map(({ id, type, prompt, required }) => ({
        ...(id ? { id } : {}),
        type,
        prompt: prompt.trim(),
        required,
    }))
}

// The settings the editor saves. The server derives which section is on
// from `type`; the other sections' options are kept for later.
export function fromDraft(draft) {
    return {
        type: draft.type,
        files: {
            types: draft.files.types,
            extensions: draft.files.types === 'custom' ? parseExtensions(draft.files.extensionsText) : [],
        },
        links: {
            domain: parseDomain(draft.links.domain),
            // The chosen type is validated before saving (settingsProblem);
            // another type's leftover input just falls back to a default.
            max_links: clamp(draft.links.max_links, 1, 10, 5),
        },
    }
}
