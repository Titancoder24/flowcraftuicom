import React from "react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

export const CometCard = ({ children, className }) => {
  return (
    <div className={cn("relative group z-0", className)}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[22px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
      
      {/* Comet Line - Top */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 left-0 h-[1px] w-1/2 bg-gradient-to-r from-transparent via-white to-transparent animate-comet-horizontal" />
      </div>
      
      {/* Comet Line - Bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 right-0 h-[1px] w-1/2 bg-gradient-to-r from-transparent via-white to-transparent animate-comet-horizontal-reverse" />
      </div>

      <div className="relative bg-white rounded-[20px] h-full w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};
