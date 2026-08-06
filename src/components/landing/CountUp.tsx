import React, { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, animate, useInView } from "framer-motion";

interface RollingNumberProps {
  value: number;
  direction?: "up" | "down";
  suffix?: string;
  prefix?: string;
}

function Digit({ digit }: { digit: string }) {
  const [prevDigit, setPrevDigit] = useState(digit);
  
  // Create an array for the column of numbers to scroll through
  const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="relative inline-block h-[1em] overflow-hidden leading-none">
      <motion.div
        key={digit}
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          mass: 1
        }}
        className="flex flex-col"
      >
        <span>{digit}</span>
      </motion.div>
      <motion.div
        initial={{ y: "0%" }}
        animate={{ y: "-100%" }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          mass: 1
        }}
        className="absolute inset-0 flex flex-col"
      >
        <span>{prevDigit}</span>
      </motion.div>
    </div>
  );
}

/**
 * A simpler linear counter for the whole number that looks like it's counting up.
 * The user requested a "scrolling" feel.
 */
export function CountUp({ 
  end, 
  duration = 2, 
  suffix = "", 
  prefix = "",
  decimals = 0 
}: { 
  end: number; 
  duration?: number; 
  suffix?: string; 
  prefix?: string;
  decimals?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, end, {
        duration,
        onUpdate(value) {
          setDisplayValue(value);
        },
        ease: "easeOut",
      });
      return () => controls.stop();
    }
  }, [isInView, end, duration]);

  const formattedValue = displayValue.toFixed(decimals);

  return (
    <span ref={ref} className="inline-flex items-center">
      {prefix}
      {formattedValue.split("").map((char, index) => {
        if (isNaN(parseInt(char))) return <span key={index}>{char}</span>;
        return <Digit key={`${index}-${char}`} digit={char} />;
      })}
      {suffix}
    </span>
  );
}
