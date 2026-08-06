import React, { useEffect, useRef, useState } from "react";
import { motion, animate, useInView } from "framer-motion";

function Digit({ value }: { value: number }) {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  return (
    <div className="relative inline-block h-[1.1em] overflow-hidden leading-none tabular-nums">
      <motion.div
        animate={{ y: `-${value * 10}%` }}
        transition={{ 
          type: "spring", 
          stiffness: 80, 
          damping: 15,
          mass: 1
        }}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {numbers.map((n) => (
          <span key={n} className="flex h-[1.1em] items-center justify-center">
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
  const [showSuffix, setShowSuffix] = useState(false);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, end, {
        duration,
        onUpdate(value) {
          setDisplayValue(value);
          // Show suffix when it reaches 90% of the target
          if (value >= end * 0.9) {
            setShowSuffix(true);
          }
        },
        ease: "circOut",
      });
      return () => controls.stop();
    }
  }, [isInView, end, duration]);

  const formattedValue = displayValue.toFixed(decimals);
  
  return (
    <span ref={ref} className="inline-flex items-baseline overflow-hidden py-1">
      {prefix && <span>{prefix}</span>}
      <div className="flex">
        {formattedValue.split("").map((char, index) => {
          const val = parseInt(char);
          if (isNaN(val)) return <span key={index}>{char}</span>;
          return <Digit key={index} value={val} />;
        })}
      </div>
      {suffix && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: showSuffix ? 1 : 0, x: showSuffix ? 0 : -10 }}
          transition={{ duration: 0.5 }}
          className="ml-1"
        >
          {suffix}
        </motion.span>
      )}
    </span>
  );
}
