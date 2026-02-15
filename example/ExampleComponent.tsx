// Example React component with various CSS patterns

import React from 'react';
import './styles.css';

function ExampleComponent() {
  return (
    <div>
      {/* Inline styles - will be converted */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "center",
          alignItems: "center",
          padding: "16px",
          marginBottom: "20px",
          backgroundColor: "#f3f4f6"
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937" }}>
          Hello World
        </h1>
      </div>

      {/* Using className from external CSS - will be converted */}
      <div className="main-head">
        External CSS Title
      </div>

      {/* Existing className with inline styles - classes will be merged */}
      <div 
        className="container"
        style={{ 
          width: "100%",
          borderRadius: "8px"
        }}
      >
        Content with merged classes
      </div>

      {/* Dynamic styles - will be skipped with warning */}
      <div style={getDynamicStyle()}>
        Dynamic content
      </div>

      {/* Dynamic className - will be skipped with warning */}
      <div className={isActive ? "active" : "inactive"} style={{ display: "flex" }}>
        Conditional classes
      </div>
    </div>
  );
}

// Internal styles - will be processed
const InternalStyleExample = () => (
  <>
    <div className="internal-box">
      Box with internal styles
    </div>
    <style>{`
      .internal-box {
        display: flex;
        padding: 24px;
        margin-top: 16px;
        background-color: white;
        border-radius: 8px;
      }
    `}</style>
  </>
);

function getDynamicStyle() {
  return { color: "red" };
}

export default ExampleComponent;
