import Image from "next/image";
import React from "react";

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>

      <div className="relative w-full h-full shrink-0">
        {/* Light logo */}
        <Image
          src="/images/emad-logo-light.png"
          alt="Emad Logo"
          fill
          priority
          className="object-contain rounded-full dark:hidden"
        />

        {/* Dark logo */}
        <Image
          src="/images/emad-logo-dark.png"
          alt="Emad Logo"
          fill
          priority
          className="object-contain rounded-full hidden dark:block"
        />
      </div>
    </div>
  );
};
