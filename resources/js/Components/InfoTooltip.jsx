import React, { createContext, useContext, useState } from 'react';

// Context for InfoTooltip state
const InfoTooltipContext = createContext();

// Main InfoTooltip wrapper component
const InfoTooltip = ({ children, position = 'top', delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-popover',
        left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-popover',
        right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-popover'
    };

    return (
        <InfoTooltipContext.Provider value={{
            isVisible,
            setIsVisible,
            position,
            positionClasses,
            arrowClasses,
            delay
        }}>
            <div className="relative inline-block">
                {children}
            </div>
        </InfoTooltipContext.Provider>
    );
};

// Trigger component - what you hover over
const InfoTooltipTrigger = ({ children }) => {
    const { setIsVisible, delay } = useContext(InfoTooltipContext);
    let timeoutId;

    const handleMouseEnter = () => {
        if (delay) {
            timeoutId = setTimeout(() => setIsVisible(true), delay);
        } else {
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        if (timeoutId) clearTimeout(timeoutId);
        setIsVisible(false);
    };

    return (
        <div
            className="inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </div>
    );
};

const InfoTooltipContent = ({ children, className = '' }) => {
    const { isVisible, positionClasses, arrowClasses, position } = useContext(InfoTooltipContext);

    if (!isVisible) return null;

    return (
        <div
            className={`absolute ${positionClasses[position]} 
                px-3 py-1.5 bg-popover text-popover-foreground text-sm 
                rounded-md border border-border z-50 shadow-md pointer-events-none 
                w-max whitespace-normal break-words
                ${className}`}
        >
            {children}
            <div className={`absolute ${arrowClasses[position]}`}></div>
        </div>
    );
};


// Compound component exports
InfoTooltip.Trigger = InfoTooltipTrigger;
InfoTooltip.Content = InfoTooltipContent;

export default InfoTooltip;