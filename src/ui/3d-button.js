import React from 'react';

export const ThreeDButton = ({ onClick, children, className, isActive, title }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        relative transition-all duration-100 active:translate-y-[4px] active:shadow-none
        flex items-center justify-center
        bg-white text-black font-bold rounded-xl
        border-b-[4px] border-gray-300
        hover:bg-gray-50 hover:border-gray-400
        active:border-t-[4px] active:border-transparent 
        ${isActive ? 'translate-y-[4px] shadow-none border-none bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500 ring-inset' : 'shadow-lg'}
        ${className}
      `}
    >
      {children}
    </button>
  );
};
