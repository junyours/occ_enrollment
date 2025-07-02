import axios from 'axios';
import React, { useEffect, useState } from 'react';

function Signatories() {
    const [registrarSignature, setRegistrarSignature] = useState(null);
    const [billingAssessmentSignature, setBillingAssessmentSignature] = useState(null);

    useEffect(() => {
        axios
            .get(`/api/signature/registrar`, {
                responseType: 'blob',
                withCredentials: true,
            })
            .then((res) => {
                const url = URL.createObjectURL(res.data);
                setRegistrarSignature(url);
            })
            .catch((err) => {
                console.error('Could not load registrar signature:', err);
            });

        axios
            .get(`/api/signature/billing-assessment`, {
                responseType: 'blob',
                withCredentials: true,
            })
            .then((res) => {
                const url = URL.createObjectURL(res.data);
                setBillingAssessmentSignature(url);
            })
            .catch((err) => {
                console.error('Could not load billing assessment signature:', err);
            });

        return () => {
            if (registrarSignature) URL.revokeObjectURL(registrarSignature);
            if (billingAssessmentSignature) URL.revokeObjectURL(billingAssessmentSignature);
        };
    }, []);

    return (
        <div className="w-full max-w-md pt-5">
            <div className="space-y-8">
                {/* First Signatory */}
                <div className="text-center h-10">
                    {/* <p className="text-[8px] text-gray-600 mb-6">
                        The subjects reflected herein are evaluated and validated in conformity with the prescribed
                        curriculum of the program currently enrolled.
                    </p>
                    <div className="border-b-2 border-black mx-4">
                        <h3 className="font-semibold text-md">WENIE ROSE ONNAY, EdD</h3>
                    </div>
                    <p className="text-xs italic">Program Head</p> */}
                </div>

                {/* Second Signatory - Billing */}
                <div className="text-center">
                    <p className="text-[8px] mb-3">
                        Starting SY 2018-2019, Tuition and other School Fees of qualified college students shall be charged and paid by CHED-UniFAST (RA 10931).
                    </p>

                    <div className="relative border-b-2 border-black mx-4">
                        {billingAssessmentSignature && (
                            <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 h-20">
                                <img
                                    src={billingAssessmentSignature}
                                    alt="Billing Signature"
                                    className="h-full object-contain"
                                    draggable={false}
                                    onContextMenu={(e) => e.preventDefault()}
                                />
                            </div>
                        )}
                        <h3 className="font-semibold text-md">JECHRIS O. VILLANOSA, MGM</h3>
                    </div>
                    <p className="text-xs italic">Bills / Assessment Incharge</p>
                </div>

                {/* Third Signatory - Registrar */}

                <div className="text-center">
                    <p className="text-[8px] mb-3">
                        This certifies that the aforementioned student is <span className="font-bold">officially enrolled</span> for the above-stated semester and school year.
                    </p>

                    {/* Signature + Name inside underlined box */}
                    <div className="relative border-b-2 border-black mx-4 pb-1">
                        {registrarSignature && (
                            <div className="absolute -top-9 left-1/2 transform -translate-x-1/2 h-20">
                                <img
                                    src={registrarSignature}
                                    alt="Registrar Signature"
                                    className="h-full object-contain"
                                    draggable={false}
                                    onContextMenu={(e) => e.preventDefault()}
                                />
                            </div>
                        )}
                        <h3 className="font-semibold text-md">BERNADETH T. NACUA</h3>
                    </div>
                    <p className="text-sm italic">Registrar I</p>
                </div>

            </div>
        </div>
    );
}

export default Signatories;
