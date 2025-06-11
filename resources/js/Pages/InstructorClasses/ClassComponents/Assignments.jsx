import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert'
import { Info } from 'lucide-react'

function Assignments() {
  return (
      <div className="flex items-center justify-center h-60">
          <Alert className="max-w-md text-center">
              <Info className="h-5 w-5" />
              <AlertTitle>Coming Soon</AlertTitle>
              <AlertDescription>
                  The assignments feature is currently under development. Stay tuned!
              </AlertDescription>
          </Alert>
      </div>
  )
}

export default Assignments
