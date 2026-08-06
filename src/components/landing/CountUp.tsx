import React, { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, animate, useInView } from "framer-motion";

function Digit({ value }: { value: number }) {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  return (
    <div className="relative inline-block h-[1em] overflow-hidden leading-none tabular-nums">
      <motion.div
        animate={{ y: `-${value * 10}%` }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 15,
          restDelta: 0.001
        }}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {numbers.map((n) => (
          <span key={n} className="flex h-[1em] items-center justify-center">
            {n}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function CountUp({ 
  end, 
  duration = 2.5, 
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
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, end, {
        duration,
        onUpdate(value) {
          setDisplayValue(value);
        },
        ease: "circOut",
      });
      return () => controls.stop();
    }
  }, [isInView, end, duration]);

  const formattedValue = displayValue.toFixed(decimals);
  
  // We want to keep the same number of digits to avoid jumping
  // For '78', it's 2 digits.
  // During animation it might be '0', '1'... '9', '10'...
  // To keep it smooth, we can pad with leading zeros or just let it grow.
  // The user specifically mentioned the "7" rolling to "8" (maybe they meant 78 -> 80? or just the digits rolling).
  
  return (
    <span ref={ref} className="inline-flex items-baseline">
      {prefix && <span>{prefix}</span>}
      {formattedValue.split("").map((char, index) => {
        const val = parseInt(char);
        if (isNaN(val)) return <span key={index}>{char}</span>;
        return <Digit key={index} value={val} />;
      })}
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  );
}
