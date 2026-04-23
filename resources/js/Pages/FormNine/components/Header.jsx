import React from 'react';
import AppLogo from '@/Components/AppLogo';

export default function Header() {
    return (
        <div className="flex justify-center items-center pt-14 pb-2 px-4">
            <div className="flex items-center space-x-2">

                {/* Logo */}
                <AppLogo
                    size="xl"
                    className="h-36 w-32 object-fill"
                />

                {/* Text Content */}
                <div className="flex flex-col items-center text-center text-black">

                    {/* Main Title */}
                    <h1
                        className="text-3xl font-black tracking-wide h-8"
                        style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
                    >
                        OPOL COMMUNITY COLLEGE
                    </h1>

                    {/* Location */}
                    <p
                        className="text-[1.1rem] font-bold h-[1.3rem]"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                        Opol, Misamis Oriental
                    </p>

                    {/* Contact Info */}
                    <p
                        className="text-[.7rem] font-medium"
                        style={{ fontFamily: "Arial, sans-serif" }}
                    >
                        • opolcommunitycollege@yahoo.com <span className="ml-3">•</span> www.occ.edu.ph
                    </p>

                    <div className='w-full px-10'>
                        {/* Department */}
                        <h2
                            className="text-2xl font-black tracking-wide h-7"
                            style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
                        >
                            OFFICE OF THE REGISTRAR
                        </h2>

                        {/* Bottom Underline */}
                        <div className="w-full border-b-[3px] border-black"></div>
                    </div>

                </div>
            </div>
        </div>
    );
}