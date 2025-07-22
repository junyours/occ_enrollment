import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { convertToAMPM } from '@/Lib/Utils';
import { Eye } from 'lucide-react';

function FacultyVerifiedSubjectListCard({ subjects, schoolYear, facultyId }) {
  return (
      <Card>
          <CardHeader>
              <CardTitle className='text-lg'>Subject List</CardTitle>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>SUBJECT</TableHead>
                          <TableHead>VERIFIED AT</TableHead>
                          <TableHead>DEPLOYED AT</TableHead>
                          <TableHead>STATUS</TableHead>
                          <TableHead>ACTION</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {subjects.map((subject, index) => (
                          <TableRow key={subject.id}>
                              <TableCell>{index + 1}.</TableCell>
                              <TableCell>{subject.descriptive_title}</TableCell>
                              <TableCell>
                                  {(() => {
                                      const [submittedDate, submittedTimeRaw] = subject.verified_at?.split(' ') || [];
                                      const [hour, minute] = submittedTimeRaw?.split(':') || [];
                                      const submittedTime = hour && minute ? `${hour}:${minute}` : '';
                                      return (
                                          <div>
                                              <div>{submittedDate || '—'}</div>
                                              <div>{convertToAMPM(submittedTime) || ''}</div>
                                          </div>
                                      );
                                  })()}
                              </TableCell>
                              <TableCell>
                                  {(() => {
                                      const [submittedDate, submittedTimeRaw] = subject.deployed_at?.split(' ') || [];
                                      const [hour, minute] = submittedTimeRaw?.split(':') || [];
                                      const submittedTime = hour && minute ? `${hour}:${minute}` : '';
                                      return (
                                          <div>
                                              <div>{submittedDate || '—'}</div>
                                              <div>{convertToAMPM(submittedTime) || ''}</div>
                                          </div>
                                      );
                                  })()}
                              </TableCell>
                              <TableCell>
                                  {
                                      subject.is_deployed ? (
                                          <span className="px-2 py-1 text-sm font-medium text-white bg-green-600 rounded">Deployed</span>
                                      ) : subject.is_verified ? (
                                          <span className="px-2 py-1 text-sm font-medium text-white bg-blue-600 rounded">Ready to Deploy</span>
                                      ) : subject.is_denied ? (
                                          <span className="px-2 py-1 text-sm font-medium text-white bg-red-600 rounded">Denied</span>
                                      ) : subject.is_submitted ? (
                                          <span className="px-2 py-1 text-sm font-medium text-white rounded">Submitted</span>
                                      ) : (
                                          ''
                                      )
                                  }
                              </TableCell>
                              <TableCell>
                                  <a href={route('verified.faculty.subject.students', {
                                      schoolYear: `${schoolYear.start_year}-${schoolYear.end_year}`,
                                      semester: schoolYear.semester_name,
                                      facultyId: facultyId,
                                      yearSectionSubjectsId: subject.hashed_year_section_subject_id
                                  })}>
                                      <Eye
                                          // onClick={() => selectSubject(subject)}
                                          className="text-blue-700 cursor-pointer"
                                      />
                                  </a>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
  )
}

export default FacultyVerifiedSubjectListCard
