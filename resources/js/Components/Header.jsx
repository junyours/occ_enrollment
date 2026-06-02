import { useEffect, useRef, useState } from "react";
import Dropdown from '@/Components/Dropdown';
import { HiBars3 } from "react-icons/hi2";

function Header({ toggleSidebar, user }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <>
            <header className="h-14 max-h-14 min-h-14 bg-white text-black flex items-center justify-between px-2">
                {/* Header */}
                <div className="rounded-full hover:bg-gray-200">
                    <HiBars3 onClick={toggleSidebar} className="cursor-pointer transition-transform duration-300 ease-in-out transform
                w-10 h-10 active:scale-90" size={30} />
                </div>

                {/* Profile Picture and Dropdown */}
                <div className="relative" ref={dropdownRef}>

                    {/* Dropdown Menu */}
                    <Dropdown>
                        <Dropdown.Trigger>
                            <span className="inline-flex rounded-md">
                                <div
                                    className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-md transition-transform duration-200 ease-in-out hover:scale-105"
                                    onClick={toggleDropdown}
                                >
                                    {/* Radiant Ring */}
                                    <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                                        <div className="w-full h-full bg-white rounded-full"></div>
                                    </div>

                                    {/* Initials */}
                                    <span className="relative text-xl font-semibold text-blue-600">
                                        {/* {firstName[0].toUpperCase()} */}
                                        {user.name}
                                        B
                                    </span>
                                </div>
                            </span>
                        </Dropdown.Trigger>

                        <Dropdown.Content>
                            <Dropdown.Link
                                href={route('profile')}
                            >
                                Profile
                            </Dropdown.Link>
                            <Dropdown.Link
                                href={route('logout')}
                                method="post"
                                as="button"
                            >
                                Log Out
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>

            </header>
        </>
    )
}

export default Header;
