// Example of what the output should look like after transformation

import React from 'react';
import './styles.css';

function ExampleComponentConverted() {
  return (
    <div>
      {/* Inline styles converted to Tailwind classes */}
      <div className="flex justify-center items-center p-4 mb-5 bg-[#f3f4f6]">
        <h1 className="text-2xl font-bold text-[#1f2937]">
          Hello World
        </h1>
      </div>

      {/* External CSS class replaced with Tailwind classes */}
      <div className="font-bold text-center mb-5 text-gray-900">
        External CSS Title
      </div>

      {/* Existing className merged with new Tailwind classes */}
      <div className="container w-full rounded-lg">
        Content with merged classes
      </div>

      {/* Dynamic styles - unchanged (skipped) */}
      <div style={getDynamicStyle()}>
        Dynamic content
      </div>

      {/* Dynamic className - unchanged (skipped) */}
      <div className={isActive ? "active" : "inactive"} style={{ display: "flex" }}>
        Conditional classes
      </div>
    </div>
  );
}

// Internal styles converted - style block removed
const InternalStyleExampleConverted = () => (
  <>
    <div className="flex p-6 mt-4 bg-white rounded-lg">
      Box with internal styles
    </div>
  </>
);

function getDynamicStyle() {
  return { color: "red" };
}

export default ExampleComponentConverted;
