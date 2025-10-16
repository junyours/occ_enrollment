import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";

export default function AnimatedSection({ children }) {
    const controls = useAnimation();
    const [ref, inView] = useInView({ threshold: 0.2 });

    useEffect(() => {
        if (inView) {
            controls.start("visible");
        }
    }, [controls, inView]);

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={controls}
            variants={{
                hidden: { opacity: 0, y: 50 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, ease: "easeOut" },
                },
            }}
        >
            {children}
        </motion.div>
    );
}
