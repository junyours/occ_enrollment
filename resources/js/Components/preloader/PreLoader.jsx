import { Head } from '@inertiajs/react';
import './preloader.css'

function PreLoader({ title }) {
    return (
        <div className="flex justify-center items-center h-full bg-opacity-50">
            <Head title={title} />
            <div className="scene">
                <div className="cube-wrapper">
                    <div className="cube">
                        <div className="cube-faces bg-sidebar-accent">
                            <div className="cube-face shadow bg-sidebar-accent"></div>
                            <div className="cube-face bottom bg-sidebar-accent"></div>
                            <div className="cube-face top bg-sidebar-accent"></div>
                            <div className="cube-face left bg-sidebar-accent"></div>
                            <div className="cube-face right bg-sidebar-accent"></div>
                            <div className="cube-face back bg-sidebar-accent"></div>
                            <div className="cube-face front bg-sidebar-accent"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PreLoader;