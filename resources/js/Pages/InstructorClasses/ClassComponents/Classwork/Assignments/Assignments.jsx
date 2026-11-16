import React from 'react'

import ResourceList from '../Shared/ResourceList'
import SubmissionReview from './SubmissionReview'
import StudentWork from './StudentWork'

export default function Assignments() {
    return (
        <ResourceList
            kind="assignments"
            renderWork={(assignment, canManage) =>
                canManage ? (
                    <SubmissionReview
                        assignment={assignment}
                    />
                ) : (
                    <StudentWork
                        assignment={assignment}
                    />
                )
            }
        />
    )
}