import { GraduationCap } from 'lucide-react'
import React from 'react'

function Footer() {
  return (
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-8 transition-colors duration-200">
          <div className="max-w-6xl mx-auto px-4 text-center">
              <div className="flex items-center justify-center mb-4">
                  <GraduationCap className="h-6 w-6 mr-2" />
                  <span className="text-lg font-semibold">Opol Community College</span>
              </div>
              <p className="text-gray-400 dark:text-gray-500 mb-4">
                  Building tomorrow's leaders, one student at a time.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-600">
                  © 2025 Opol Community College. All rights reserved.
              </p>
          </div>
      </footer>
  )
}

export default Footer
