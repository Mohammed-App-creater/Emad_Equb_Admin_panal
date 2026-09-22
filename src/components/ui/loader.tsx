import { motion } from "motion/react";
import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [items, setItems] = useState([0, 1, 2, 3, 4]);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) => {
        const newItems = [...prev];
        const first = newItems.shift();
        if (first !== undefined) {
          newItems.push(first);
        }
        return newItems;
      });
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <div className="relative flex h-16 w-48 items-end justify-center gap-2">
        {items.map((item, index) => {
          const isLast = index === 4;
          const isFirst = index === 0;
          
          return (
            <motion.div
              key={item}
              layoutId={`box-${item}`}
              className="h-1.5 w-1.5 rounded-[1px] bg-primary shadow-sm"
              initial={false}
              animate={{
                scale: isFirst ? 1.2 : 1,
                // Jump effect only for the one that moved to the end (index 4)
                y: isLast ? [0, -20, 0] : 0,
                zIndex: isLast ? 10 : 1,
              }}
              transition={{
                duration: 0.5,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>
      <h2 className="mt-8 text-xl font-medium tracking-tight text-muted-foreground animate-pulse">
        Loading...
      </h2>
    </div>
  );
}
