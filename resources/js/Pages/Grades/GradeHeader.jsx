import AppLogo from '@/Components/AppLogo';
import { Card, CardContent } from '@/Components/ui/card'
import { usePage } from '@inertiajs/react';
import React from 'react'

function GradeHeader({ name, subjectCode, descriptiveTitle, courseSection, schoolYear, }) {

      function TermLabel({ term }) {
            const suffixMap = {
                  First: { num: "1", suffix: "st" },
                  Second: { num: "2", suffix: "nd" },
                  Summer: { num: "S", suffix: "ummer" },
            };

            const { num, suffix } = suffixMap[term] || { num: term, suffix: "" };

            return (
                  <span>
                        {num}
                        <sup>{suffix}</sup>
                  </span>
            );
      }
      return (
            <Card className='hidden print:block'>
                  <CardContent className='p-2 flex justify-between px-6'>
                        <div>
                              <p>Subject: <span className='underline'>{subjectCode} - {descriptiveTitle}</span></p>
                              <p>Course & Section: <span className='underline'>{courseSection}</span></p>
                              <p>Instructor: <span className='underline font-semibold'>{name.toUpperCase()}</span></p>
                              <p>
                                    SY: <span className='underline'>
                                          {schoolYear.start_year}-{schoolYear.end_year}{" "} | <TermLabel term={schoolYear.semester_name} /> Semester
                                    </span>
                              </p>
                        </div>
                        <div className='h-24 flex gap-2'>
                              <div className='items-center text-center self-center font-semibold'>
                                    <p>OPOL COMMUNITY COLLEGE</p>
                                    <p>OPOL, MISAMIS ORIENTAL</p>
                                    <p>OFFICE OR REGISTRAR</p>
                              </div>
                              <AppLogo />
                        </div>
                  </CardContent>
            </Card>
      )
}

export default GradeHeader