import { Card, CardContent } from '@/Components/ui/card'
import { usePage } from '@inertiajs/react'
import React, { useEffect, useState } from 'react'
import { useProgramHeadStore } from "./ProgramHeadNameSignatory";

function GradeSignatories({ yearSectionSubjectsId }) {
      const [loading, setLoading] = useState(true);
      const { user } = usePage().props.auth;
      const { programHead, setProgramHead } = useProgramHeadStore();

      useEffect(() => {
            if (!programHead) {
                  axios.post(route("program-head-name", yearSectionSubjectsId))
                        .then((res) => setProgramHead(res.data))
                        .finally(() => setLoading(false))
                        .catch((err) => console.error(err));
            }
      }, [programHead, setProgramHead, yearSectionSubjectsId]);

      if (loading) return <></>

      return (
            <Card className='hidden print:block'>
                  <CardContent className='pt-6'>
                        <div className='flex justify-between'>
                              <div className='text-center'>
                                    <div className='mb-6'>
                                          Submitted by:
                                    </div>
                                    <div className='w-52 border-b'>
                                          <p>
                                                {user.first_name.toUpperCase()}
                                                {user.middle_name ? ` ${user.middle_name[0].toUpperCase()}. ` : ' '}
                                                {user.last_name.toUpperCase()}
                                          </p>
                                    </div>
                                    <div >
                                          Instructor
                                    </div>
                              </div>
                              <div className='text-center'>
                                    <div className='mb-6'>
                                          Checked by:
                                    </div>
                                    <div className='w-52 border-b h-6'>
                                          <p>
                                                {programHead.first_name.toUpperCase()}
                                                {programHead.middle_name ? ` ${programHead.middle_name[0].toUpperCase()}. ` : ' '}
                                                {programHead.last_name.toUpperCase()}
                                          </p>
                                    </div>
                                    <div>
                                          Program Head
                                    </div>
                              </div>
                              <div className='text-center'>
                                    <div className='mb-6'>
                                          Acknowledged by:
                                    </div>
                                    <div className='w-52 border-b h-6'>
                                          BERNADETH T. NACUA
                                    </div>
                                    <div>
                                          Registrar 1
                                    </div>
                              </div>
                        </div>
                  </CardContent>
            </Card>
      )
}

export default GradeSignatories