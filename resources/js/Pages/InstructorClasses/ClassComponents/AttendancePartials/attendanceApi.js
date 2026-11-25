import axios from 'axios'

const config = {
    headers: { Accept: 'application/json' },
    timeout: 20000,
}

const base = (classId) =>
    `/classes/${encodeURIComponent(classId)}/attendance`

const meeting = (classId, id) =>
    `${base(classId)}/sessions/${encodeURIComponent(id)}`

export const attendanceApi = {
    async list(classId, period = 'all', signal) {
        const params = period === 'all' ? {} : { period }

        const response = await axios.get(base(classId), {
            ...config,
            params,
            signal,
        })

        return response.data
    },

    async show(classId, id, signal) {
        return (
            await axios.get(meeting(classId, id), {
                ...config,
                signal,
            })
        ).data
    },

    async create(classId, values, actorId) {
        return (
            await axios.post(
                `${base(classId)}/sessions`,
                { ...values, actor_id: actorId },
                config,
            )
        ).data
    },

    // `values` carries what the action changes, like { status } or { period }.
    async action(classId, id, action, version, actorId, values = {}) {
        const method = ['status', 'period'].includes(action) ? 'patch' : 'post'

        return (
            await axios[method](
                `${meeting(classId, id)}/${action}`,
                { ...values, version, actor_id: actorId },
                config,
            )
        ).data
    },

    async save(classId, id, payload) {
        return (
            await axios.put(
                `${meeting(classId, id)}/records`,
                payload,
                config,
            )
        ).data
    },

    async exportData(classId, date, period = 'all', signal) {
        return (
            await axios.get(`${base(classId)}/export`, {
                ...config,
                params: {
                    ...(date ? { date } : {}),
                    period,
                },
                signal,
                timeout: 60000,
            })
        ).data
    },
}

export function apiError(error) {
    const status = error.response?.status

    if (status === 401 || status === 419) {
        return 'Sign in again to sync. Your pending changes are still on this device.'
    }

    return (
        Object.values(error.response?.data?.errors || {}).flat()[0] ||
        error.response?.data?.message ||
        error.message ||
        'Unable to connect. Pending changes will retry automatically.'
    )
}
