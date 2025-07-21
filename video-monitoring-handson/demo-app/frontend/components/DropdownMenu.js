import React, { useState } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/20/solid";

const Dropdown = ({
  options, onSelect, placeholder = "Select an option"
}) => {

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const handleSelect = (option) => {
    setSelectedOption(option);
    onSelect(option);
    setIsOpen(false);
  };

  const baseButtonStyle = `
    inline-flex justify-start w-full rounded-md
    border border-gray-300 shadow-sm px-4 py-2
    bg-white font-semibold text-gray-700 hover:bg-gray-50
  `;
  const openPanelStyle = `
    origin-top-right absolute right-0 mt-2 w-full
    rounded-md shadow-lg bg-white z-10 ring-1 ring-gray-400
  `;
  const optionStyle = `
    block w-full text-left px-4 py-2
    font-semibold text-gray-700
    hover:bg-gray-100 hover:text-gray-900
  `;

  const element = (
    <div className="relative inline-block text-left">
      {/* Dropdown Button */}
      <div>
        <button type="button"
                className={baseButtonStyle}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="true"
                aria-expanded={isOpen} >
          {selectedOption ? selectedOption.label : placeholder}
	  {isOpen && (
            <ChevronUpIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
          )}
	  {!isOpen && (
            <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={openPanelStyle}
             role="menu"
             aria-orientation="vertical" >
          <div className="py-1" role="none">
            {options.map((option) => (
              <button key={option.value}
                      onClick={() => handleSelect(option)}
                      className={optionStyle}
                      role="menuitem" >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return element;
};

export default Dropdown;
