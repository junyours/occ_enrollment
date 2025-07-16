import React from 'react'

function NoSchoolYear() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <div className="relative mb-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-2">
                No Ongoing Enrollment
            </h3>

            <p className="text-muted-foreground text-center max-w-md mb-6">
                There is currently no active enrollment period. Please check back later or contact resgitrar for more information.
            </p>
        </div>
    )
}

export default NoSchoolYear
