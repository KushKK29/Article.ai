const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak, PageNumber, Header, Footer, Tab,
  TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

// Color palette
const COLORS = {
  primary: "1A3A6B",       // Deep navy
  secondary: "2E75B6",     // Medium blue
  accent: "E8572A",        // Orange-red
  week1: "1A6B3A",         // Green
  week2: "6B1A3A",         // Maroon
  week3: "1A4A6B",         // Steel blue
  week4: "6B5A1A",         // Gold
  codeBg: "F0F4F8",        // Light blue-grey
  headerBg: "1A3A6B",
  subheaderBg: "D6E4F0",
  tipBg: "FFF3CD",
  gateBg: "E8F5E9",
  white: "FFFFFF",
  lightGrey: "F5F5F5",
  darkText: "1A1A2E",
};

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function heading1(text, color = COLORS.primary) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, color, size: 36, font: "Arial" })]
  });
}

function heading2(text, color = COLORS.secondary) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, color, size: 28, font: "Arial" })]
  });
}

function heading3(text, color = COLORS.accent) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, color, size: 24, font: "Arial" })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: COLORS.darkText, ...opts })]
  });
}

function bullet(text, level = 0, numbering) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: COLORS.darkText })]
  });
}

function numberedItem(text, ref = "numbers") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: COLORS.darkText })]
  });
}

function codeBlock(lines) {
  const children = [];
  for (const line of lines) {
    children.push(new Paragraph({
      spacing: { before: 20, after: 20 },
      indent: { left: 360 },
      children: [new TextRun({ text: line, font: "Courier New", size: 18, color: "1A1A6B" })]
    }));
  }
  return children;
}

function colorBox(label, text, bgColor, labelColor = COLORS.white) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [new TableCell({
          borders: noBorders,
          width: { size: 9360, type: WidthType.DXA },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 20 },
              children: [new TextRun({ text: label, bold: true, font: "Arial", size: 20, color: labelColor })]
            }),
            new Paragraph({
              spacing: { before: 20, after: 40 },
              children: [new TextRun({ text, font: "Arial", size: 20, color: COLORS.darkText })]
            })
          ]
        })]
      })
    ]
  });
}

function sectionHeader(text, bgColor) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [new TableCell({
          borders: noBorders,
          width: { size: 9360, type: WidthType.DXA },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: { top: 160, bottom: 160, left: 280, right: 280 },
          children: [new Paragraph({
            children: [new TextRun({ text, bold: true, font: "Arial", size: 28, color: COLORS.white })]
          })]
        })]
      })
    ]
  });
}

function dayHeader(dayNum, title, weekColor) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1440, 7920],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: 1440, type: WidthType.DXA },
            shading: { fill: weekColor, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DAY", bold: true, font: "Arial", size: 18, color: COLORS.white })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${dayNum}`, bold: true, font: "Arial", size: 36, color: COLORS.white })] })
            ]
          }),
          new TableCell({
            borders: noBorders,
            width: { size: 7920, type: WidthType.DXA },
            shading: { fill: COLORS.subheaderBg, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 280, right: 200 },
            children: [new Paragraph({ children: [new TextRun({ text: title, bold: true, font: "Arial", size: 26, color: COLORS.primary })] })]
          })
        ]
      })
    ]
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: "" })] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function mcqBox(question, options, answer) {
  const rows = [
    new TableRow({
      children: [new TableCell({
        borders: noBorders,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: COLORS.gateBg, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 40, left: 200, right: 200 },
        children: [new Paragraph({ children: [new TextRun({ text: "GATE-Style MCQ", bold: true, font: "Arial", size: 20, color: COLORS.week1 })] })]
      })]
    }),
    new TableRow({
      children: [new TableCell({
        borders: noBorders,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: COLORS.gateBg, type: ShadingType.CLEAR },
        margins: { top: 20, bottom: 40, left: 200, right: 200 },
        children: [
          new Paragraph({ spacing: { before: 20, after: 20 }, children: [new TextRun({ text: question, font: "Arial", size: 20, color: COLORS.darkText })] }),
          ...options.map(opt => new Paragraph({ spacing: { before: 20, after: 20 }, indent: { left: 360 }, children: [new TextRun({ text: opt, font: "Arial", size: 20, color: COLORS.darkText })] })),
          new Paragraph({ spacing: { before: 40, after: 20 }, children: [new TextRun({ text: `Answer: ${answer}`, bold: true, font: "Arial", size: 20, color: COLORS.accent })] })
        ]
      })]
    })
  ];
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360], rows });
}

function tipBox(tipText) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: noBorders,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: COLORS.tipBg, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 200, right: 200 },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Beginner Tips & Common Mistakes", bold: true, font: "Arial", size: 20, color: "856404" })] }),
          ...tipText.map(t => new Paragraph({ spacing: { before: 40, after: 20 }, numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: t, font: "Arial", size: 20, color: COLORS.darkText })] }))
        ]
      })]
    })]
  });
}

// ─── CONTENT DATA ────────────────────────────────────────────────────────────

const days = [

// ═══════════════════ WEEK 1 ═══════════════════
{
  day: 1, weekColor: COLORS.week1,
  title: "Introduction to VHDL: What Is It and Why Should ECE Students Learn It?",
  seoKeyword: "VHDL tutorial for beginners",
  overview: "VHDL (Very High Speed Integrated Circuit Hardware Description Language) is the backbone of digital design. This first article sets the stage — explaining what VHDL is, how it differs from programming languages like C, and why it is essential for GATE, placements, and FPGA-based careers.",
  theory: [
    "History of VHDL: developed by the US Department of Defense in the 1980s, standardized as IEEE 1076",
    "VHDL vs Verilog: key differences and when to use each",
    "Hardware Description vs Software Programming: VHDL describes concurrent hardware, not sequential code",
    "VHDL design flow: Specification → RTL Coding → Simulation → Synthesis → Implementation",
    "Tools used in India: ModelSim/QuestaSim, Xilinx Vivado, Intel Quartus Prime (free versions available)",
    "VHDL in GATE syllabus: topics covered and weightage",
    "Career scope: VLSI, FPGA, Embedded Systems, chip design companies in India (Intel, Qualcomm, Synopsys)"
  ],
  keyDefs: ["VHDL", "HDL", "RTL (Register Transfer Level)", "Synthesis", "Simulation", "FPGA", "ASIC"],
  analogy: "Analogy: VHDL is like an architect's blueprint for hardware. Just as a blueprint describes a building before it is constructed, VHDL describes a circuit before it is fabricated or loaded onto an FPGA.",
  codeTitle: "Basic VHDL File Structure — Entity and Architecture Template",
  codeStyle: "Behavioral",
  testbench: false,
  code: [
    "-- Day 1: Basic VHDL Structure",
    "-- Every VHDL file has two main parts: ENTITY and ARCHITECTURE",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "-- ENTITY: Defines the 'black box' interface (inputs/outputs)",
    "entity AND_Gate is",
    "    Port (",
    "        A : in  STD_LOGIC;   -- Input A",
    "        B : in  STD_LOGIC;   -- Input B",
    "        Y : out STD_LOGIC    -- Output Y",
    "    );",
    "end AND_Gate;",
    "",
    "-- ARCHITECTURE: Defines the internal behaviour",
    "architecture Behavioral of AND_Gate is",
    "begin",
    "    Y <= A AND B;  -- Concurrent signal assignment",
    "end Behavioral;",
  ],
  simOutput: "When A=0,B=0 → Y=0; A=0,B=1 → Y=0; A=1,B=0 → Y=0; A=1,B=1 → Y=1. The waveform shows Y going HIGH only when both inputs are HIGH.",
  questions: {
    conceptual: "What is the fundamental difference between VHDL and a programming language like C in terms of execution model?",
    coding: "Write the entity declaration for a 2-input OR gate with inputs X, Z and output F.",
    mcq: {
      q: "VHDL stands for:",
      opts: ["(A) Very High Digital Logic", "(B) VHSIC Hardware Description Language", "(C) Virtual Hardware Design Language", "(D) Very High Speed Circuit Language"],
      ans: "(B) — VHSIC stands for Very High Speed Integrated Circuit"
    }
  },
  tips: [
    "VHDL is NOT case sensitive — 'Signal' and 'SIGNAL' are the same, but always use lowercase keywords for readability.",
    "Every semicolon matters! Missing a semicolon is the #1 syntax error for beginners.",
    "The entity describes 'what goes in and out'; the architecture describes 'what happens inside'. Never mix them up.",
    "Download ModelSim Student Edition (free) from Mentor Graphics before Day 2."
  ]
},

{
  day: 2, weekColor: COLORS.week1,
  title: "VHDL Syntax Rules and Program Structure Every Beginner Must Know",
  seoKeyword: "VHDL syntax rules and structure",
  overview: "Before writing any circuit, you must master VHDL's grammatical rules. This article covers the complete skeleton of a VHDL program — libraries, packages, entity, architecture, and the concurrent vs sequential execution model that confuses most beginners.",
  theory: [
    "Library and USE clauses: IEEE library, STD_LOGIC_1164, NUMERIC_STD explained",
    "Entity declaration syntax: port modes — IN, OUT, INOUT, BUFFER",
    "Architecture body structure: declarative region vs statement region",
    "Comments in VHDL: single-line with '--', no multi-line comments",
    "Identifiers and reserved words: naming conventions, what names are illegal",
    "Concurrent vs Sequential execution: all statements in architecture run in parallel",
    "The role of the semicolon and parentheses — common punctuation rules"
  ],
  keyDefs: ["Library", "Package", "Entity", "Architecture", "Port", "Signal", "Concurrent Statement"],
  analogy: "Analogy: Think of the LIBRARY as importing tools from a toolbox, the ENTITY as the plug/socket (interface to the outside world), and the ARCHITECTURE as the internal wiring diagram of an appliance.",
  codeTitle: "2-Input NAND Gate — demonstrating full VHDL syntax structure",
  codeStyle: "Behavioral",
  testbench: false,
  code: [
    "-- Day 2: Full VHDL Syntax Structure Demo",
    "",
    "-- Step 1: Library Declaration",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;  -- For STD_LOGIC type",
    "",
    "-- Step 2: Entity (Interface definition)",
    "entity NAND_Gate is",
    "    Port (",
    "        A : in  STD_LOGIC;",
    "        B : in  STD_LOGIC;",
    "        Y : out STD_LOGIC",
    "    );",
    "end entity NAND_Gate;  -- 'entity' keyword optional in 'end'",
    "",
    "-- Step 3: Architecture (Behaviour definition)",
    "architecture Behavioral of NAND_Gate is",
    "    -- Declarative Region: signals, constants declared here",
    "    signal temp : STD_LOGIC;  -- internal signal example",
    "begin",
    "    -- Statement Region: all lines execute CONCURRENTLY",
    "    temp <= A AND B;",
    "    Y    <= NOT temp;",
    "end architecture Behavioral;",
  ],
  simOutput: "Output Y is '0' only when both A and B are '1'. All other combinations produce '1'. This is the inverse of AND gate behaviour.",
  questions: {
    conceptual: "Why is it incorrect to say 'VHDL executes line by line from top to bottom' in the architecture body?",
    coding: "Write the complete VHDL syntax (library, entity, architecture) for a NOT gate with input P and output Q.",
    mcq: {
      q: "Which port mode in VHDL allows a signal to be both read and driven by the entity?",
      opts: ["(A) IN", "(B) OUT", "(C) BUFFER", "(D) INOUT"],
      ans: "(D) INOUT — it allows bidirectional data flow"
    }
  },
  tips: [
    "Common mistake: Writing 'end AND_Gate' when the architecture name is 'Behavioral'. Always match: 'end Behavioral' or 'end architecture Behavioral'.",
    "The declarative region (between 'is' and 'begin') can only have declarations — no logic statements here!",
    "std_logic_1164 is the most important package. Always include it unless your design uses only BIT type.",
    "BUFFER mode is rarely used in practice — prefer INOUT or use an internal signal instead."
  ]
},

{
  day: 3, weekColor: COLORS.week1,
  title: "VHDL Data Types Explained: STD_LOGIC, STD_LOGIC_VECTOR, INTEGER and More",
  seoKeyword: "VHDL data types STD_LOGIC STD_LOGIC_VECTOR",
  overview: "Data types are the building blocks of VHDL. Choosing the wrong type causes synthesis errors or mismatched bus widths — a very common issue for beginners. This article explains every data type you will use in real designs.",
  theory: [
    "BIT type: values '0' and '1' only — simple but limited, not synthesizable on all tools",
    "STD_LOGIC: 9-valued logic system including 'U','X','0','1','Z','W','L','H','-' and why it matters",
    "STD_LOGIC_VECTOR: one-dimensional array — downto vs to direction, indexing",
    "INTEGER and NATURAL types: usage in loops and arithmetic, range specification",
    "BOOLEAN type: TRUE/FALSE — used in conditions, not ports",
    "User-defined types with TYPE keyword: enumeration types for FSM states",
    "Type conversion functions: to_integer(), to_unsigned(), std_logic_vector()"
  ],
  keyDefs: ["STD_LOGIC", "STD_LOGIC_VECTOR", "DOWNTO", "INTEGER", "Enumeration Type", "Type Conversion", "NUMERIC_STD"],
  analogy: "Analogy: STD_LOGIC is like a real-world wire that can be 0V, 5V, high-impedance (floating), or unknown during power-up — much more realistic than a simple 0/1 BIT.",
  codeTitle: "4-bit Bus Demonstrator using STD_LOGIC_VECTOR",
  codeStyle: "Behavioral",
  testbench: false,
  code: [
    "-- Day 3: VHDL Data Types Demo",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;  -- For arithmetic operations",
    "",
    "entity DataTypes_Demo is",
    "    Port (",
    "        -- 4-bit input bus (bits 3 down to 0)",
    "        DataIn  : in  STD_LOGIC_VECTOR(3 downto 0);",
    "        -- Single bit control",
    "        Enable  : in  STD_LOGIC;",
    "        -- 4-bit output bus",
    "        DataOut : out STD_LOGIC_VECTOR(3 downto 0);",
    "        -- Integer output (synthesis-friendly range)",
    "        Count   : out INTEGER range 0 to 15",
    "    );",
    "end DataTypes_Demo;",
    "",
    "architecture Behavioral of DataTypes_Demo is",
    "begin",
    "    -- Conditional concurrent signal assignment",
    "    DataOut <= DataIn when Enable = '1' else (others => '0');",
    "",
    "    -- Convert STD_LOGIC_VECTOR to INTEGER",
    "    Count <= to_integer(unsigned(DataIn));",
    "end Behavioral;",
  ],
  simOutput: "When Enable='1', DataOut mirrors DataIn exactly. When Enable='0', DataOut becomes '0000'. Count shows the integer value 0-15 corresponding to the binary input.",
  questions: {
    conceptual: "What is the difference between STD_LOGIC_VECTOR(7 downto 0) and STD_LOGIC_VECTOR(0 to 7)? Does it affect the value or just the bit ordering?",
    coding: "Declare a 8-bit STD_LOGIC_VECTOR signal named 'data_bus'. Write a concurrent statement that sets bit 3 of data_bus to '1' and all other bits to '0'.",
    mcq: {
      q: "What does 'others => 0' mean in VHDL when used with STD_LOGIC_VECTOR?",
      opts: ["(A) Sets bit index 0 to zero", "(B) Sets all unspecified bits to '0'", "(C) Creates an integer with value 0", "(D) Syntax error"],
      ans: "(B) — 'others' is an aggregate assignment that fills all remaining positions"
    }
  },
  tips: [
    "Never mix STD_LOGIC_VECTOR and INTEGER directly — you must use conversion functions from NUMERIC_STD.",
    "STD_LOGIC_VECTOR(3 downto 0) means bit 3 is the MSB (Most Significant Bit). This is the standard convention.",
    "The 'Z' value in STD_LOGIC represents high impedance — essential for tri-state bus designs.",
    "Avoid using BIT type in industry code — always use STD_LOGIC for compatibility with synthesis tools."
  ]
},

{
  day: 4, weekColor: COLORS.week1,
  title: "VHDL Operators Complete Guide: Logical, Relational, Arithmetic and Shift",
  seoKeyword: "VHDL operators logical relational arithmetic",
  overview: "Operators in VHDL directly correspond to hardware gates and arithmetic units. Understanding operator precedence and type restrictions prevents a class of common synthesis errors. This article provides a complete operator reference for GATE preparation.",
  theory: [
    "Logical operators: AND, OR, NOT, NAND, NOR, XOR, XNOR — and their hardware equivalents",
    "Relational operators: =, /=, <, <=, >, >= — return BOOLEAN, used in conditions",
    "Arithmetic operators: +, -, *, / — require NUMERIC_STD for STD_LOGIC_VECTOR",
    "Shift operators: SLL, SRL, SLA, SRA, ROL, ROR — logical vs arithmetic shifts",
    "Concatenation operator &: combining STD_LOGIC_VECTOR signals",
    "Operator precedence in VHDL — why parentheses are critical",
    "Type restrictions: you cannot use '+' on STD_LOGIC_VECTOR without a package"
  ],
  keyDefs: ["Logical Operator", "Relational Operator", "Concatenation Operator &", "SLL/SRL", "Operator Precedence", "UNSIGNED/SIGNED"],
  analogy: "Analogy: The '&' concatenation operator is like joining two electrical buses together end-to-end. If you have a 4-bit bus [3:0] and another 4-bit bus [3:0], concatenating them gives you an 8-bit bus [7:0].",
  codeTitle: "Operator Showcase — ALU-like structure demonstrating all operator types",
  codeStyle: "Behavioral",
  testbench: false,
  code: [
    "-- Day 4: VHDL Operators Demonstration",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity Operators_Demo is",
    "    Port (",
    "        A, B    : in  STD_LOGIC_VECTOR(3 downto 0);",
    "        Sel     : in  STD_LOGIC_VECTOR(2 downto 0);",
    "        Result  : out STD_LOGIC_VECTOR(3 downto 0);",
    "        EqFlag  : out STD_LOGIC",
    "    );",
    "end Operators_Demo;",
    "",
    "architecture Behavioral of Operators_Demo is",
    "begin",
    "    -- Equality check (Relational) returns BOOLEAN -> convert to STD_LOGIC",
    "    EqFlag <= '1' when (A = B) else '0';",
    "",
    "    -- Operator selector",
    "    with Sel select",
    "        Result <=",
    "            A AND B                            when \"000\",  -- Logical AND",
    "            A OR  B                            when \"001\",  -- Logical OR",
    "            A XOR B                            when \"010\",  -- Logical XOR",
    "            NOT A                              when \"011\",  -- Logical NOT",
    "            STD_LOGIC_VECTOR(UNSIGNED(A) + UNSIGNED(B)) when \"100\",  -- Add",
    "            STD_LOGIC_VECTOR(SHIFT_LEFT(UNSIGNED(A),1)) when \"101\",  -- SLL by 1",
    "            A(2 downto 0) & '0'                when \"110\",  -- Concatenation shift",
    "            (others => '0')                    when others;",
    "end Behavioral;",
  ],
  simOutput: "With Sel=000: Result is bitwise AND of A and B. With Sel=100: Result is sum (wraps at 4 bits). With Sel=101: A is shifted left by 1 bit, LSB becomes 0. EqFlag is '1' only when A equals B.",
  questions: {
    conceptual: "Explain why the expression A + B where A and B are STD_LOGIC_VECTOR causes a compilation error without the NUMERIC_STD package.",
    coding: "Write a concurrent statement that produces an 8-bit result by concatenating a 4-bit signal 'High_Nibble' with a 4-bit signal 'Low_Nibble'.",
    mcq: {
      q: "What is the result of '1010' SRL 2 in VHDL?",
      opts: ["(A) '1110'", "(B) '0010'", "(C) '0000'", "(D) '1111'"],
      ans: "(B) '0010' — SRL (Shift Right Logical) inserts zeros from the left; 1010 shifted right by 2 = 0010"
    }
  },
  tips: [
    "The <= operator is used for signal assignment AND as 'less than or equal' in comparisons. Context determines meaning — inside 'when' conditions it is comparison.",
    "NOT has the highest precedence. AND, OR, NAND, NOR, XOR, XNOR all have EQUAL precedence — always use parentheses!",
    "You cannot multiply two 4-bit numbers and get a 4-bit result safely — the product needs 8 bits.",
    "SLL on STD_LOGIC_VECTOR fills with '0'. SLA (Shift Left Arithmetic) fills with the sign bit."
  ]
},

{
  day: 5, weekColor: COLORS.week1,
  title: "VHDL Signal vs Variable: The Most Confusing Concept Explained Simply",
  seoKeyword: "VHDL signal vs variable difference",
  overview: "Signal vs Variable is THE most misunderstood concept in VHDL, causing bugs that are incredibly hard to debug. This article clears all confusion with side-by-side code comparisons and timing diagrams.",
  theory: [
    "Signal: hardware wire — assignment takes effect after a delta delay, used in architecture body",
    "Variable: software-like — assignment takes effect immediately, used only inside processes",
    "Delta cycle explained: what happens when multiple signals update in the same simulation time step",
    "Where each can be declared: signals in architecture declarative region, variables in process/subprogram",
    "When to use which: counters and registers need variables; bus connections need signals",
    "The 'last assignment wins' rule for variables vs signal scheduling for signals",
    "Shared variables (advanced mention) — avoid in RTL design"
  ],
  keyDefs: ["Signal", "Variable", "Delta Delay", "Process Statement", "Assignment Operator (:= vs <=)"],
  analogy: "Analogy: A SIGNAL is like a memo you leave on someone's desk — they read it on the next clock cycle. A VARIABLE is like shouting across the room — they hear it immediately and react right away.",
  codeTitle: "Signal vs Variable Comparison — showing the timing difference in a process",
  codeStyle: "Behavioral",
  testbench: false,
  code: [
    "-- Day 5: Signal vs Variable Comparison",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "entity Sig_Var_Demo is",
    "    Port (",
    "        clk : in  STD_LOGIC;",
    "        D   : in  STD_LOGIC;",
    "        Q1  : out STD_LOGIC;  -- Uses signal internally",
    "        Q2  : out STD_LOGIC   -- Uses variable internally",
    "    );",
    "end Sig_Var_Demo;",
    "",
    "architecture Behavioral of Sig_Var_Demo is",
    "    signal sig_temp : STD_LOGIC := '0';  -- Signal declaration",
    "begin",
    "",
    "    -- Process using SIGNAL: sig_temp gets D after delta delay",
    "    process(clk)",
    "    begin",
    "        if rising_edge(clk) then",
    "            sig_temp <= D;         -- Scheduled (takes effect next delta)",
    "            Q1       <= sig_temp;  -- Reads OLD value of sig_temp!",
    "        end if;",
    "    end process;",
    "",
    "    -- Process using VARIABLE: var_temp updates immediately",
    "    process(clk)",
    "        variable var_temp : STD_LOGIC := '0';  -- Variable declaration",
    "    begin",
    "        if rising_edge(clk) then",
    "            var_temp := D;         -- Immediate assignment",
    "            Q2       <= var_temp;  -- Reads NEW value of var_temp!",
    "        end if;",
    "    end process;",
    "",
    "end Behavioral;",
  ],
  simOutput: "Q1 shows D delayed by 2 clock cycles (sig_temp acts as pipeline register). Q2 shows D delayed by only 1 clock cycle. This key difference demonstrates why signal-based updates create natural pipeline stages.",
  questions: {
    conceptual: "If a signal is assigned three times in the same process (before the next clock edge), which assignment value takes effect, and why?",
    coding: "Rewrite the following buggy code using a variable to make it work as intended — a 2-input AND gate inside a process: 'sig1 <= A AND B; Y <= sig1;'",
    mcq: {
      q: "Inside a VHDL process, which assignment operator is used for variables?",
      opts: ["(A) <=", "(B) =>", "(C) :=", "(D) =="],
      ans: "(C) := is the variable assignment operator; <= is used for signals"
    }
  },
  tips: [
    "The single most common VHDL bug: expecting a signal assigned inside a process to have its new value immediately in the same process. It does NOT — it updates after the process completes.",
    "Think of signals as 'hardware wires' and variables as 'scratchpad memory'. Wires take time to settle; scratchpads update instantly.",
    "Variables cannot be used as port connections. Only signals can be connected to entity ports.",
    "Use variables for loop accumulators, intermediate calculations. Use signals for anything that represents a physical hardware net."
  ]
},

{
  day: 6, weekColor: COLORS.week1,
  title: "VHDL Concurrent Statements: When, With-Select, and Conditional Assignments",
  seoKeyword: "VHDL concurrent statements when with select",
  overview: "VHDL architecture bodies are concurrent — all statements execute simultaneously, just like real hardware. This article covers the three most important concurrent statement types that form the basis of combinational logic design.",
  theory: [
    "Concurrent signal assignment (<= operator outside a process) — the simplest form",
    "Conditional signal assignment (WHEN...ELSE) — like a hardware multiplexer chain",
    "Selected signal assignment (WITH...SELECT) — like a hardware decoder/mux",
    "Difference between WHEN/ELSE and WITH/SELECT: coverage rules and priority",
    "GENERATE statement: replicating hardware structures (brief introduction)",
    "Why concurrent statements cannot contain IF or CASE — those belong in processes",
    "How simulators evaluate concurrent statements: event-driven simulation model"
  ],
  keyDefs: ["Concurrent Statement", "Conditional Assignment", "Selected Assignment", "Event-Driven Simulation", "GENERATE"],
  analogy: "Analogy: Concurrent statements are like all the gates in a circuit board — they all 'run' simultaneously. There is no sequence, just like electricity does not wait for one gate to finish before the next one starts.",
  codeTitle: "4-to-1 Multiplexer using all three concurrent statement styles",
  codeStyle: "Dataflow",
  testbench: false,
  code: [
    "-- Day 6: Three styles of concurrent statements",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "entity MUX4_Demo is",
    "    Port (",
    "        I0, I1, I2, I3 : in  STD_LOGIC;",
    "        Sel             : in  STD_LOGIC_VECTOR(1 downto 0);",
    "        Y1, Y2, Y3      : out STD_LOGIC",
    "    );",
    "end MUX4_Demo;",
    "",
    "architecture Dataflow of MUX4_Demo is",
    "begin",
    "",
    "    -- Style 1: Simple concurrent assignment",
    "    -- (Works only for direct/simple expressions)",
    "",
    "    -- Style 2: WHEN...ELSE (priority encoder style)",
    "    Y1 <= I0 when Sel = \"00\" else",
    "          I1 when Sel = \"01\" else",
    "          I2 when Sel = \"10\" else",
    "          I3;",
    "",
    "    -- Style 3: WITH...SELECT (clean decoder style, all cases explicit)",
    "    with Sel select",
    "        Y2 <= I0 when \"00\",",
    "              I1 when \"01\",",
    "              I2 when \"10\",",
    "              I3 when others;",
    "",
    "    -- Style 3 variant: must cover ALL cases with 'when others'",
    "    with Sel select",
    "        Y3 <= I0 when \"00\",",
    "              I1 when \"01\",",
    "              I2 when \"10\",",
    "              I3 when \"11\",",
    "              '0' when others;  -- for 'X','U','Z' states in simulation",
    "",
    "end Dataflow;",
  ],
  simOutput: "Y1, Y2, and Y3 all produce identical outputs: they select I0 when Sel=00, I1 when Sel=01, I2 when Sel=10, and I3 when Sel=11. All three styles synthesize to the same hardware.",
  questions: {
    conceptual: "Can a WHEN...ELSE statement appear inside a VHDL process statement? Why or why not?",
    coding: "Write a WITH...SELECT statement for an 8-to-1 multiplexer with select signal S(2:0) and inputs D0 through D7.",
    mcq: {
      q: "In a WHEN...ELSE concurrent statement, which condition has highest priority?",
      opts: ["(A) The last condition", "(B) The 'else' clause", "(C) The first condition", "(D) All conditions have equal priority"],
      ans: "(C) The first WHEN condition has highest priority — this is unlike WITH...SELECT which has no priority"
    }
  },
  tips: [
    "WITH...SELECT requires all possible input combinations to be covered. Always add 'when others' to handle meta-values like 'X' and 'U'.",
    "WHEN...ELSE can create priority encoders (first match wins). WITH...SELECT creates pure decoders (no priority).",
    "Forgetting 'when others' in WITH...SELECT is a synthesis error on most tools.",
    "For simple boolean expressions, a plain concurrent assignment is cleaner than WHEN...ELSE."
  ]
},

{
  day: 7, weekColor: COLORS.week1,
  title: "VHDL Process Statement and Sequential Logic: The PROCESS Keyword Demystified",
  seoKeyword: "VHDL process statement sequential logic",
  overview: "The PROCESS statement is where VHDL gets powerful — and where most beginners get confused. Processes contain sequential statements (IF, CASE, LOOP) and are used to model both combinational and sequential circuits. This article closes Week 1 with a solid foundation.",
  theory: [
    "Process syntax: sensitivity list, declarative region, sequential statements region",
    "Sensitivity list: what it means, which signals should be in it",
    "IF...THEN...ELSIF...ELSE: VHDL's conditional structure inside processes",
    "CASE statement: clean multi-way selection, must cover all cases",
    "FOR LOOP and WHILE LOOP inside processes",
    "How a process models combinational logic (all inputs in sensitivity list)",
    "How a process models sequential logic (clock and reset in sensitivity list)"
  ],
  keyDefs: ["Process", "Sensitivity List", "IF Statement", "CASE Statement", "FOR Loop", "Rising_Edge()"],
  analogy: "Analogy: A process with a clock in its sensitivity list is like a worker who only wakes up when a bell rings (clock edge), checks their inbox (inputs), and updates their notebook (registers) accordingly.",
  codeTitle: "Combinational logic (IF/CASE) and D Flip-Flop in a single file",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 7: PROCESS Statement Examples",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "entity Process_Demo is",
    "    Port (",
    "        clk   : in  STD_LOGIC;",
    "        rst   : in  STD_LOGIC;",
    "        D     : in  STD_LOGIC;",
    "        A, B  : in  STD_LOGIC;",
    "        Q     : out STD_LOGIC;",
    "        Comb  : out STD_LOGIC",
    "    );",
    "end Process_Demo;",
    "",
    "architecture Behavioral of Process_Demo is",
    "begin",
    "",
    "    -- Process 1: Combinational logic (all inputs in sensitivity list)",
    "    process(A, B)",
    "    begin",
    "        if (A = '1' AND B = '1') then",
    "            Comb <= '1';",
    "        elsif (A = '1' OR B = '1') then",
    "            Comb <= '0';  -- This creates a priority encoder behaviour",
    "        else",
    "            Comb <= '0';",
    "        end if;",
    "    end process;",
    "",
    "    -- Process 2: Sequential logic — D Flip-Flop with sync reset",
    "    process(clk)",
    "    begin",
    "        if rising_edge(clk) then  -- Triggered on positive clock edge",
    "            if (rst = '1') then",
    "                Q <= '0';         -- Synchronous reset",
    "            else",
    "                Q <= D;           -- Capture D on clock edge",
    "            end if;",
    "        end if;",
    "    end process;",
    "",
    "end Behavioral;",
    "",
    "-- ===== TESTBENCH =====",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "entity Process_Demo_TB is",
    "end Process_Demo_TB;",
    "",
    "architecture Simulation of Process_Demo_TB is",
    "    component Process_Demo",
    "        Port(clk,rst,D,A,B: in STD_LOGIC; Q,Comb: out STD_LOGIC);",
    "    end component;",
    "    signal clk,rst,D,A,B,Q,Comb : STD_LOGIC := '0';",
    "begin",
    "    UUT: Process_Demo port map(clk,rst,D,A,B,Q,Comb);",
    "    clk <= not clk after 10 ns;  -- 50MHz clock",
    "    process begin",
    "        rst<='1'; D<='0'; A<='0'; B<='0'; wait for 25 ns;",
    "        rst<='0'; D<='1';                  wait for 20 ns;",
    "        D<='0'; A<='1'; B<='1';           wait for 20 ns;",
    "        D<='1'; A<='1'; B<='0';           wait for 20 ns;",
    "        wait;",
    "    end process;",
    "end Simulation;",
  ],
  simOutput: "Q is held at '0' during reset, then captures D on each rising clock edge. Comb shows '1' only when both A and B are '1'. Testbench waveform shows two distinct behaviours from two separate processes running concurrently.",
  questions: {
    conceptual: "What happens if you accidentally leave a signal out of the sensitivity list of a combinational process? Will it simulate correctly? Will it synthesize correctly?",
    coding: "Write a VHDL process that implements a 3-bit priority encoder: output Y='111' if in7='1', Y='110' if in6='1' (and in7='0'), and so on down to Y='000'.",
    mcq: {
      q: "A VHDL process with sensitivity list (clk, reset) will execute when:",
      opts: ["(A) Only when clk changes", "(B) Only when reset changes", "(C) When either clk OR reset changes", "(D) Every simulation time step"],
      ans: "(C) A process executes whenever ANY signal in its sensitivity list changes"
    }
  },
  tips: [
    "If you use IF/CASE but don't cover all conditions, VHDL infers latches. Always have an ELSE clause in combinational processes.",
    "For D flip-flops, only put 'clk' in the sensitivity list (not 'D' or 'rst' for synchronous reset). Adding extra signals creates simulation mismatches.",
    "CASE statement in VHDL requires all cases to be covered — use 'when others' for safety.",
    "rising_edge(clk) is cleaner and more portable than 'clk'event and clk='1'. Use rising_edge() always."
  ]
},

// ═══════════════════ WEEK 2 ═══════════════════
{
  day: 8, weekColor: COLORS.week2,
  title: "VHDL Modeling Styles: Behavioral, Dataflow, and Structural with Examples",
  seoKeyword: "VHDL modeling styles behavioral dataflow structural",
  overview: "VHDL offers three distinct modeling styles, each serving a different design level. Understanding all three is essential for GATE, interviews, and building complex hierarchical designs. This article shows the same circuit — a half adder — modeled three ways.",
  theory: [
    "Behavioral modeling: describes WHAT the circuit does (using processes, if/case)",
    "Dataflow modeling: describes HOW data flows (using concurrent signal assignments)",
    "Structural modeling: describes the PHYSICAL structure (component instantiation)",
    "When to choose which style: behavioral for complex logic, structural for hierarchy",
    "Mixed modeling: combining all three styles in one architecture",
    "Component declaration syntax and PORT MAP association",
    "Named vs positional port mapping: best practices"
  ],
  keyDefs: ["Behavioral Model", "Dataflow Model", "Structural Model", "Component", "PORT MAP", "Named Association", "Positional Association"],
  analogy: "Analogy: Behavioral = describing a calculator by its function ('adds two numbers'). Dataflow = describing it by its equation (Sum = A XOR B). Structural = describing it by its internal gates (an XOR gate and an AND gate connected together).",
  codeTitle: "Half Adder — all three modeling styles in one file",
  codeStyle: "All 3",
  testbench: true,
  code: [
    "-- Day 8: Half Adder -- All Three Modeling Styles",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "-- ── Style 1: DATAFLOW ──────────────────────────────────────────",
    "entity HalfAdder_Dataflow is",
    "    Port ( A, B : in STD_LOGIC; Sum, Carry : out STD_LOGIC );",
    "end HalfAdder_Dataflow;",
    "",
    "architecture Dataflow of HalfAdder_Dataflow is",
    "begin",
    "    Sum   <= A XOR B;",
    "    Carry <= A AND B;",
    "end Dataflow;",
    "",
    "-- ── Style 2: BEHAVIORAL ────────────────────────────────────────",
    "entity HalfAdder_Behavioral is",
    "    Port ( A, B : in STD_LOGIC; Sum, Carry : out STD_LOGIC );",
    "end HalfAdder_Behavioral;",
    "",
    "architecture Behavioral of HalfAdder_Behavioral is",
    "begin",
    "    process(A, B)",
    "    begin",
    "        case (A & B) is",
    "            when \"00\" => Sum <= '0'; Carry <= '0';",
    "            when \"01\" => Sum <= '1'; Carry <= '0';",
    "            when \"10\" => Sum <= '1'; Carry <= '0';",
    "            when \"11\" => Sum <= '0'; Carry <= '1';",
    "            when others => Sum <= 'X'; Carry <= 'X';",
    "        end case;",
    "    end process;",
    "end Behavioral;",
    "",
    "-- ── Style 3: STRUCTURAL (uses Dataflow HA as components) ──────",
    "entity HalfAdder_Structural is",
    "    Port ( A, B : in STD_LOGIC; Sum, Carry : out STD_LOGIC );",
    "end HalfAdder_Structural;",
    "",
    "architecture Structural of HalfAdder_Structural is",
    "    -- Component declarations",
    "    component XOR_Gate is",
    "        Port ( A, B : in STD_LOGIC; Y : out STD_LOGIC );",
    "    end component;",
    "    component AND_Gate is",
    "        Port ( A, B : in STD_LOGIC; Y : out STD_LOGIC );",
    "    end component;",
    "begin",
    "    -- Component instantiation (named association)",
    "    XOR1: XOR_Gate port map (A => A, B => B, Y => Sum);",
    "    AND1: AND_Gate port map (A => A, B => B, Y => Carry);",
    "end Structural;",
  ],
  simOutput: "All three versions produce identical outputs: Sum = A XOR B (1 when inputs differ, 0 when same), Carry = A AND B (1 only when both inputs are 1). Truth table: 00->00, 01->10, 10->10, 11->01 (Carry,Sum).",
  questions: {
    conceptual: "In structural modeling, what is the difference between a 'component declaration' and a 'component instantiation'? Can you have declaration without instantiation?",
    coding: "Write a structural VHDL architecture for a Full Adder using two Half Adder components and one OR gate component.",
    mcq: {
      q: "Which VHDL modeling style directly corresponds to a gate-level netlist?",
      opts: ["(A) Behavioral", "(B) Dataflow", "(C) Structural", "(D) RTL"],
      ans: "(C) Structural modeling mirrors a gate-level netlist through component instantiation"
    }
  },
  tips: [
    "In structural modeling, the component name must exactly match the entity name of the lower-level module.",
    "Always use named port mapping ('=>') rather than positional. If ports are reordered later, positional mapping silently breaks.",
    "Synthesis tools can handle all three styles — the synthesized hardware is identical for correctly equivalent descriptions.",
    "For your college assignments, behavioral style is fastest to write. For FPGA optimization, structural gives more control."
  ]
},

{
  day: 9, weekColor: COLORS.week2,
  title: "VHDL Full Adder Design: From Truth Table to Working VHDL Code",
  seoKeyword: "full adder VHDL code with testbench",
  overview: "The Full Adder is the fundamental building block of every ALU and arithmetic circuit. Building it from scratch in VHDL — all three styles with a complete testbench — solidifies both VHDL skills and digital design fundamentals.",
  theory: [
    "Full adder truth table: three inputs (A, B, Cin), two outputs (Sum, Cout)",
    "Boolean equations: Sum = A XOR B XOR Cin; Carry = (A AND B) OR (B AND Cin) OR (A AND Cin)",
    "Building a full adder from two half adders and an OR gate (structural hierarchy)",
    "Testbench design: how to write a self-checking testbench",
    "Port mapping a 4-bit ripple carry adder using generate statement",
    "VHDL GENERATE statement for replicating instances",
    "Propagation delay in adder chains: why ripple-carry is slow"
  ],
  keyDefs: ["Full Adder", "Carry Propagation", "Ripple Carry Adder", "Testbench", "GENERATE Statement", "Self-Checking Testbench"],
  analogy: "Analogy: A ripple carry adder is like a chain of people passing a baton — each person (full adder) must wait for the previous person to hand over the carry-out before they can complete their addition.",
  codeTitle: "Full Adder — Behavioral + Structural 4-bit Ripple Carry Adder with Testbench",
  codeStyle: "Behavioral + Structural",
  testbench: true,
  code: [
    "-- Day 9: Full Adder + 4-bit Ripple Carry Adder",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "-- ── Full Adder Entity ──────────────────────────────────────────",
    "entity FullAdder is",
    "    Port (",
    "        A, B, Cin  : in  STD_LOGIC;",
    "        Sum, Cout  : out STD_LOGIC",
    "    );",
    "end FullAdder;",
    "",
    "architecture Behavioral of FullAdder is",
    "begin",
    "    Sum  <= A XOR B XOR Cin;",
    "    Cout <= (A AND B) OR (B AND Cin) OR (A AND Cin);",
    "end Behavioral;",
    "",
    "-- ── 4-bit Ripple Carry Adder using GENERATE ───────────────────",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "entity RippleAdder_4bit is",
    "    Port (",
    "        A, B  : in  STD_LOGIC_VECTOR(3 downto 0);",
    "        Cin   : in  STD_LOGIC;",
    "        Sum   : out STD_LOGIC_VECTOR(3 downto 0);",
    "        Cout  : out STD_LOGIC",
    "    );",
    "end RippleAdder_4bit;",
    "",
    "architecture Structural of RippleAdder_4bit is",
    "    component FullAdder",
    "        Port(A,B,Cin: in STD_LOGIC; Sum,Cout: out STD_LOGIC);",
    "    end component;",
    "    signal carry : STD_LOGIC_VECTOR(4 downto 0);",
    "begin",
    "    carry(0) <= Cin;",
    "    GEN: for i in 0 to 3 generate",
    "        FA: FullAdder port map(",
    "            A    => A(i),",
    "            B    => B(i),",
    "            Cin  => carry(i),",
    "            Sum  => Sum(i),",
    "            Cout => carry(i+1)",
    "        );",
    "    end generate;",
    "    Cout <= carry(4);",
    "end Structural;",
  ],
  simOutput: "With A=0101 (5), B=0011 (3), Cin=0: Sum=1000 (8), Cout=0. With A=1111 (15), B=0001 (1), Cin=0: Sum=0000 (0), Cout=1 (overflow). Generate statement instantiates 4 full adders connected in ripple-carry chain.",
  questions: {
    conceptual: "A 4-bit ripple carry adder has a worst-case delay of 4× the single full adder delay. Explain where this delay comes from.",
    coding: "Extend the 4-bit ripple carry adder to a 8-bit adder using the same GENERATE statement approach.",
    mcq: {
      q: "In a Full Adder, the Cout output is '1' for how many input combinations out of 8?",
      opts: ["(A) 2", "(B) 3", "(C) 4", "(D) 5"],
      ans: "(C) 4 — Cout=1 for: 011, 101, 110, 111"
    }
  },
  tips: [
    "The GENERATE statement index variable (i in the example) is not a signal or variable — do not assign to it.",
    "In the carry chain: carry(0) is the external Cin, carry(4) is the external Cout. Index carefully.",
    "A self-checking testbench uses ASSERT statements — if the expected output doesn't match, the simulation reports an error automatically.",
    "Test corner cases: all zeros, all ones, maximum + 1 (overflow condition) — these catch most bugs."
  ]
},

{
  day: 10, weekColor: COLORS.week2,
  title: "VHDL Multiplexer Design: 2-to-1, 4-to-1 and 8-to-1 MUX Implementation",
  seoKeyword: "multiplexer VHDL code 4 to 1 MUX",
  overview: "Multiplexers are everywhere in digital design — from data buses to ALU input selection. This article builds MUX designs in VHDL using multiple approaches, showing how larger MUXes are built from smaller ones.",
  theory: [
    "Multiplexer concept: selecting one of N inputs based on select lines",
    "2-to-1 MUX: 1 select line, equation Y = (A AND NOT S) OR (B AND S)",
    "4-to-1 MUX: 2 select lines, 4 data inputs — truth table and implementation",
    "8-to-1 MUX from 4-to-1 MUX: hierarchical design",
    "MUX as a universal logic gate: implementing any boolean function with a MUX",
    "Tri-state buffers and when to use them vs MUX",
    "Applications: data routing, bus arbitration, function selection in ALUs"
  ],
  keyDefs: ["Multiplexer", "Select Line", "Data Input", "Tri-state", "Universal Logic Gate", "Hierarchical Design"],
  analogy: "Analogy: A multiplexer is like a railway junction switch — it has multiple incoming tracks (data inputs) and routes exactly one of them to the main track (output), based on which direction the switch is set (select lines).",
  codeTitle: "2-to-1 and 4-to-1 MUX — Dataflow, Behavioral, and Hierarchical Structural",
  codeStyle: "All 3",
  testbench: true,
  code: [
    "-- Day 10: Multiplexer Designs",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "-- ── 2-to-1 MUX ────────────────────────────────────────────────",
    "entity MUX2to1 is",
    "    Port ( I0, I1, S : in STD_LOGIC; Y : out STD_LOGIC );",
    "end MUX2to1;",
    "",
    "architecture Dataflow of MUX2to1 is",
    "begin",
    "    Y <= I0 when S = '0' else I1;",
    "end Dataflow;",
    "",
    "-- ── 4-to-1 MUX (Behavioral CASE) ─────────────────────────────",
    "entity MUX4to1 is",
    "    Port (",
    "        I0,I1,I2,I3 : in  STD_LOGIC;",
    "        S            : in  STD_LOGIC_VECTOR(1 downto 0);",
    "        Y            : out STD_LOGIC",
    "    );",
    "end MUX4to1;",
    "",
    "architecture Behavioral of MUX4to1 is",
    "begin",
    "    process(I0, I1, I2, I3, S)",
    "    begin",
    "        case S is",
    "            when \"00\"   => Y <= I0;",
    "            when \"01\"   => Y <= I1;",
    "            when \"10\"   => Y <= I2;",
    "            when \"11\"   => Y <= I3;",
    "            when others => Y <= 'X';",
    "        end case;",
    "    end process;",
    "end Behavioral;",
    "",
    "-- ── 8-to-1 MUX using two 4-to-1 MUX + one 2-to-1 MUX ────────",
    "entity MUX8to1 is",
    "    Port (",
    "        I : in  STD_LOGIC_VECTOR(7 downto 0);",
    "        S : in  STD_LOGIC_VECTOR(2 downto 0);",
    "        Y : out STD_LOGIC",
    "    );",
    "end MUX8to1;",
    "",
    "architecture Structural of MUX8to1 is",
    "    component MUX4to1",
    "        Port(I0,I1,I2,I3:in STD_LOGIC; S:in STD_LOGIC_VECTOR(1 downto 0); Y:out STD_LOGIC);",
    "    end component;",
    "    component MUX2to1",
    "        Port(I0,I1,S:in STD_LOGIC; Y:out STD_LOGIC);",
    "    end component;",
    "    signal M1_out, M2_out : STD_LOGIC;",
    "begin",
    "    MUX_LOW:  MUX4to1 port map(I(0),I(1),I(2),I(3),S(1 downto 0),M1_out);",
    "    MUX_HIGH: MUX4to1 port map(I(4),I(5),I(6),I(7),S(1 downto 0),M2_out);",
    "    MUX_FINAL: MUX2to1 port map(M1_out, M2_out, S(2), Y);",
    "end Structural;",
  ],
  simOutput: "4-to-1 MUX: S=00 routes I0 to Y, S=01 routes I1, S=10 routes I2, S=11 routes I3. 8-to-1 MUX: the upper bit S(2) selects between the lower group (I0-I3) and upper group (I4-I7), while S(1:0) selects within each group.",
  questions: {
    conceptual: "How many select lines does a 16-to-1 multiplexer require? Explain using the formula.",
    coding: "Implement a 4-to-1 MUX with 4-bit wide data buses (each input is STD_LOGIC_VECTOR(3 downto 0)) using behavioral modeling.",
    mcq: {
      q: "A 32-to-1 multiplexer can be implemented using how many 4-to-1 multiplexers?",
      opts: ["(A) 6", "(B) 8", "(C) 9", "(D) 11"],
      ans: "(D) 11 — 8 four-to-1 MUXes select among 32 inputs to give 8 outputs, then 2 more give 2 outputs, and finally 1 more selects the final output: 8+2+1=11"
    }
  },
  tips: [
    "When using positional port mapping, you must match the ORDER of ports in the component declaration exactly. A mistake here is silent but causes wrong behaviour.",
    "A 4-to-1 MUX with a CASE statement must have a 'when others' clause — simulation values like 'X' are not covered by \"00\" to \"11\".",
    "For wide data buses, a MUX implemented with a CASE statement synthesizes more efficiently than a chain of WHEN/ELSE.",
    "MUX with STD_LOGIC_VECTOR inputs: use the vector select with the individual input buses for bus-width multiplexing."
  ]
},

{
  day: 11, weekColor: COLORS.week2,
  title: "VHDL Decoder and Encoder Design: 2-to-4, 3-to-8 Decoder with Enable",
  seoKeyword: "decoder encoder VHDL code 3 to 8",
  overview: "Decoders and encoders are essential for memory addressing, display drivers, and interrupt controllers. This article covers complete decoder/encoder designs including enable pins and priority encoders.",
  theory: [
    "Decoder: converts n-bit binary input to one of 2^n outputs (exactly one output active)",
    "2-to-4 decoder truth table and Boolean equations",
    "3-to-8 decoder: 8 outputs, active-high and active-low configurations",
    "Enable pin: when EN=0, all outputs are disabled (0 for active-high)",
    "Cascading decoders: 4-to-16 using two 3-to-8 decoders",
    "Encoder: opposite of decoder — 2^n inputs to n-bit binary output",
    "Priority encoder: if multiple inputs active, highest-priority input wins"
  ],
  keyDefs: ["Decoder", "Encoder", "Priority Encoder", "Enable Input", "Active-High", "Active-Low", "Cascading"],
  analogy: "Analogy: A decoder is like a post office sorting machine — you input a PIN code (binary address) and exactly one mailbox slot (output line) opens. An encoder is like the person at the counter who converts your name into a mailbox number.",
  codeTitle: "3-to-8 Decoder with Enable and 4-to-2 Priority Encoder",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 11: Decoder and Priority Encoder",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "-- ── 3-to-8 Decoder with Active-High Enable ───────────────────",
    "entity Decoder3to8 is",
    "    Port (",
    "        A  : in  STD_LOGIC_VECTOR(2 downto 0);",
    "        EN : in  STD_LOGIC;",
    "        Y  : out STD_LOGIC_VECTOR(7 downto 0)",
    "    );",
    "end Decoder3to8;",
    "",
    "architecture Behavioral of Decoder3to8 is",
    "begin",
    "    process(A, EN)",
    "    begin",
    "        Y <= (others => '0');  -- Default: all outputs LOW",
    "        if EN = '1' then",
    "            case A is",
    "                when \"000\" => Y <= \"00000001\";",
    "                when \"001\" => Y <= \"00000010\";",
    "                when \"010\" => Y <= \"00000100\";",
    "                when \"011\" => Y <= \"00001000\";",
    "                when \"100\" => Y <= \"00010000\";",
    "                when \"101\" => Y <= \"00100000\";",
    "                when \"110\" => Y <= \"01000000\";",
    "                when \"111\" => Y <= \"10000000\";",
    "                when others => Y <= (others => 'X');",
    "            end case;",
    "        end if;",
    "    end process;",
    "end Behavioral;",
    "",
    "-- ── 4-to-2 Priority Encoder ────────────────────────────────",
    "entity PriorityEncoder4to2 is",
    "    Port (",
    "        I     : in  STD_LOGIC_VECTOR(3 downto 0);",
    "        Y     : out STD_LOGIC_VECTOR(1 downto 0);",
    "        Valid : out STD_LOGIC   -- '1' when any input is active",
    "    );",
    "end PriorityEncoder4to2;",
    "",
    "architecture Behavioral of PriorityEncoder4to2 is",
    "begin",
    "    process(I)",
    "    begin",
    "        if    I(3) = '1' then Y <= \"11\"; Valid <= '1';",
    "        elsif I(2) = '1' then Y <= \"10\"; Valid <= '1';",
    "        elsif I(1) = '1' then Y <= \"01\"; Valid <= '1';",
    "        elsif I(0) = '1' then Y <= \"00\"; Valid <= '1';",
    "        else                   Y <= \"00\"; Valid <= '0';",
    "        end if;",
    "    end process;",
    "end Behavioral;",
  ],
  simOutput: "Decoder: EN=1, A=101 → Y=00100000 (only bit 5 is high). EN=0 → Y=00000000 regardless of A. Priority Encoder: I=1010 → Y=11 (I(3) wins), I=0110 → Y=10 (I(2) wins), I=0000 → Y=00, Valid=0.",
  questions: {
    conceptual: "A 3-to-8 decoder has one output high at a time. How would you use two 3-to-8 decoders to build a 4-to-16 decoder?",
    coding: "Write a VHDL behavioral description of a BCD-to-7-segment decoder (inputs 0-9, output drives a 7-segment display).",
    mcq: {
      q: "In a priority encoder with inputs I3, I2, I1, I0 (I3 = highest priority), if I = '1111', the output is:",
      opts: ["(A) 00", "(B) 01", "(C) 10", "(D) 11"],
      ans: "(D) 11 — I3 has highest priority; when I3=1, output=11 regardless of other inputs"
    }
  },
  tips: [
    "Always initialize outputs at the top of the process (Y <= others => '0'). If a CASE/IF misses a combination, VHDL would otherwise infer a latch.",
    "Active-low decoder outputs: invert all output assignments and change the default to 'all ones'.",
    "The difference between an encoder and priority encoder: a standard encoder assumes only one input is active; a priority encoder handles multiple simultaneous inputs.",
    "For large decoders (4-to-16 and above), use the WITH...SELECT style — it is cleaner and synthesizes equally well."
  ]
},

{
  day: 12, weekColor: COLORS.week2,
  title: "VHDL Comparator Design: 1-bit, 4-bit Magnitude Comparator with VHDL Code",
  seoKeyword: "magnitude comparator VHDL code 4-bit",
  overview: "Comparators appear in every processor, sorting network, and control unit. This article builds a complete magnitude comparator that outputs three results: A>B, A<B, and A=B.",
  theory: [
    "1-bit comparator: equality (XNOR), greater-than, less-than logic",
    "4-bit magnitude comparator: cascading from 1-bit comparators",
    "Using NUMERIC_STD UNSIGNED type for comparison operations",
    "Cascading inputs: connecting multiple comparator stages",
    "Comparator vs subtractor: why comparison is preferred for hardware efficiency",
    "Applications: ALU flags, sorting networks, bus arbiters, memory controllers",
    "IEEE standard 74HC85 equivalent in VHDL"
  ],
  keyDefs: ["Magnitude Comparator", "Equality Flag", "Greater-Than", "Less-Than", "Cascade Inputs", "UNSIGNED"],
  analogy: "Analogy: A magnitude comparator is like a judge in a competition — given two scores (A and B), it announces three verdicts simultaneously: who won, who lost, and if it was a tie.",
  codeTitle: "4-bit Magnitude Comparator — Dataflow and Behavioral versions",
  codeStyle: "Behavioral + Dataflow",
  testbench: true,
  code: [
    "-- Day 12: 4-bit Magnitude Comparator",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity Comparator4bit is",
    "    Port (",
    "        A, B    : in  STD_LOGIC_VECTOR(3 downto 0);",
    "        A_gt_B  : out STD_LOGIC;  -- A > B",
    "        A_lt_B  : out STD_LOGIC;  -- A < B",
    "        A_eq_B  : out STD_LOGIC   -- A = B",
    "    );",
    "end Comparator4bit;",
    "",
    "-- Style 1: Dataflow using WHEN/ELSE",
    "architecture Dataflow of Comparator4bit is",
    "begin",
    "    A_gt_B <= '1' when UNSIGNED(A) >  UNSIGNED(B) else '0';",
    "    A_lt_B <= '1' when UNSIGNED(A) <  UNSIGNED(B) else '0';",
    "    A_eq_B <= '1' when UNSIGNED(A) =  UNSIGNED(B) else '0';",
    "end Dataflow;",
    "",
    "-- Style 2: Behavioral using IF/ELSIF",
    "architecture Behavioral of Comparator4bit is",
    "begin",
    "    process(A, B)",
    "        variable Ai, Bi : integer;",
    "    begin",
    "        Ai := to_integer(UNSIGNED(A));",
    "        Bi := to_integer(UNSIGNED(B));",
    "        if    Ai > Bi then A_gt_B<='1'; A_lt_B<='0'; A_eq_B<='0';",
    "        elsif Ai < Bi then A_gt_B<='0'; A_lt_B<='1'; A_eq_B<='0';",
    "        else               A_gt_B<='0'; A_lt_B<='0'; A_eq_B<='1';",
    "        end if;",
    "    end process;",
    "end Behavioral;",
  ],
  simOutput: "A=0101 (5), B=0011 (3): A_gt_B='1', A_lt_B='0', A_eq_B='0'. A=0011, B=0011: A_eq_B='1', others '0'. A=0010, B=1000: A_lt_B='1', others '0'. Always exactly one output is '1'.",
  questions: {
    conceptual: "Why is it necessary to use UNSIGNED() conversion before comparing STD_LOGIC_VECTOR values in VHDL? What happens if you compare directly without it?",
    coding: "Modify the 4-bit comparator to work with SIGNED numbers (two's complement), so that -1 (1111) is less than 0 (0000).",
    mcq: {
      q: "A 4-bit comparator comparing two unsigned numbers A and B. For A = 1010 and B = 0111:",
      opts: ["(A) A_gt_B = 0", "(B) A_eq_B = 1", "(C) A_gt_B = 1, A_lt_B = 0", "(D) A_lt_B = 1"],
      ans: "(C) — 1010 = 10 decimal, 0111 = 7 decimal; 10 > 7 so A_gt_B = 1"
    }
  },
  tips: [
    "Without UNSIGNED() or SIGNED() conversion, comparing STD_LOGIC_VECTORs uses character comparison (lexicographic), which can give wrong results.",
    "In the Dataflow style, all three outputs are computed simultaneously — this synthesizes to three separate comparison circuits.",
    "A_gt_B and A_lt_B being '0' simultaneously does NOT mean A=B when using 9-valued STD_LOGIC — the X/U state can cause this. Always check simulation carefully.",
    "For signed comparisons, replace UNSIGNED with SIGNED in the type conversion."
  ]
},

{
  day: 13, weekColor: COLORS.week2,
  title: "VHDL Parity Generator and Checker: Even and Odd Parity Circuit Design",
  seoKeyword: "parity generator checker VHDL code",
  overview: "Parity circuits are fundamental error-detection hardware found in DRAM interfaces, UART communication, and storage systems. This article covers both even and odd parity generation and checking circuits.",
  theory: [
    "Parity concept: single-bit error detection using XOR chains",
    "Even parity: XOR of all bits (including parity bit) = 0",
    "Odd parity: XOR of all bits (including parity bit) = 1",
    "Parity generator vs parity checker: design differences",
    "Limitations: parity cannot detect 2-bit errors or correct errors",
    "Applications: DRAM parity bit, UART framing, cache memory",
    "Extending to Hamming code (introduction): single-error-correcting codes"
  ],
  keyDefs: ["Parity", "Even Parity", "Odd Parity", "XOR Chain", "Error Detection", "Parity Generator", "Parity Checker"],
  analogy: "Analogy: Parity is like the check digit on your UPI/bank account number — one extra bit that lets the receiver know if something was corrupted in transmission.",
  codeTitle: "8-bit Even/Odd Parity Generator and Checker",
  codeStyle: "Dataflow + Behavioral",
  testbench: true,
  code: [
    "-- Day 13: Parity Generator and Checker",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "-- ── 8-bit Parity Generator ─────────────────────────────────────",
    "entity ParityGenerator is",
    "    Port (",
    "        Data       : in  STD_LOGIC_VECTOR(7 downto 0);",
    "        EvenParity : out STD_LOGIC;  -- XOR of all bits",
    "        OddParity  : out STD_LOGIC   -- XNOR of all bits",
    "    );",
    "end ParityGenerator;",
    "",
    "architecture Dataflow of ParityGenerator is",
    "begin",
    "    -- Even parity = XOR reduction of all data bits",
    "    EvenParity <= Data(7) XOR Data(6) XOR Data(5) XOR Data(4)",
    "                      XOR Data(3) XOR Data(2) XOR Data(1) XOR Data(0);",
    "    OddParity  <= NOT EvenParity;  -- Odd = complement of even",
    "end Dataflow;",
    "",
    "-- ── 9-bit Parity Checker (data + parity bit received) ─────────",
    "entity ParityChecker is",
    "    Port (",
    "        RxData  : in  STD_LOGIC_VECTOR(8 downto 0); -- 8 data + 1 parity",
    "        Error   : out STD_LOGIC  -- '1' = error detected",
    "    );",
    "end ParityChecker;",
    "",
    "architecture Behavioral of ParityChecker is",
    "    signal xor_all : STD_LOGIC;",
    "begin",
    "    -- XOR all 9 bits (8 data + 1 parity)",
    "    xor_all <= RxData(8) XOR RxData(7) XOR RxData(6) XOR RxData(5)",
    "                   XOR RxData(4) XOR RxData(3) XOR RxData(2)",
    "                   XOR RxData(1) XOR RxData(0);",
    "    -- For even parity: result should be '0'. If '1', error occurred",
    "    Error <= xor_all;",
    "end Behavioral;",
  ],
  simOutput: "Data=10110101 (5 ones → odd count): EvenParity=1, OddParity=0. Data=11110000 (4 ones → even count): EvenParity=0, OddParity=1. Checker: if received 9-bit word XOR = 0, no error. XOR = 1 means single-bit error detected.",
  questions: {
    conceptual: "A 8-bit data word '11001010' is transmitted with even parity. What is the parity bit value? If bit 3 gets flipped during transmission, what does the checker output?",
    coding: "Write a VHDL architecture for a 4-bit even parity generator using a FOR GENERATE loop (GENERATE the XOR chain automatically instead of writing each XOR manually).",
    mcq: {
      q: "Even parity of data word '10110110' is:",
      opts: ["(A) 0", "(B) 1", "(C) X (undefined)", "(D) Z (high impedance)"],
      ans: "(A) 0 — count of 1s in 10110110 is 5 (odd count), so even parity bit = 1... wait: XOR of bits: 1^0^1^1^0^1^1^0 = 1, so EvenParity bit = 1"
    }
  },
  tips: [
    "There is no dedicated XOR-reduction operator in standard VHDL (unlike Verilog's ^). You must chain XOR operations manually, or use a loop.",
    "Even parity: parity bit makes total number of 1s even. Odd parity: parity bit makes total number of 1s odd.",
    "Parity can only detect an ODD number of bit errors. Two simultaneous errors cancel out and go undetected.",
    "In UART protocols, you choose even or odd parity — both sender and receiver must agree on the type."
  ]
},

{
  day: 14, weekColor: COLORS.week2,
  title: "VHDL Testbench Writing Guide: How to Verify Your Designs Like a Pro",
  seoKeyword: "VHDL testbench writing tutorial",
  overview: "A testbench is a VHDL program that tests your design. Without a good testbench, you cannot verify correctness. This article is a complete guide to writing professional testbenches — from basic stimulus to self-checking assertions.",
  theory: [
    "Testbench architecture: no ports, instantiate Design Under Test (DUT)",
    "Clock generation using concurrent signal assignment with 'not ... after'",
    "Stimulus generation: sequential process with 'wait for' statements",
    "ASSERT statement: automatic pass/fail checking",
    "REPORT and SEVERITY: printing messages in simulation",
    "Testing strategy: equivalence class partitioning, boundary values, corner cases",
    "Reading from files using TEXTIO package (advanced)"
  ],
  keyDefs: ["Testbench", "DUT (Design Under Test)", "ASSERT", "SEVERITY", "Wait Statement", "Clock Generation", "Self-Checking"],
  analogy: "Analogy: A testbench is like a quality inspector on a factory production line — it methodically tests every product (stimulus), measures the output, and raises an alarm (ASSERT) if anything is out of spec.",
  codeTitle: "Complete self-checking testbench for 4-bit Ripple Carry Adder",
  codeStyle: "Testbench only",
  testbench: true,
  code: [
    "-- Day 14: Professional Self-Checking Testbench",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity RippleAdder_TB is",
    "    -- Testbench has NO ports",
    "end RippleAdder_TB;",
    "",
    "architecture Simulation of RippleAdder_TB is",
    "",
    "    -- Component Declaration (DUT)",
    "    component RippleAdder_4bit",
    "        Port( A,B: in STD_LOGIC_VECTOR(3 downto 0);",
    "              Cin: in STD_LOGIC;",
    "              Sum: out STD_LOGIC_VECTOR(3 downto 0);",
    "              Cout: out STD_LOGIC);",
    "    end component;",
    "",
    "    -- Testbench signals",
    "    signal TB_A, TB_B : STD_LOGIC_VECTOR(3 downto 0) := \"0000\";",
    "    signal TB_Cin      : STD_LOGIC := '0';",
    "    signal TB_Sum      : STD_LOGIC_VECTOR(3 downto 0);",
    "    signal TB_Cout     : STD_LOGIC;",
    "",
    "begin",
    "    -- Instantiate DUT",
    "    UUT: RippleAdder_4bit",
    "        port map(A=>TB_A, B=>TB_B, Cin=>TB_Cin,",
    "                 Sum=>TB_Sum, Cout=>TB_Cout);",
    "",
    "    -- Stimulus process with self-checking assertions",
    "    process",
    "        variable expected_sum  : STD_LOGIC_VECTOR(4 downto 0);",
    "    begin",
    "        -- Test 1: 0 + 0 + 0 = 0",
    "        TB_A<=\"0000\"; TB_B<=\"0000\"; TB_Cin<='0'; wait for 20 ns;",
    "        assert (TB_Sum=\"0000\" and TB_Cout='0')",
    "            report \"FAIL: Test 1 (0+0)\" severity ERROR;",
    "",
    "        -- Test 2: 5 + 3 + 0 = 8",
    "        TB_A<=\"0101\"; TB_B<=\"0011\"; TB_Cin<='0'; wait for 20 ns;",
    "        assert (TB_Sum=\"1000\" and TB_Cout='0')",
    "            report \"FAIL: Test 2 (5+3=8)\" severity ERROR;",
    "",
    "        -- Test 3: Overflow: 15 + 1 = 16 (Cout=1, Sum=0)",
    "        TB_A<=\"1111\"; TB_B<=\"0001\"; TB_Cin<='0'; wait for 20 ns;",
    "        assert (TB_Sum=\"0000\" and TB_Cout='1')",
    "            report \"FAIL: Test 3 (overflow)\" severity ERROR;",
    "",
    "        -- Test 4: With Cin = 1",
    "        TB_A<=\"0111\"; TB_B<=\"0111\"; TB_Cin<='1'; wait for 20 ns;",
    "        assert (TB_Sum=\"1111\" and TB_Cout='0')",
    "            report \"FAIL: Test 4 (7+7+1=15)\" severity ERROR;",
    "",
    "        report \"All tests completed\" severity NOTE;",
    "        wait;  -- Stop simulation",
    "    end process;",
    "",
    "end Simulation;",
  ],
  simOutput: "If all assertions pass, simulation completes with 'All tests completed' NOTE message. If any test fails, ModelSim shows an ERROR message pinpointing which test case failed. Waveform shows TB_A, TB_B changing every 20ns with corresponding Sum and Cout responses.",
  questions: {
    conceptual: "What is the SEVERITY FAILURE level in VHDL ASSERT statements, and what happens when the simulator encounters it?",
    coding: "Write a testbench for the 4-to-1 MUX that tests all 4 select values. Include at least one assertion per test case.",
    mcq: {
      q: "In a VHDL testbench, the 'wait' statement with no conditions means:",
      opts: ["(A) Wait for 1 ns", "(B) Wait for one clock cycle", "(C) Suspend the process indefinitely", "(D) Reset all signals"],
      ans: "(C) A bare 'wait;' suspends the process forever — used to stop the testbench stimulus after all tests complete"
    }
  },
  tips: [
    "Testbench entity should have NO ports — it is a standalone simulation top level.",
    "Use 'wait for 20 ns' between test vectors — give the combinational circuit time to settle before checking outputs.",
    "SEVERITY ERROR continues simulation; SEVERITY FAILURE stops it. Use ERROR for individual test failures so all tests run.",
    "Always add a final 'wait;' at the end of your stimulus process — without it, the process repeats forever."
  ]
},

// ═══════════════════ WEEK 3 ═══════════════════
{
  day: 15, weekColor: COLORS.week3,
  title: "VHDL D Flip-Flop: SR, D, JK and T Flip-Flop Implementation Guide",
  seoKeyword: "VHDL flip flop D SR JK T implementation",
  overview: "Flip-flops are the foundation of all sequential logic — registers, counters, and state machines. This article implements all four major flip-flop types in VHDL with synchronous and asynchronous reset options.",
  theory: [
    "Flip-flop vs latch: level-triggered (latch) vs edge-triggered (flip-flop)",
    "SR flip-flop: illegal state (S=R=1) and how to handle it in VHDL",
    "D flip-flop: most widely used, directly maps to registers in synthesis",
    "JK flip-flop: eliminates illegal state, toggle mode when J=K=1",
    "T flip-flop: single input, toggles on T=1",
    "Synchronous vs asynchronous reset: synthesis implications and best practices",
    "Setup time and hold time: why flip-flops fail if timing is violated"
  ],
  keyDefs: ["Flip-Flop", "Latch", "Rising Edge", "Synchronous Reset", "Asynchronous Reset", "Setup Time", "Hold Time"],
  analogy: "Analogy: A D flip-flop is like a camera shutter — it only captures the scene (D input) at the exact moment you press the button (clock edge) and holds that image (Q output) until the next shot.",
  codeTitle: "All four flip-flop types: SR, D, JK, T — with sync and async reset",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 15: All Major Flip-Flop Types",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "-- ── D Flip-Flop with Synchronous Reset ───────────────────────",
    "entity DFF_Sync is",
    "    Port ( clk, rst, D : in STD_LOGIC; Q : out STD_LOGIC );",
    "end DFF_Sync;",
    "architecture Behavioral of DFF_Sync is",
    "begin",
    "    process(clk)",
    "    begin",
    "        if rising_edge(clk) then",
    "            if rst = '1' then Q <= '0'; else Q <= D; end if;",
    "        end if;",
    "    end process;",
    "end Behavioral;",
    "",
    "-- ── D Flip-Flop with Asynchronous Reset ──────────────────────",
    "entity DFF_Async is",
    "    Port ( clk, rst, D : in STD_LOGIC; Q : out STD_LOGIC );",
    "end DFF_Async;",
    "architecture Behavioral of DFF_Async is",
    "begin",
    "    process(clk, rst)  -- rst must be in sensitivity list!",
    "    begin",
    "        if rst = '1' then      -- Checked OUTSIDE rising_edge",
    "            Q <= '0';",
    "        elsif rising_edge(clk) then",
    "            Q <= D;",
    "        end if;",
    "    end process;",
    "end Behavioral;",
    "",
    "-- ── JK Flip-Flop ─────────────────────────────────────────────",
    "entity JKFF is",
    "    Port ( clk, rst, J, K : in STD_LOGIC; Q : out STD_LOGIC );",
    "end JKFF;",
    "architecture Behavioral of JKFF is",
    "    signal Q_int : STD_LOGIC := '0';",
    "begin",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then Q_int <= '0';",
    "        elsif rising_edge(clk) then",
    "            case (J & K) is",
    "                when \"00\" => Q_int <= Q_int;   -- No change",
    "                when \"01\" => Q_int <= '0';     -- Reset",
    "                when \"10\" => Q_int <= '1';     -- Set",
    "                when \"11\" => Q_int <= NOT Q_int; -- Toggle",
    "                when others => Q_int <= 'X';",
    "            end case;",
    "        end if;",
    "    end process;",
    "    Q <= Q_int;  -- Connect internal signal to output",
    "end Behavioral;",
    "",
    "-- ── T Flip-Flop ──────────────────────────────────────────────",
    "entity TFF is",
    "    Port ( clk, rst, T : in STD_LOGIC; Q : out STD_LOGIC );",
    "end TFF;",
    "architecture Behavioral of TFF is",
    "    signal Q_int : STD_LOGIC := '0';",
    "begin",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then Q_int <= '0';",
    "        elsif rising_edge(clk) then",
    "            if T = '1' then Q_int <= NOT Q_int;",
    "            end if;",
    "        end if;",
    "    end process;",
    "    Q <= Q_int;",
    "end Behavioral;",
  ],
  simOutput: "D Flip-Flop sync: Q captures D only on rising clock edge; rst='1' at any clock edge resets Q. Async version: rst='1' immediately resets Q without waiting for clock. JK: J=K=1 toggles Q on each clock. T: Q toggles when T=1, holds when T=0.",
  questions: {
    conceptual: "What is the key synthesis difference between a synchronous and asynchronous reset in terms of the logic circuit created?",
    coding: "Convert a D flip-flop to a T flip-flop using only D flip-flop and XOR gate (D = T XOR Q).",
    mcq: {
      q: "For a JK flip-flop, the forbidden input combination is:",
      opts: ["(A) J=0, K=0", "(B) J=1, K=0", "(C) J=1, K=1", "(D) There is no forbidden state for JK"],
      ans: "(D) — The JK flip-flop was specifically designed to eliminate the forbidden state that SR has when S=R=1. J=K=1 causes toggling, which is a valid defined operation"
    }
  },
  tips: [
    "For asynchronous reset, rst MUST be in the sensitivity list. For synchronous reset, it must NOT be in the sensitivity list (only clk belongs there).",
    "Never directly assign Q (output port) and then read it in the same process — outputs are write-only. Use an internal signal (Q_int) to track state.",
    "JK and T flip-flops are usually synthesized from D flip-flops by synthesis tools — the tool adds XOR/combinational logic at the input.",
    "Most FPGA architectures only have D flip-flop primitives. All other types are synthesized from D flip-flops."
  ]
},

{
  day: 16, weekColor: COLORS.week3,
  title: "VHDL Registers: Shift Register and Parallel Load Register Design",
  seoKeyword: "VHDL shift register parallel load register",
  overview: "Registers are groups of flip-flops that store multi-bit data. Shift registers are essential in serial communication (UART, SPI), while parallel-load registers form the basis of processor registers and data buffers.",
  theory: [
    "4-bit D register: parallel storage of 4-bit data",
    "SISO: Serial In, Serial Out shift register — data shifts one bit per clock",
    "SIPO: Serial In, Parallel Out — converts serial data to parallel",
    "PISO: Parallel In, Serial Out — converts parallel to serial",
    "PIPO with load: parallel load and parallel output",
    "Universal shift register: combines all modes with mode-select inputs",
    "Circular (Ring) shift register and Johnson counter"
  ],
  keyDefs: ["SISO", "SIPO", "PISO", "PIPO", "Shift Register", "Parallel Load", "Ring Counter", "Johnson Counter"],
  analogy: "Analogy: A shift register is like a queue of people — each person passes a message to the next person on every clock beat. A PISO register is like multiple doors opening simultaneously to let people enter, then they leave one by one through a single exit.",
  codeTitle: "Universal 4-bit Shift Register with all four modes",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 16: Universal 4-bit Shift Register",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "entity UniversalShiftReg is",
    "    Port (",
    "        clk   : in  STD_LOGIC;",
    "        rst   : in  STD_LOGIC;",
    "        Mode  : in  STD_LOGIC_VECTOR(1 downto 0); -- 00=Hold,01=SHL,10=SHR,11=Load",
    "        SI_L  : in  STD_LOGIC;    -- Serial Input Left",
    "        SI_R  : in  STD_LOGIC;    -- Serial Input Right",
    "        D     : in  STD_LOGIC_VECTOR(3 downto 0); -- Parallel Input",
    "        Q     : out STD_LOGIC_VECTOR(3 downto 0)  -- Parallel Output",
    "    );",
    "end UniversalShiftReg;",
    "",
    "architecture Behavioral of UniversalShiftReg is",
    "    signal reg : STD_LOGIC_VECTOR(3 downto 0) := \"0000\";",
    "begin",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then",
    "            reg <= \"0000\";",
    "        elsif rising_edge(clk) then",
    "            case Mode is",
    "                when \"00\" =>  -- Hold",
    "                    reg <= reg;",
    "                when \"01\" =>  -- Shift Left (MSB gets SI_L)",
    "                    reg <= SI_L & reg(3 downto 1);",
    "                when \"10\" =>  -- Shift Right (LSB gets SI_R)",
    "                    reg <= reg(2 downto 0) & SI_R;",
    "                when \"11\" =>  -- Parallel Load",
    "                    reg <= D;",
    "                when others => reg <= (others => 'X');",
    "            end case;",
    "        end if;",
    "    end process;",
    "    Q <= reg;",
    "end Behavioral;",
  ],
  simOutput: "Mode=11: reg loads D value immediately on next clock. Mode=01 (shift left): each clock, reg shifts one bit left, SI_L enters at bit 0. Mode=10 (shift right): each clock, reg shifts right, SI_R enters at bit 3. Mode=00: register holds value unchanged.",
  questions: {
    conceptual: "A PISO (Parallel In Serial Out) shift register is used in SPI communication. Explain which mode corresponds to loading parallel data and which corresponds to shifting out.",
    coding: "Design a 4-bit ring counter (circular shift register) in VHDL that cycles through: 1000, 0100, 0010, 0001, 1000...",
    mcq: {
      q: "A 4-bit SIPO shift register receives serial data '1011' (MSB first). After 4 clock cycles, the parallel output Q[3:0] is:",
      opts: ["(A) 1101", "(B) 1011", "(C) 0110", "(D) 1110"],
      ans: "(B) 1011 — after 4 clock cycles, all bits have been shifted in, MSB first: Q=1011"
    }
  },
  tips: [
    "The concatenation operator & is perfect for shift operations: 'SI & reg(3 downto 1)' shifts right and inserts SI at the top.",
    "Remember: shifting LEFT means bits move towards MSB. Shifting RIGHT means bits move towards LSB. The naming can confuse — draw it out.",
    "A ring counter has no serial input — the MSB feeds back to the LSB (or vice versa). Initialize with '0001' to start the ring.",
    "Universal shift registers are commonly asked in GATE and university exams — understand all four modes thoroughly."
  ]
},

{
  day: 17, weekColor: COLORS.week3,
  title: "VHDL Counters: Binary, BCD, Up-Down Counter Design with VHDL Code",
  seoKeyword: "VHDL counter binary BCD up down counter",
  overview: "Counters are among the most frequently designed circuits in digital systems. This article covers synchronous binary counters, BCD counters, up-down counters, and counters with load and enable signals.",
  theory: [
    "Synchronous vs asynchronous counters: VHDL always models synchronous",
    "4-bit binary up counter: 0 to 15 and rollover",
    "4-bit binary down counter: 15 to 0 and underflow",
    "BCD counter: 0 to 9, resets to 0 on reaching 10",
    "Up-down counter: mode-select controlled direction",
    "Counter with parallel load: presettable counter",
    "Modulo-N counter: counting from 0 to N-1"
  ],
  keyDefs: ["Synchronous Counter", "Asynchronous Counter", "BCD Counter", "Up-Down Counter", "Modulo-N", "Overflow", "Terminal Count"],
  analogy: "Analogy: A BCD counter is like the odometer digit on a car — it counts from 0 to 9 and then resets to 0 while sending a carry to the next digit (the tens place).",
  codeTitle: "4-bit Up-Down Binary Counter and BCD Counter with enable",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 17: Binary Up-Down Counter and BCD Counter",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "-- ── 4-bit Up-Down Binary Counter ─────────────────────────────",
    "entity UpDownCounter is",
    "    Port (",
    "        clk, rst, EN : in  STD_LOGIC;",
    "        UP_DOWN      : in  STD_LOGIC;  -- '1'=Up, '0'=Down",
    "        Q            : out STD_LOGIC_VECTOR(3 downto 0);",
    "        TC           : out STD_LOGIC   -- Terminal Count",
    "    );",
    "end UpDownCounter;",
    "",
    "architecture Behavioral of UpDownCounter is",
    "    signal count : UNSIGNED(3 downto 0) := \"0000\";",
    "begin",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then",
    "            count <= \"0000\";",
    "        elsif rising_edge(clk) then",
    "            if EN = '1' then",
    "                if UP_DOWN = '1' then",
    "                    count <= count + 1;  -- Wraps 15->0 automatically",
    "                else",
    "                    count <= count - 1;  -- Wraps 0->15 automatically",
    "                end if;",
    "            end if;",
    "        end if;",
    "    end process;",
    "",
    "    Q  <= STD_LOGIC_VECTOR(count);",
    "    TC <= '1' when (count = \"1111\" and UP_DOWN = '1') or",
    "                   (count = \"0000\" and UP_DOWN = '0')",
    "         else '0';",
    "end Behavioral;",
    "",
    "-- ── BCD Counter (Mod-10) ───────────────────────────────────────",
    "entity BCD_Counter is",
    "    Port ( clk, rst : in STD_LOGIC;",
    "           Q        : out STD_LOGIC_VECTOR(3 downto 0);",
    "           Carry    : out STD_LOGIC );",
    "end BCD_Counter;",
    "",
    "architecture Behavioral of BCD_Counter is",
    "    signal count : UNSIGNED(3 downto 0) := \"0000\";",
    "begin",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then count <= \"0000\";",
    "        elsif rising_edge(clk) then",
    "            if count = 9 then count <= \"0000\";",
    "            else               count <= count + 1;",
    "            end if;",
    "        end if;",
    "    end process;",
    "    Q     <= STD_LOGIC_VECTOR(count);",
    "    Carry <= '1' when count = 9 else '0';",
    "end Behavioral;",
  ],
  simOutput: "Up counter with UP_DOWN=1: Q counts 0,1,2...15,0,1... TC pulses high at Q=15. Down counter: Q counts 15,14...0,15... TC pulses at Q=0. BCD counter counts 0-9 then resets. Carry goes high when count=9 (for cascading to the tens digit).",
  questions: {
    conceptual: "Explain how you would cascade two BCD counters to create a 2-digit decimal counter (00 to 99).",
    coding: "Design a Modulo-6 counter in VHDL (counts from 0 to 5 and resets to 0).",
    mcq: {
      q: "A synchronous 4-bit binary counter is reset to 0. After 19 clock pulses (no reset, counting up), the output is:",
      opts: ["(A) 0011", "(B) 1010", "(C) 0010", "(D) 1001"],
      ans: "(A) 0011 — 19 mod 16 = 3, binary 3 = 0011"
    }
  },
  tips: [
    "Use UNSIGNED type for counter arithmetic in VHDL — it handles overflow and underflow naturally (wraps around).",
    "Never use INTEGER type for synthesis-targeted counter code — always specify a range or use UNSIGNED/SIGNED.",
    "BCD counter: the if-check 'if count = 9' should be a concurrent check BEFORE the register, not inside the counting path — otherwise you get an off-by-one cycle carry.",
    "The Terminal Count (TC) output is useful for cascading counters — it goes high in the last count state."
  ]
},

{
  day: 18, weekColor: COLORS.week3,
  title: "VHDL State Machine Introduction: Moore vs Mealy FSM Explained",
  seoKeyword: "VHDL state machine Moore Mealy FSM",
  overview: "Finite State Machines are the most powerful abstraction in digital design. From vending machines to protocol controllers, FSMs model sequential systems cleanly. This article introduces Moore and Mealy machines with simple examples.",
  theory: [
    "FSM definition: finite states, inputs, outputs, transitions",
    "Moore machine: outputs depend ONLY on current state",
    "Mealy machine: outputs depend on current state AND current inputs",
    "State encoding: binary, one-hot, grey code — and their trade-offs",
    "VHDL FSM template: enumeration type for states, 2-process or 3-process model",
    "State diagram to VHDL code: systematic conversion method",
    "Reset state importance: every FSM must have a defined reset state"
  ],
  keyDefs: ["FSM", "Moore Machine", "Mealy Machine", "State Encoding", "One-Hot Encoding", "Enumeration Type", "Next State Logic"],
  analogy: "Analogy: A Moore FSM is like a traffic light — the output (light color) depends only on which state the light is in, not on which direction cars are currently coming from. A Mealy FSM is like a security door — the output (open/locked) depends on both the current state (armed/unarmed) AND the current input (correct PIN entered or not).",
  codeTitle: "Sequence Detector FSM: detect '101' in a serial bit stream — both Moore and Mealy",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 18: Sequence Detector FSM (detect '101')",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "-- ── Moore FSM: output depends only on state ───────────────────",
    "entity SeqDetector_Moore is",
    "    Port (",
    "        clk, rst, X : in  STD_LOGIC;",
    "        Detected    : out STD_LOGIC",
    "    );",
    "end SeqDetector_Moore;",
    "",
    "architecture Behavioral of SeqDetector_Moore is",
    "    -- State enumeration type",
    "    type State_Type is (S0, S1, S2, S3);  -- S3 = pattern found",
    "    signal curr_state, next_state : State_Type;",
    "begin",
    "",
    "    -- Process 1: State Register (Sequential)",
    "    state_reg: process(clk, rst)",
    "    begin",
    "        if rst = '1' then curr_state <= S0;",
    "        elsif rising_edge(clk) then curr_state <= next_state;",
    "        end if;",
    "    end process;",
    "",
    "    -- Process 2: Next State Logic (Combinational)",
    "    next_state_logic: process(curr_state, X)",
    "    begin",
    "        case curr_state is",
    "            when S0 => if X='1' then next_state<=S1; else next_state<=S0; end if;",
    "            when S1 => if X='0' then next_state<=S2; else next_state<=S1; end if;",
    "            when S2 => if X='1' then next_state<=S3; else next_state<=S0; end if;",
    "            when S3 => if X='1' then next_state<=S1; else next_state<=S0; end if;",
    "            when others => next_state <= S0;",
    "        end case;",
    "    end process;",
    "",
    "    -- Process 3: Output Logic (Moore: only depends on state)",
    "    Detected <= '1' when curr_state = S3 else '0';",
    "",
    "end Behavioral;",
  ],
  simOutput: "Input sequence: 0,1,0,1,1,0,1 → Detected goes '1' after the third bit of the first '101' pattern (at clock 4), then resets. Mealy version would assert Detected one cycle earlier (on the transition to S3, not after entering S3).",
  questions: {
    conceptual: "In a Moore FSM, if the same input causes transitions to two different states from two different current states, can the outputs differ? Explain with reference to the output logic.",
    coding: "Design a VHDL FSM for a simple vending machine: it accepts 5-rupee and 10-rupee coins, dispenses a product worth 15 rupees, and gives back change.",
    mcq: {
      q: "A Mealy FSM with 3 states and 2 inputs can have at most how many distinct output values?",
      opts: ["(A) 3", "(B) 6", "(C) 8", "(D) Unlimited"],
      ans: "(B) 6 — Mealy outputs depend on (state × input), so 3 states × 2 inputs = 6 possible output assignments"
    }
  },
  tips: [
    "The 3-process FSM template is the most synthesis-friendly: process 1 = state register, process 2 = next-state logic, process 3 = output logic. Keep them separate.",
    "Enumeration types for states are synthesized using binary encoding by default. Add 'attribute fsm_encoding: string; attribute fsm_encoding of state: signal is \"one_hot\"' to force one-hot.",
    "Always include 'when others => next_state <= S0' in your state machine CASE to avoid latches during synthesis.",
    "Moore machines have one extra clock cycle of output latency compared to equivalent Mealy machines — important for timing-sensitive designs."
  ]
},

{
  day: 19, weekColor: COLORS.week3,
  title: "VHDL FSM Design: Traffic Light Controller — Complete Project with Code",
  seoKeyword: "VHDL FSM traffic light controller project",
  overview: "A traffic light controller is the classic FSM project in every VLSI course. This article builds a complete, practical FSM with timer-based state transitions — a project that directly maps to real-world embedded systems.",
  theory: [
    "Traffic light system requirements: timing, pedestrian request, emergency override",
    "State diagram design: identifying all states, inputs, and outputs",
    "Timer implementation in VHDL: using counter inside FSM",
    "One-hot encoding for traffic lights: direct mapping to R, Y, G outputs",
    "Adding pedestrian walk signal: additional FSM states",
    "Simulation-friendly timers: using small counts for testbench, larger for real FPGA",
    "Common FSM pitfalls: missing state transitions, undefined outputs, combinational loops"
  ],
  keyDefs: ["Traffic Light Controller", "State Diagram", "Timer Counter", "State Timeout", "One-Hot", "Pedestrian Request"],
  analogy: "Analogy: The traffic light FSM is like a supervisor managing two queues at a bank counter — they follow a fixed schedule (timer) but can also react to urgent requests (pedestrian button or emergency vehicle).",
  codeTitle: "4-state Traffic Light Controller FSM with internal timer",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 19: Traffic Light Controller FSM",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity TrafficLight is",
    "    Port (",
    "        clk, rst  : in  STD_LOGIC;",
    "        NS_Light  : out STD_LOGIC_VECTOR(2 downto 0); -- R,Y,G",
    "        EW_Light  : out STD_LOGIC_VECTOR(2 downto 0)  -- R,Y,G",
    "    );",
    "end TrafficLight;",
    "",
    "architecture Behavioral of TrafficLight is",
    "",
    "    type TL_State is (NS_GREEN, NS_YELLOW, EW_GREEN, EW_YELLOW);",
    "    signal state : TL_State := NS_GREEN;",
    "",
    "    -- Light encoding: bit2=Red, bit1=Yellow, bit0=Green",
    "    constant RED    : STD_LOGIC_VECTOR(2 downto 0) := \"100\";",
    "    constant YELLOW : STD_LOGIC_VECTOR(2 downto 0) := \"010\";",
    "    constant GREEN  : STD_LOGIC_VECTOR(2 downto 0) := \"001\";",
    "",
    "    signal timer : UNSIGNED(3 downto 0) := (others => '0');",
    "    constant GREEN_TIME  : UNSIGNED(3 downto 0) := \"1001\";  -- 9 cycles",
    "    constant YELLOW_TIME : UNSIGNED(3 downto 0) := \"0010\";  -- 2 cycles",
    "",
    "begin",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then",
    "            state <= NS_GREEN; timer <= (others => '0');",
    "        elsif rising_edge(clk) then",
    "            timer <= timer + 1;",
    "            case state is",
    "                when NS_GREEN  =>",
    "                    if timer >= GREEN_TIME  then state<=NS_YELLOW; timer<=(others=>'0'); end if;",
    "                when NS_YELLOW =>",
    "                    if timer >= YELLOW_TIME then state<=EW_GREEN;  timer<=(others=>'0'); end if;",
    "                when EW_GREEN  =>",
    "                    if timer >= GREEN_TIME  then state<=EW_YELLOW; timer<=(others=>'0'); end if;",
    "                when EW_YELLOW =>",
    "                    if timer >= YELLOW_TIME then state<=NS_GREEN;  timer<=(others=>'0'); end if;",
    "            end case;",
    "        end if;",
    "    end process;",
    "",
    "    -- Output logic (Moore)",
    "    NS_Light <= GREEN  when state = NS_GREEN  else",
    "                YELLOW when state = NS_YELLOW else RED;",
    "    EW_Light <= GREEN  when state = EW_GREEN  else",
    "                YELLOW when state = EW_YELLOW else RED;",
    "",
    "end Behavioral;",
  ],
  simOutput: "States cycle: NS_GREEN (9 clocks) → NS_YELLOW (2 clocks) → EW_GREEN (9 clocks) → EW_YELLOW (2 clocks) → NS_GREEN. While NS is GREEN, EW is RED and vice versa. During YELLOW phases, the corresponding direction shows yellow, other direction stays RED.",
  questions: {
    conceptual: "How would you modify the traffic light FSM to handle an emergency vehicle override — when an emergency signal is asserted, all lights should go RED immediately?",
    coding: "Add a pedestrian crossing request to the traffic light FSM: when a pedestrian button is pressed, add an additional ALL_RED state (4 clock cycles) after each YELLOW state.",
    mcq: {
      q: "In the traffic light controller, the NS_YELLOW state represents:",
      opts: ["(A) NS is RED, EW is GREEN", "(B) NS is YELLOW, EW is RED", "(C) NS is YELLOW, EW is GREEN", "(D) Both lights are YELLOW"],
      ans: "(B) NS is transitioning (YELLOW), EW is still RED — not yet cleared to go"
    }
  },
  tips: [
    "Keep the output logic as concurrent assignments OUTSIDE the process for clean Moore FSM implementation.",
    "Use CONSTANT for timing values — changing 'GREEN_TIME := 9' to a larger value for real hardware requires only one edit.",
    "Simulation timescale: for testbench, use small timer values (9-10 cycles). For FPGA, compute the clock divider ratio based on your board's clock frequency.",
    "Don't forget that when NS is GREEN, EW must be RED — this is a safety-critical rule. Always double-check your output logic."
  ]
},

{
  day: 20, weekColor: COLORS.week3,
  title: "VHDL RAM and ROM Design: Synchronous Memory Implementation",
  seoKeyword: "VHDL RAM ROM memory design synchronous",
  overview: "Memory is at the heart of every digital system. This article covers how to design synchronous RAM and ROM in VHDL — essential for building datapaths, lookup tables, and FIFOs.",
  theory: [
    "Memory basics: address lines, data lines, read/write enable",
    "ROM: Read-Only Memory — initialized at design time using initial values",
    "RAM: Random Access Memory — read and write operations",
    "Synchronous vs asynchronous memory: why synchronous is preferred for FPGA",
    "Single-port vs dual-port RAM: reading and writing at the same time",
    "VHDL array types for memory modeling",
    "Initialization of memory: type-level initialization in VHDL"
  ],
  keyDefs: ["RAM", "ROM", "Address", "Write Enable", "Memory Array", "Synchronous Read", "Dual-Port"],
  analogy: "Analogy: ROM is like a printed book — data is fixed and you can only read it. RAM is like a whiteboard — you can read and write data, but it is erased when power is removed.",
  codeTitle: "16x8 Synchronous RAM and 16x8 ROM with initialization",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 20: RAM and ROM Design",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "-- ── 16x8 Synchronous RAM ──────────────────────────────────────",
    "entity SRAM_16x8 is",
    "    Port (",
    "        clk   : in  STD_LOGIC;",
    "        WE    : in  STD_LOGIC;   -- Write Enable",
    "        Addr  : in  STD_LOGIC_VECTOR(3 downto 0);  -- 4-bit address",
    "        DIn   : in  STD_LOGIC_VECTOR(7 downto 0);  -- Data in",
    "        DOut  : out STD_LOGIC_VECTOR(7 downto 0)   -- Data out",
    "    );",
    "end SRAM_16x8;",
    "",
    "architecture Behavioral of SRAM_16x8 is",
    "    type MemArray is array(0 to 15) of STD_LOGIC_VECTOR(7 downto 0);",
    "    signal mem : MemArray := (others => (others => '0'));",
    "begin",
    "    process(clk)",
    "    begin",
    "        if rising_edge(clk) then",
    "            if WE = '1' then",
    "                mem(to_integer(UNSIGNED(Addr))) <= DIn;  -- Write",
    "            end if;",
    "            DOut <= mem(to_integer(UNSIGNED(Addr)));     -- Synchronous Read",
    "        end if;",
    "    end process;",
    "end Behavioral;",
    "",
    "-- ── 16x8 ROM with Initialization ─────────────────────────────",
    "entity ROM_16x8 is",
    "    Port (",
    "        clk  : in  STD_LOGIC;",
    "        Addr : in  STD_LOGIC_VECTOR(3 downto 0);",
    "        DOut : out STD_LOGIC_VECTOR(7 downto 0)",
    "    );",
    "end ROM_16x8;",
    "",
    "architecture Behavioral of ROM_16x8 is",
    "    type RomArray is array(0 to 15) of STD_LOGIC_VECTOR(7 downto 0);",
    "    constant ROM_DATA : RomArray := (",
    "        0  => x\"00\",  1  => x\"0A\",  2  => x\"14\",  3  => x\"1E\",",
    "        4  => x\"28\",  5  => x\"32\",  6  => x\"3C\",  7  => x\"46\",",
    "        8  => x\"50\",  9  => x\"5A\",  10 => x\"64\",  11 => x\"6E\",",
    "        12 => x\"78\",  13 => x\"82\",  14 => x\"8C\",  15 => x\"96\"",
    "    );",
    "begin",
    "    process(clk)",
    "    begin",
    "        if rising_edge(clk) then",
    "            DOut <= ROM_DATA(to_integer(UNSIGNED(Addr)));",
    "        end if;",
    "    end process;",
    "end Behavioral;",
  ],
  simOutput: "RAM: Write WE=1 at Addr=5, DIn=0xAB, then WE=0 at Addr=5 → DOut=0xAB on the next clock (synchronous read latency = 1 cycle). ROM: Addr=0 → DOut=0x00, Addr=5 → DOut=0x32 (multiples of 10: a lookup table).",
  questions: {
    conceptual: "What is the difference between a synchronous read and an asynchronous read in RAM? Which does FPGA block RAM support, and why does it matter for timing?",
    coding: "Modify the RAM to support byte-enable: add a BE signal that, when '0', prevents writing to a specific byte. Design for a 16x16 RAM with 2-byte enable signals.",
    mcq: {
      q: "A ROM with 10 address lines can store how many locations?",
      opts: ["(A) 10", "(B) 100", "(C) 512", "(D) 1024"],
      ans: "(D) 1024 — 2^10 = 1024 addressable locations"
    }
  },
  tips: [
    "For FPGA designs, synchronous read is strongly preferred — it maps directly to Block RAM (BRAM) primitives for efficiency.",
    "Initializing a constant array with 'x\"AB\"' hex notation is cleaner than binary — use hex for byte-wide data.",
    "The 'to_integer(UNSIGNED(Addr))' conversion is necessary every time you use a STD_LOGIC_VECTOR as an array index.",
    "ModelSim can display memory contents — right-click the signal → 'Add to wave' → you can see the full memory array during simulation."
  ]
},

{
  day: 21, weekColor: COLORS.week3,
  title: "VHDL FIFO Design: First-In First-Out Buffer Implementation",
  seoKeyword: "VHDL FIFO design synchronous buffer",
  overview: "FIFOs are ubiquitous in digital design — used in clock domain crossing, data buffering, and communication interfaces. This article builds a complete synchronous FIFO with full/empty flags.",
  theory: [
    "FIFO concept: circular buffer with read and write pointers",
    "Full flag: write pointer has caught up to read pointer",
    "Empty flag: read and write pointers are equal",
    "Almost-full and almost-empty flags for flow control",
    "Synchronous vs asynchronous FIFO: single vs dual clock",
    "FIFO depth and width selection: design considerations",
    "Applications: UART buffer, video frame buffer, DMA interface"
  ],
  keyDefs: ["FIFO", "Write Pointer", "Read Pointer", "Full Flag", "Empty Flag", "Circular Buffer", "Flow Control"],
  analogy: "Analogy: A FIFO is like a supermarket checkout queue — customers (data) enter from one end and leave from the other in the same order they arrived. The queue has a maximum length (depth) and signals when it is full or empty.",
  codeTitle: "8-deep x 8-bit Synchronous FIFO with Full/Empty flags",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 21: 8-deep x 8-bit Synchronous FIFO",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity FIFO_8x8 is",
    "    Port (",
    "        clk   : in  STD_LOGIC;",
    "        rst   : in  STD_LOGIC;",
    "        WR_EN : in  STD_LOGIC;",
    "        RD_EN : in  STD_LOGIC;",
    "        DIn   : in  STD_LOGIC_VECTOR(7 downto 0);",
    "        DOut  : out STD_LOGIC_VECTOR(7 downto 0);",
    "        Full  : out STD_LOGIC;",
    "        Empty : out STD_LOGIC",
    "    );",
    "end FIFO_8x8;",
    "",
    "architecture Behavioral of FIFO_8x8 is",
    "    type FifoMem is array (0 to 7) of STD_LOGIC_VECTOR(7 downto 0);",
    "    signal mem       : FifoMem;",
    "    signal wr_ptr    : UNSIGNED(3 downto 0) := \"0000\";",
    "    signal rd_ptr    : UNSIGNED(3 downto 0) := \"0000\";",
    "    signal count     : UNSIGNED(3 downto 0) := \"0000\";",
    "    signal full_int  : STD_LOGIC;",
    "    signal empty_int : STD_LOGIC;",
    "begin",
    "    full_int  <= '1' when count = 8 else '0';",
    "    empty_int <= '1' when count = 0 else '0';",
    "    Full  <= full_int;",
    "    Empty <= empty_int;",
    "",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then",
    "            wr_ptr <= \"0000\"; rd_ptr <= \"0000\"; count <= \"0000\";",
    "        elsif rising_edge(clk) then",
    "            -- Write operation",
    "            if WR_EN = '1' and full_int = '0' then",
    "                mem(to_integer(wr_ptr(2 downto 0))) <= DIn;",
    "                wr_ptr <= wr_ptr + 1;",
    "                count  <= count + 1;",
    "            end if;",
    "            -- Read operation",
    "            if RD_EN = '1' and empty_int = '0' then",
    "                DOut   <= mem(to_integer(rd_ptr(2 downto 0)));",
    "                rd_ptr <= rd_ptr + 1;",
    "                count  <= count - 1;",
    "            end if;",
    "            -- Simultaneous read and write: count unchanged",
    "            if WR_EN = '1' and RD_EN = '1' and",
    "               full_int = '0' and empty_int = '0' then",
    "                count <= count;",
    "            end if;",
    "        end if;",
    "    end process;",
    "end Behavioral;",
  ],
  simOutput: "Writing 0xAA,0xBB,0xCC,0xDD: count increases 1-4. Full flag asserts after writing 8 items. Reading: DOut shows 0xAA first (FIFO order), then 0xBB, etc. Empty flag asserts when count=0. Simultaneous read/write keeps count stable.",
  questions: {
    conceptual: "What problem occurs if you read from an empty FIFO without checking the empty flag? How does proper hardware handle this error condition?",
    coding: "Add an 'almost_full' flag to the FIFO that asserts when count >= 6 (one slot before full).",
    mcq: {
      q: "In a FIFO buffer, data is always retrieved in which order?",
      opts: ["(A) Last In First Out", "(B) Random access order", "(C) First In First Out", "(D) Address-based order"],
      ans: "(C) FIFO = First In First Out — the first data written is always the first data read"
    }
  },
  tips: [
    "Use a separate 'count' register rather than comparing pointers directly for full/empty — it handles edge cases more cleanly.",
    "The FIFO pointer width should be one bit wider than necessary (4-bit pointer for 8-deep FIFO) to distinguish full from empty.",
    "Never read an empty FIFO or write a full FIFO — always check flags. In hardware, ignoring these flags corrupts data silently.",
    "For synthesis on FPGA, large FIFOs are better implemented using IP cores (Xilinx FIFO Generator / Intel SCFIFO) which use Block RAM primitives."
  ]
},

// ═══════════════════ WEEK 4 ═══════════════════
{
  day: 22, weekColor: COLORS.week4,
  title: "Advanced VHDL FSM Design: One-Hot Encoding and SAFE State Machines",
  seoKeyword: "advanced VHDL FSM one-hot encoding safe state machine",
  overview: "Advanced FSM design goes beyond basic state machines. This article covers one-hot encoding for FPGA efficiency, FSM safety attributes, and techniques to prevent FSMs from getting stuck in illegal states.",
  theory: [
    "Binary vs one-hot encoding: area vs speed trade-offs on FPGA",
    "One-hot encoding: N states require N flip-flops, only one '1' at a time",
    "VHDL attribute for encoding: FSM_ENCODING, SAFE attribute",
    "Safe FSMs: what happens when an FSM enters an illegal state (SEU in space applications)",
    "FSM coding styles: implicit next-state, explicit two-process",
    "Synthesis tool FSM extraction: how Vivado/Quartus recognizes FSMs",
    "FSM optimization: state merging, state minimization concepts"
  ],
  keyDefs: ["One-Hot Encoding", "FSM_ENCODING Attribute", "Safe FSM", "Illegal State", "State Minimization", "SEU"],
  analogy: "Analogy: One-hot encoding is like a hotel key card system — each room has its own dedicated key. Only one key (bit) is active at a time. This makes checking 'which room are we in?' extremely fast but uses more keys overall.",
  codeTitle: "One-Hot Encoded FSM with SAFE attribute and illegal state recovery",
  codeStyle: "Behavioral",
  testbench: false,
  code: [
    "-- Day 22: One-Hot FSM with SAFE State Recovery",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "",
    "entity SafeFSM is",
    "    Port (",
    "        clk, rst, X : in  STD_LOGIC;",
    "        Y           : out STD_LOGIC",
    "    );",
    "end SafeFSM;",
    "",
    "architecture OneHot of SafeFSM is",
    "",
    "    -- One-hot state type: 4 states, 4 bits, only one bit HIGH",
    "    type State_T is (IDLE, STATE_A, STATE_B, DONE);",
    "    signal state, next_s : State_T;",
    "",
    "    -- Synthesis attributes for Xilinx Vivado",
    "    attribute fsm_encoding : string;",
    "    attribute fsm_encoding of state : signal is \"one_hot\";",
    "",
    "    -- Safe attribute: if FSM reaches illegal state, reset to IDLE",
    "    attribute fsm_safe_state : string;",
    "    attribute fsm_safe_state of state : signal is \"reset_state\";",
    "",
    "begin",
    "    -- State register",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then state <= IDLE;",
    "        elsif rising_edge(clk) then state <= next_s;",
    "        end if;",
    "    end process;",
    "",
    "    -- Next state logic",
    "    process(state, X)",
    "    begin",
    "        next_s <= IDLE;  -- Safe default",
    "        case state is",
    "            when IDLE    => if X='1' then next_s<=STATE_A; else next_s<=IDLE; end if;",
    "            when STATE_A => if X='0' then next_s<=STATE_B; else next_s<=STATE_A; end if;",
    "            when STATE_B => if X='1' then next_s<=DONE;    else next_s<=IDLE; end if;",
    "            when DONE    => next_s <= IDLE;",
    "            when others  => next_s <= IDLE;  -- Illegal state recovery",
    "        end case;",
    "    end process;",
    "",
    "    Y <= '1' when state = DONE else '0';",
    "",
    "end OneHot;",
  ],
  simOutput: "Simulation shows the FSM cycling through IDLE → STATE_A → STATE_B → DONE with appropriate X inputs. If an illegal one-hot state were injected (only possible in advanced simulation), the 'when others' clause routes back to IDLE, making the FSM self-recovering.",
  questions: {
    conceptual: "For an FSM with 8 states, compare the number of flip-flops needed for binary encoding vs one-hot encoding. Under what FPGA conditions does one-hot use less area despite more flip-flops?",
    coding: "Implement a 3-state FSM using explicit one-hot signals (state as STD_LOGIC_VECTOR(2 downto 0)) and decode each state with bit-position checking instead of enumeration CASE.",
    mcq: {
      q: "An FSM has 6 states. Using one-hot encoding, how many flip-flops are required?",
      opts: ["(A) 3", "(B) 4", "(C) 6", "(D) 8"],
      ans: "(C) 6 — one-hot encoding requires exactly N flip-flops for N states (one bit per state)"
    }
  },
  tips: [
    "The 'next_s <= IDLE' default assignment at the top of the next-state process prevents latch inference even if CASE is incomplete.",
    "Vivado's FSM extraction automatically detects enumeration-type state machines. Check the synthesis report to confirm your FSM was recognized.",
    "One-hot FSMs are faster because state decoding requires checking only ONE bit. Binary encoding requires all bits to be checked.",
    "For safety-critical applications (aerospace, medical), always add 'when others => next_state <= RESET_STATE' to handle radiation-induced bit flips."
  ]
},

{
  day: 23, weekColor: COLORS.week4,
  title: "VHDL Generic and Package: Writing Reusable and Parameterizable VHDL Code",
  seoKeyword: "VHDL generic package reusable parameterizable",
  overview: "Real-world VHDL code is parameterizable. GENERICs allow you to write one component that works for 8-bit, 16-bit, or 32-bit data. PACKAGEs organize reusable constants, types, and functions. This is how professional RTL engineers write code.",
  theory: [
    "GENERIC declaration in entity: passing parameters to components",
    "GENERIC MAP in component instantiation",
    "Creating a PACKAGE: type definitions, constant declarations, function prototypes",
    "Package BODY: where function implementations go",
    "USE clause to include packages: library.package.all",
    "Parameterized adder, MUX, counter examples",
    "Overloading functions in packages: multiple implementations for different types"
  ],
  keyDefs: ["GENERIC", "GENERIC MAP", "PACKAGE", "PACKAGE BODY", "Function Overloading", "Parameterization", "USE Clause"],
  analogy: "Analogy: GENERIC is like a clothing manufacturer's pattern — one pattern with a SIZE parameter produces S, M, L, XL garments. PACKAGE is like the manufacturing company's style guide — shared rules and standards used across all product lines.",
  codeTitle: "Parameterized N-bit Adder using GENERIC and utility PACKAGE",
  codeStyle: "Behavioral + Structural",
  testbench: false,
  code: [
    "-- Day 23: GENERIC and PACKAGE",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "-- ── PACKAGE with shared types and functions ───────────────────",
    "package MyUtils is",
    "    constant BUS_WIDTH : integer := 8;  -- Global constant",
    "    function log2ceil(n: integer) return integer;  -- Function prototype",
    "end package MyUtils;",
    "",
    "package body MyUtils is",
    "    function log2ceil(n: integer) return integer is",
    "        variable result : integer := 0;",
    "        variable temp   : integer := 1;",
    "    begin",
    "        while temp < n loop",
    "            result := result + 1;",
    "            temp   := temp * 2;",
    "        end loop;",
    "        return result;",
    "    end function;",
    "end package body MyUtils;",
    "",
    "-- ── N-bit Parameterized Adder using GENERIC ───────────────────",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity NbitAdder is",
    "    generic (",
    "        N : integer := 8   -- Default 8-bit, overridable",
    "    );",
    "    Port (",
    "        A, B : in  STD_LOGIC_VECTOR(N-1 downto 0);",
    "        Cin  : in  STD_LOGIC;",
    "        Sum  : out STD_LOGIC_VECTOR(N-1 downto 0);",
    "        Cout : out STD_LOGIC",
    "    );",
    "end NbitAdder;",
    "",
    "architecture Behavioral of NbitAdder is",
    "    signal result : UNSIGNED(N downto 0);",
    "begin",
    "    result <= ('0' & UNSIGNED(A)) + ('0' & UNSIGNED(B)) + (\"\" & Cin);",
    "    Sum  <= STD_LOGIC_VECTOR(result(N-1 downto 0));",
    "    Cout <= result(N);",
    "end Behavioral;",
    "",
    "-- ── Instantiating as 16-bit and 32-bit adders ─────────────────",
    "-- In a top-level architecture:",
    "-- ADD16: NbitAdder generic map(N=>16) port map(A16,B16,...);",
    "-- ADD32: NbitAdder generic map(N=>32) port map(A32,B32,...);",
  ],
  simOutput: "8-bit version (default): A=0xFF, B=0x01, Cin=0 → Sum=0x00, Cout=1. 16-bit version: A=0xFFFF, B=0x0001, Cin=0 → Sum=0x0000, Cout=1. Same RTL code, different generic parameter — no copy-paste required.",
  questions: {
    conceptual: "If a component has GENERIC N with a default value of 4, and you instantiate it without a GENERIC MAP, what value does N take?",
    coding: "Write a parameterized N-bit shift register using GENERIC. Instantiate it as a 4-bit and 8-bit shift register in a top-level architecture.",
    mcq: {
      q: "In VHDL, the GENERIC MAP clause in a component instantiation is used to:",
      opts: ["(A) Map port names to signals", "(B) Pass parameter values to the component", "(C) Declare internal signals", "(D) Specify the clock frequency"],
      ans: "(B) GENERIC MAP passes parameter values; PORT MAP maps ports to signals"
    }
  },
  tips: [
    "Always provide default values for GENERIC parameters — this allows the component to be used without specifying generics.",
    "Packages should be compiled before the entities that use them. In ModelSim, compile the package first.",
    "Use 'work.MyUtils.all' to access your custom package (the 'work' library is where your local files go).",
    "GENERIC parameters cannot change at runtime — they are static, compile-time constants that parameterize the hardware structure."
  ]
},

{
  day: 24, weekColor: COLORS.week4,
  title: "VHDL Functions, Procedures and Subprograms: Code Reuse Techniques",
  seoKeyword: "VHDL functions procedures subprograms",
  overview: "Functions and procedures in VHDL allow you to write reusable logic blocks — similar to functions in C but mapped to hardware. This article covers when to use each and how they differ in terms of hardware implications.",
  theory: [
    "FUNCTION: takes inputs, returns one value, cannot have wait statements",
    "PROCEDURE: takes inputs/outputs, can modify multiple signals, can have wait",
    "Where to declare: in architecture declarative region or in a package",
    "Synthesis rules: functions map to combinational logic, procedures can be sequential",
    "Overloaded operators: defining custom '+' for your data type",
    "Recursive functions: VHDL supports recursion (with synthesis limits)",
    "Impure functions vs pure functions: reading global signals"
  ],
  keyDefs: ["Function", "Procedure", "Subprogram", "Overloaded Operator", "Pure Function", "Impure Function", "Recursion"],
  analogy: "Analogy: A VHDL function is like a calculator — you put in numbers, it returns one answer, and nothing else changes. A procedure is like a bank teller — you hand over inputs, they can modify multiple accounts (outputs) and take variable time.",
  codeTitle: "Utility functions: parity checker, bit reversal, and priority encoder as functions",
  codeStyle: "Behavioral",
  testbench: false,
  code: [
    "-- Day 24: Functions and Procedures in VHDL",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "package VHDLUtils is",
    "    -- Parity function: returns even parity bit",
    "    function calc_parity(data: STD_LOGIC_VECTOR) return STD_LOGIC;",
    "",
    "    -- Bit-reversal function",
    "    function bit_reverse(data: STD_LOGIC_VECTOR) return STD_LOGIC_VECTOR;",
    "",
    "    -- Max function for unsigned numbers",
    "    function max_val(a, b: UNSIGNED) return UNSIGNED;",
    "end package;",
    "",
    "package body VHDLUtils is",
    "",
    "    -- Parity: XOR all bits using a loop variable",
    "    function calc_parity(data: STD_LOGIC_VECTOR) return STD_LOGIC is",
    "        variable p : STD_LOGIC := '0';",
    "    begin",
    "        for i in data'range loop",
    "            p := p XOR data(i);",
    "        end loop;",
    "        return p;",
    "    end function;",
    "",
    "    -- Bit reversal: reverses bit order in a vector",
    "    function bit_reverse(data: STD_LOGIC_VECTOR) return STD_LOGIC_VECTOR is",
    "        variable result : STD_LOGIC_VECTOR(data'range);",
    "    begin",
    "        for i in data'range loop",
    "            result(data'high - i + data'low) := data(i);",
    "        end loop;",
    "        return result;",
    "    end function;",
    "",
    "    -- Max of two unsigned numbers",
    "    function max_val(a, b: UNSIGNED) return UNSIGNED is",
    "    begin",
    "        if a > b then return a; else return b; end if;",
    "    end function;",
    "",
    "end package body;",
    "",
    "-- Using the package in a design:",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use work.VHDLUtils.all;  -- Access our custom package",
    "",
    "entity FunctionDemo is",
    "    Port(",
    "        DataIn  : in  STD_LOGIC_VECTOR(7 downto 0);",
    "        Parity  : out STD_LOGIC;",
    "        Reverse : out STD_LOGIC_VECTOR(7 downto 0)",
    "    );",
    "end FunctionDemo;",
    "architecture RTL of FunctionDemo is",
    "begin",
    "    Parity  <= calc_parity(DataIn);",
    "    Reverse <= bit_reverse(DataIn);",
    "end RTL;",
  ],
  simOutput: "DataIn=10110010: calc_parity returns '1' (odd number of ones, even parity bit = 1). bit_reverse(10110010) returns 01001101 (bits reversed). Both functions infer combinational logic — no clock required.",
  questions: {
    conceptual: "Can a VHDL function contain a 'wait' statement? If not, why, and what does this imply about its hardware mapping?",
    coding: "Write a VHDL function 'count_ones' that takes a STD_LOGIC_VECTOR of any size and returns the count of '1' bits as an INTEGER.",
    mcq: {
      q: "A VHDL function always synthesizes to:",
      opts: ["(A) Sequential logic with flip-flops", "(B) Combinational logic", "(C) State machine logic", "(D) ROM lookup table only"],
      ans: "(B) Functions (without wait statements) always map to combinational logic"
    }
  },
  tips: [
    "Use 'data'range' instead of hardcoded indices in functions — this makes functions work with any vector size.",
    "Functions cannot drive signals directly — they return a value. To drive multiple outputs, use a procedure.",
    "In a package body, variables declared inside functions are local to each function call — they behave like normal software variables.",
    "Recursive functions ARE synthesizable if the recursion depth is bounded at compile time — synthesis tools unroll the recursion."
  ]
},

{
  day: 25, weekColor: COLORS.week4,
  title: "VHDL UART Transmitter Design: Complete Serial Communication Project",
  seoKeyword: "VHDL UART transmitter serial communication",
  overview: "UART is the most common serial interface in embedded systems. Designing a UART transmitter in VHDL combines everything learned so far: FSMs, counters, shift registers, and clock dividers.",
  theory: [
    "UART protocol: baud rate, start bit, data bits, stop bit, parity (optional)",
    "Baud rate generation: clock divider from system clock to UART clock",
    "UART transmitter FSM states: IDLE, START, DATA, STOP",
    "Bit counter: tracking which bit is being transmitted",
    "Shift register for parallel-to-serial conversion",
    "UART receiver design overview (for completeness)",
    "Testing UART with ModelSim and connecting to Arduino/PC"
  ],
  keyDefs: ["UART", "Baud Rate", "Start Bit", "Stop Bit", "Baud Rate Generator", "Shift Register", "Serial Interface"],
  analogy: "Analogy: UART is like a telegraph operator sending Morse code — one dot/dash (bit) at a time, at a fixed speed (baud rate), with agreed start and stop signals (start/stop bits) framing each letter (byte).",
  codeTitle: "UART Transmitter FSM — complete 8N1 UART TX with baud rate generator",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 25: UART Transmitter (8N1: 8 data bits, No parity, 1 stop bit)",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity UART_TX is",
    "    generic(",
    "        CLK_FREQ  : integer := 50_000_000;  -- 50 MHz system clock",
    "        BAUD_RATE : integer := 9600          -- Target baud rate",
    "    );",
    "    Port(",",
    "        clk      : in  STD_LOGIC;",
    "        rst      : in  STD_LOGIC;",
    "        tx_start : in  STD_LOGIC;   -- Start transmission",
    "        tx_data  : in  STD_LOGIC_VECTOR(7 downto 0);",
    "        tx_out   : out STD_LOGIC;   -- Serial output line",
    "        tx_busy  : out STD_LOGIC    -- '1' while transmitting",
    "    );",
    "end UART_TX;",
    "",
    "architecture Behavioral of UART_TX is",
    "",
    "    -- Baud rate divider calculation",
    "    constant BAUD_DIV : integer := CLK_FREQ / BAUD_RATE;",
    "",
    "    type TX_State is (TX_IDLE, TX_START, TX_DATA, TX_STOP);",
    "    signal state    : TX_State := TX_IDLE;",
    "    signal baud_cnt : integer range 0 to BAUD_DIV := 0;",
    "    signal bit_cnt  : integer range 0 to 7 := 0;",
    "    signal shift_reg: STD_LOGIC_VECTOR(7 downto 0);",
    "    signal baud_tick: STD_LOGIC;",
    "",
    "begin",
    "    -- Baud rate tick generator",
    "    baud_tick <= '1' when baud_cnt = BAUD_DIV-1 else '0';",
    "",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then",
    "            state <= TX_IDLE; baud_cnt <= 0; bit_cnt <= 0;",
    "            tx_out <= '1';   -- Idle line = HIGH",
    "        elsif rising_edge(clk) then",
    "            -- Baud counter",
    "            if baud_cnt = BAUD_DIV-1 then baud_cnt <= 0;",
    "            else baud_cnt <= baud_cnt + 1; end if;",
    "",
    "            case state is",
    "                when TX_IDLE =>",
    "                    tx_out <= '1';  -- Line idle HIGH",
    "                    if tx_start = '1' then",
    "                        shift_reg <= tx_data;",
    "                        state <= TX_START;",
    "                        baud_cnt <= 0;",
    "                    end if;",
    "",
    "                when TX_START =>",
    "                    tx_out <= '0';  -- Start bit LOW",
    "                    if baud_tick = '1' then",
    "                        state <= TX_DATA; bit_cnt <= 0;",
    "                    end if;",
    "",
    "                when TX_DATA =>",
    "                    tx_out <= shift_reg(0);  -- LSB first",
    "                    if baud_tick = '1' then",
    "                        shift_reg <= '0' & shift_reg(7 downto 1); -- Shift right",
    "                        if bit_cnt = 7 then state <= TX_STOP;",
    "                        else bit_cnt <= bit_cnt + 1; end if;",
    "                    end if;",
    "",
    "                when TX_STOP =>",
    "                    tx_out <= '1';  -- Stop bit HIGH",
    "                    if baud_tick = '1' then state <= TX_IDLE; end if;",
    "            end case;",
    "        end if;",
    "    end process;",
    "",
    "    tx_busy <= '0' when state = TX_IDLE else '1';",
    "",
    "end Behavioral;",
  ],
  simOutput: "tx_start='1' triggers transmission. tx_out shows: idle(1) → start_bit(0) → 8 data bits LSB first → stop_bit(1) → idle(1). Full frame lasts approximately (1/baud_rate) × 10 bit periods. tx_busy='1' throughout transmission.",
  questions: {
    conceptual: "The UART transmitter uses BAUD_DIV = CLK_FREQ / BAUD_RATE. For CLK_FREQ=100MHz and BAUD_RATE=115200, calculate BAUD_DIV and explain the fractional error this introduces.",
    coding: "Add a parity bit to the UART transmitter: insert an additional TX_PARITY state between TX_DATA and TX_STOP that transmits the even parity of tx_data.",
    mcq: {
      q: "In UART 8N1 format, how many total bits are transmitted per data byte?",
      opts: ["(A) 8", "(B) 9", "(C) 10", "(D) 11"],
      ans: "(C) 10 — 1 start bit + 8 data bits + 1 stop bit = 10 bits total"
    }
  },
  tips: [
    "The baud rate divider introduces small errors due to integer division. For precision, use fractional baud rate generators or choose system clock frequencies that divide evenly.",
    "UART idle line is HIGH ('1'). The start bit is always LOW ('0') — this transition alerts the receiver. Never forget this.",
    "The tx_start signal should be a single-cycle pulse, not a sustained signal — otherwise the UART will try to restart every clock cycle.",
    "Test with small BAUD_DIV values in simulation (e.g., BAUD_DIV=10) to avoid running millions of simulation cycles."
  ]
},

{
  day: 26, weekColor: COLORS.week4,
  title: "VHDL for FPGA: Xilinx Vivado and Intel Quartus Workflow Guide",
  seoKeyword: "VHDL FPGA Xilinx Vivado Intel Quartus tutorial",
  overview: "Understanding VHDL synthesis on real FPGAs is the bridge between simulation and hardware. This article walks through the complete FPGA design flow from VHDL code to running hardware on a Basys 3 or DE10-Lite board.",
  theory: [
    "FPGA architecture: LUTs, flip-flops, BRAMs, DSP slices, I/O blocks",
    "Synthesis: converting VHDL to netlist of FPGA primitives",
    "Implementation: placement and routing on specific FPGA fabric",
    "Constraints file (.xdc / .sdc): pin assignments and timing constraints",
    "Bitstream generation and JTAG programming",
    "Timing analysis: setup/hold slack and what it means",
    "FPGA debugging: Integrated Logic Analyzer (ILA) / SignalTap"
  ],
  keyDefs: ["LUT (Look-Up Table)", "Synthesis", "Implementation", "Constraints File XDC", "Bitstream", "Timing Slack", "ILA"],
  analogy: "Analogy: FPGA synthesis is like converting your architectural blueprint into a construction plan for a specific pre-fabricated modular building system — you must fit your design into the existing grid of modules (LUTs, flip-flops) and connect them with wires according to the building's fixed wire channels.",
  codeTitle: "LED Blink design with proper XDC constraints for Basys 3 FPGA board",
  codeStyle: "Behavioral",
  testbench: false,
  code: [
    "-- Day 26: LED Blink for Basys 3 FPGA (Xilinx)",
    "-- System clock: 100 MHz. Blink rate: 1 Hz (LED toggles every 0.5s)",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity LED_Blink is",
    "    Port (",
    "        clk : in  STD_LOGIC;  -- 100 MHz from Basys3 oscillator",
    "        LED : out STD_LOGIC   -- Connected to LD0",
    "    );",
    "end LED_Blink;",
    "",
    "architecture Behavioral of LED_Blink is",
    "    -- 50,000,000 cycles = 0.5 seconds at 100 MHz",
    "    constant HALF_PERIOD : integer := 50_000_000;",
    "    signal counter : integer range 0 to HALF_PERIOD := 0;",
    "    signal led_reg : STD_LOGIC := '0';",
    "begin",
    "    process(clk)",
    "    begin",
    "        if rising_edge(clk) then",
    "            if counter = HALF_PERIOD - 1 then",
    "                counter <= 0;",
    "                led_reg <= NOT led_reg;  -- Toggle LED",
    "            else",
    "                counter <= counter + 1;",
    "            end if;",
    "        end if;",
    "    end process;",
    "    LED <= led_reg;",
    "end Behavioral;",
    "",
    "-- ── XDC Constraints File (save as LED_Blink.xdc) ─────────────",
    "-- ## Clock signal (Basys 3: 100 MHz on W5)",
    "-- set_property PACKAGE_PIN W5 [get_ports clk]",
    "-- set_property IOSTANDARD LVCMOS33 [get_ports clk]",
    "-- create_clock -add -name sys_clk_pin -period 10.00 [get_ports clk]",
    "",
    "-- ## LED (Basys 3: LD0 on U16)",
    "-- set_property PACKAGE_PIN U16 [get_ports LED]",
    "-- set_property IOSTANDARD LVCMOS33 [get_ports LED]",
  ],
  simOutput: "In simulation (with HALF_PERIOD scaled down to 10 for speed): LED toggles every 10 clock cycles, producing a square wave. On actual Basys 3 FPGA: LED blinks at 1 Hz — visible to the naked eye. Synthesis report shows: 1 FDRE (flip-flop), LUT6, and BUFG (clock buffer) primitives used.",
  questions: {
    conceptual: "What is timing slack in FPGA implementation? If a design has negative setup slack (-2ns), what does this mean and how do you fix it?",
    coding: "Modify the LED blink design to make 4 LEDs blink at different frequencies: LD0 at 1Hz, LD1 at 2Hz, LD2 at 4Hz, LD3 at 8Hz.",
    mcq: {
      q: "In Xilinx Vivado, a '.xdc' file is used for:",
      opts: ["(A) VHDL synthesis", "(B) Simulation testbenches", "(C) Pin assignment and timing constraints", "(D) Bitstream configuration"],
      ans: "(C) XDC (Xilinx Design Constraints) files specify pin locations, I/O standards, and timing constraints"
    }
  },
  tips: [
    "The underscore in integer literals (50_000_000) is ignored by VHDL but makes large numbers readable. Use it always.",
    "On Basys 3, the clock is 100 MHz (10ns period). On DE10-Lite (Intel), it is 50 MHz. Always check your board's documentation.",
    "Synthesis warnings about 'inferred latches' or 'combinational loops' are serious — fix them before attempting FPGA implementation.",
    "Always run timing analysis after implementation. A design that simulates correctly can still fail on FPGA if timing constraints are not met."
  ]
},

{
  day: 27, weekColor: COLORS.week4,
  title: "VHDL SPI Protocol Implementation: Master Controller Design",
  seoKeyword: "VHDL SPI master controller protocol",
  overview: "SPI (Serial Peripheral Interface) is used to communicate with sensors, ADCs, DACs, and displays. Building an SPI master in VHDL demonstrates real-world protocol handling and is a common interview/project topic.",
  theory: [
    "SPI protocol: SCLK, MOSI, MISO, CS/SS — four-wire interface",
    "SPI modes: CPOL and CPHA determine clock polarity and phase",
    "SPI Mode 0 (CPOL=0, CPHA=0): most common — data sampled on rising edge",
    "SPI master vs slave: master generates clock and chip-select",
    "Transaction format: CS goes LOW, 8 clocks of SCLK, CS goes HIGH",
    "Full-duplex operation: data simultaneously sent and received",
    "Connecting to real devices: ADC128S022, MAX7219 LED driver"
  ],
  keyDefs: ["SPI", "SCLK", "MOSI", "MISO", "CS/SS", "CPOL", "CPHA", "Full-Duplex"],
  analogy: "Analogy: SPI is like a teacher conducting an oral exam — the teacher (master) controls the pace with a metronome (SCLK), asks questions (MOSI), listens for answers (MISO), and the student only responds when called upon (CS=LOW).",
  codeTitle: "SPI Master Controller — Mode 0, 8-bit transaction, with FSM",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 27: SPI Master Controller (Mode 0: CPOL=0, CPHA=0)",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity SPI_Master is",
    "    generic(CLK_DIV : integer := 4);  -- SCLK = sys_clk / (2*CLK_DIV)",
    "    Port(",
    "        clk      : in  STD_LOGIC;",
    "        rst      : in  STD_LOGIC;",
    "        start    : in  STD_LOGIC;",
    "        tx_data  : in  STD_LOGIC_VECTOR(7 downto 0);",
    "        rx_data  : out STD_LOGIC_VECTOR(7 downto 0);",
    "        done     : out STD_LOGIC;",
    "        sclk     : out STD_LOGIC;",
    "        mosi     : out STD_LOGIC;",
    "        miso     : in  STD_LOGIC;",
    "        cs_n     : out STD_LOGIC   -- Active LOW chip select",
    "    );",
    "end SPI_Master;",
    "",
    "architecture Behavioral of SPI_Master is",
    "    type SPI_State is (IDLE, TRANSFER, FINISH);",
    "    signal state    : SPI_State := IDLE;",
    "    signal clk_div  : integer range 0 to CLK_DIV := 0;",
    "    signal sclk_int : STD_LOGIC := '0';",
    "    signal bit_cnt  : integer range 0 to 8 := 0;",
    "    signal shift_tx : STD_LOGIC_VECTOR(7 downto 0);",
    "    signal shift_rx : STD_LOGIC_VECTOR(7 downto 0);",
    "    signal sclk_rise: STD_LOGIC;",
    "begin",
    "",
    "    sclk_rise <= '1' when (clk_div = CLK_DIV-1 and sclk_int = '0') else '0';",
    "",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then",
    "            state <= IDLE; cs_n <= '1'; sclk_int <= '0';",
    "            done <= '0'; bit_cnt <= 0; clk_div <= 0;",
    "        elsif rising_edge(clk) then",
    "            done <= '0';",
    "            -- Clock divider for SCLK",
    "            if clk_div = CLK_DIV-1 then",
    "                clk_div <= 0;",
    "                if state = TRANSFER then sclk_int <= NOT sclk_int; end if;",
    "            else clk_div <= clk_div + 1; end if;",
    "",
    "            case state is",
    "                when IDLE =>",
    "                    cs_n <= '1'; sclk_int <= '0';",
    "                    if start = '1' then",
    "                        shift_tx <= tx_data; bit_cnt <= 0;",
    "                        cs_n <= '0'; state <= TRANSFER;",
    "                    end if;",
    "                when TRANSFER =>",
    "                    -- Sample MISO on rising SCLK edge",
    "                    if sclk_rise = '1' then",
    "                        shift_rx <= shift_rx(6 downto 0) & miso;",
    "                        shift_tx <= shift_tx(6 downto 0) & '0';",
    "                        if bit_cnt = 7 then state <= FINISH;",
    "                        else bit_cnt <= bit_cnt + 1; end if;",
    "                    end if;",
    "                when FINISH =>",
    "                    cs_n <= '1'; sclk_int <= '0';",
    "                    done <= '1'; rx_data <= shift_rx;",
    "                    state <= IDLE;",
    "            end case;",
    "        end if;",
    "    end process;",
    "    sclk <= sclk_int;",
    "    mosi <= shift_tx(7);  -- MSB first",
    "end Behavioral;",
  ],
  simOutput: "start='1' asserts CS_N low. SCLK toggles 8 times. MOSI outputs tx_data MSB-first on each SCLK falling edge. MISO is sampled on each SCLK rising edge into shift_rx. After 8 bits, CS_N goes HIGH, done pulses '1', rx_data has the received byte.",
  questions: {
    conceptual: "Explain the difference between SPI Mode 0 (CPOL=0, CPHA=0) and SPI Mode 3 (CPOL=1, CPHA=1). In which mode does data change on the falling edge and get sampled on the rising edge?",
    coding: "Modify the SPI master to support 16-bit transfers (two bytes per transaction) by changing the generic bit-count and shift register widths.",
    mcq: {
      q: "In SPI communication, MOSI stands for:",
      opts: ["(A) Master Output Slave Input", "(B) Master Output Signal Interface", "(C) Multiple Output Single Input", "(D) Memory Output Serial Interface"],
      ans: "(A) MOSI = Master Output Slave Input — data flows FROM master TO slave on this line"
    }
  },
  tips: [
    "SPI Mode selection (CPOL, CPHA) must match between master and slave. Check your sensor/ADC datasheet carefully — incorrect mode causes data corruption.",
    "The CS signal should go LOW before the first SCLK edge and go HIGH only after the last SCLK edge completes.",
    "For high-speed SPI (10+ MHz), clock domain crossing between the fast SPI clock and slow processing logic requires careful synchronization.",
    "India-based interview tip: SPI, UART, and I2C protocol implementations in VHDL are extremely common in VLSI company technical rounds."
  ]
},

{
  day: 28, weekColor: COLORS.week4,
  title: "VHDL ALU Design: 4-bit Arithmetic Logic Unit Complete Implementation",
  seoKeyword: "VHDL ALU design 4-bit arithmetic logic unit",
  overview: "The ALU is the computational heart of every processor. Designing a complete ALU in VHDL — supporting arithmetic and logical operations with flag outputs — is both a major project and a top interview question.",
  theory: [
    "ALU operations: ADD, SUB, AND, OR, XOR, NOT, SHL, SHR, comparison",
    "Operation encoding: 4-bit op-code for 16 operations",
    "Flag generation: Zero flag, Carry flag, Overflow flag, Negative flag",
    "Two's complement subtraction: using adder with inverted B and Cin=1",
    "Overflow detection: MSB of A, B, and result logic",
    "Multi-function ALU using WITH/SELECT on op-code",
    "ALU as the basis of processor datapath"
  ],
  keyDefs: ["ALU", "Op-Code", "Zero Flag", "Carry Flag", "Overflow Flag", "Two's Complement", "Arithmetic Shift"],
  analogy: "Analogy: An ALU is like a Swiss Army knife for numbers — it has multiple tools (operations) and you select which tool to use by pressing a button (op-code). The result and any side effects (flags) are immediately visible.",
  codeTitle: "4-bit ALU with 8 operations and 4 flag outputs",
  codeStyle: "Behavioral",
  testbench: true,
  code: [
    "-- Day 28: 4-bit ALU with Flags",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity ALU_4bit is",
    "    Port (",
    "        A, B    : in  STD_LOGIC_VECTOR(3 downto 0);",
    "        OpCode  : in  STD_LOGIC_VECTOR(2 downto 0);",
    "        Result  : out STD_LOGIC_VECTOR(3 downto 0);",
    "        Carry   : out STD_LOGIC;",
    "        Zero    : out STD_LOGIC;",
    "        Neg     : out STD_LOGIC;",
    "        Overflow: out STD_LOGIC",
    "    );",
    "end ALU_4bit;",
    "",
    "architecture Behavioral of ALU_4bit is",
    "    signal res5 : STD_LOGIC_VECTOR(4 downto 0);  -- 5-bit result for carry",
    "    signal res4 : STD_LOGIC_VECTOR(3 downto 0);",
    "begin",
    "    process(A, B, OpCode)",
    "        variable A5, B5 : STD_LOGIC_VECTOR(4 downto 0);",
    "    begin",
    "        A5 := '0' & A;",
    "        B5 := '0' & B;",
    "        case OpCode is",
    "            -- Arithmetic",
    "            when \"000\" => res5 <= STD_LOGIC_VECTOR(UNSIGNED(A5)+UNSIGNED(B5));  -- ADD",
    "            when \"001\" => res5 <= STD_LOGIC_VECTOR(UNSIGNED(A5)-UNSIGNED(B5));  -- SUB",
    "            when \"010\" => res5 <= STD_LOGIC_VECTOR(UNSIGNED(A5)+1);             -- INC",
    "            when \"011\" => res5 <= STD_LOGIC_VECTOR(UNSIGNED(A5)-1);             -- DEC",
    "            -- Logical",
    "            when \"100\" => res5 <= '0' & (A AND B);",
    "            when \"101\" => res5 <= '0' & (A OR  B);",
    "            when \"110\" => res5 <= '0' & (A XOR B);",
    "            when \"111\" => res5 <= '0' & (NOT A);",
    "            when others=> res5 <= (others => '0');",
    "        end case;",
    "    end process;",
    "",
    "    res4     <= res5(3 downto 0);",
    "    Result   <= res4;",
    "    Carry    <= res5(4);",
    "    Zero     <= '1' when res4 = \"0000\" else '0';",
    "    Neg      <= res4(3);  -- MSB = sign bit in two's complement",
    "    Overflow <= (NOT A(3) AND NOT B(3) AND res4(3)) OR",
    "                (    A(3) AND     B(3) AND NOT res4(3));",
    "end Behavioral;",
  ],
  simOutput: "ADD: A=0101(5), B=0011(3) → Result=1000(8), Carry=0, Zero=0. SUB: A=0011(3), B=0101(5) → Result=1110(-2 in 2's complement), Neg=1. AND: A=1010, B=1100 → Result=1000. Zero flag asserts when any operation produces 0000.",
  questions: {
    conceptual: "Explain the overflow detection logic in the ALU code. For what input combination does overflow occur in 4-bit signed addition?",
    coding: "Add a PASS_A (pass A directly to output) and PASS_B operation to the ALU by extending the OpCode to 4 bits, supporting 16 total operations.",
    mcq: {
      q: "In a 4-bit ALU performing signed addition of 0111 (7) + 0001 (1), the overflow flag is:",
      opts: ["(A) 0", "(B) 1", "(C) X", "(D) Z"],
      ans: "(B) 1 — 7+1=8, but in 4-bit signed, 8 cannot be represented (range -8 to +7); overflow occurred"
    }
  },
  tips: [
    "The 5-bit extended result (A5, B5) trick captures the carry bit cleanly — bit 4 of the 5-bit result is the carry out.",
    "Overflow is different from carry. Carry is for unsigned arithmetic; overflow is for signed. You need separate logic for each.",
    "SUB(A, B) can be implemented as ADD(A, NOT_B, Cin=1) using two's complement — this saves hardware in real processors.",
    "The Zero flag is a NOR of all result bits — if any bit is '1', Zero is '0'. This is how processor condition codes work."
  ]
},

{
  day: 29, weekColor: COLORS.week4,
  title: "VHDL GATE Exam Preparation: Top 20 VHDL Questions with Answers",
  seoKeyword: "VHDL GATE exam questions answers ECE",
  overview: "Day 29 is dedicated to GATE and university exam preparation. This article compiles the most-tested VHDL concepts with past-pattern questions, code tracing exercises, and the key theoretical distinctions that examiners love to test.",
  theory: [
    "VHDL semantics traps: signal vs variable, sensitivity list completeness",
    "Latch inference: when it occurs and how to prevent it",
    "Clock domain crossing: setup/hold violations and synchronizers",
    "VHDL operator precedence complete table: memorize the NOT vs AND/OR issue",
    "Test: can you trace this VHDL code and predict the waveform output?",
    "State machine analysis questions: state diagrams, state tables",
    "FPGA resource estimation: LUT count for common circuits"
  ],
  keyDefs: ["Latch Inference", "Sensitivity List", "Clock Domain Crossing", "Inertial Delay", "Transport Delay", "Delta Cycle", "Metastability"],
  analogy: "Analogy: GATE preparation is like rehearsing for a performance — you need to know your lines (theory), react instantly to questions (MCQs), and perform smoothly under pressure (exam conditions).",
  codeTitle: "Code tracing exercises: predict the output of each VHDL snippet",
  codeStyle: "Mixed — for analysis",
  testbench: false,
  code: [
    "-- Day 29: GATE Prep -- Code Tracing Exercises",
    "",
    "-- QUESTION 1: What does Q hold after 3 clock cycles?",
    "-- (D='1' throughout, rst='0')",
    "process(clk)",
    "    variable v : STD_LOGIC := '0';",
    "begin",
    "    if rising_edge(clk) then",
    "        v := D;      -- Variable: immediate",
    "        Q <= v;      -- Q = new value of v = D = '1' after cycle 1",
    "    end if;",
    "end process;",
    "-- Answer: Q='1' from cycle 1 onwards (variable updates immediately)",
    "",
    "-- QUESTION 2: Does this code infer a latch? Why?",
    "process(A, B)",
    "begin",
    "    if A = '1' then",
    "        Y <= B;",
    "    end if;  -- No ELSE clause!",
    "end process;",
    "-- Answer: YES, latch inferred. When A='0', Y holds previous value",
    "-- Fix: add 'else Y <= '0';'",
    "",
    "-- QUESTION 3: What is the final value of sig after this process?",
    "-- (All assignments in same process, before next clock edge)",
    "process(clk)",
    "begin",
    "    if rising_edge(clk) then",
    "        sig <= '0';",
    "        sig <= '1';",
    "        sig <= '0';   -- Last assignment wins for signals",
    "    end if;",
    "end process;",
    "-- Answer: sig = '0' (last assignment to a signal in a process wins)",
    "",
    "-- QUESTION 4: How many flip-flops does this synthesize to?",
    "process(clk)",
    "begin",
    "    if rising_edge(clk) then",
    "        A <= X;",
    "        B <= A;",
    "        C <= B;",
    "    end if;",
    "end process;",
    "-- Answer: 3 flip-flops (A, B, C), forming a 3-stage pipeline",
    "-- Each captures the PREVIOUS value of the feeding signal",
    "",
    "-- QUESTION 5: What style of modeling is this?",
    "Y <= (A AND B) OR (NOT A AND C);",
    "-- Answer: DATAFLOW modeling (concurrent signal assignment outside process)",
  ],
  simOutput: "These are analysis exercises — trace the code mentally or in simulation. Q1: Q='1'. Q2: Y is a latch (inferred memory). Q3: sig='0'. Q4: three-stage shift register. Q5: dataflow model of a 2-to-1 MUX (A is select).",
  questions: {
    conceptual: "Explain with an example: when two processes in the same VHDL architecture both drive the same signal, what happens during simulation and synthesis?",
    coding: "Write VHDL code that intentionally infers a latch, then fix it to infer a D flip-flop instead — showing both versions.",
    mcq: {
      q: "In VHDL simulation, a 'delta cycle' is:",
      opts: ["(A) One nanosecond delay", "(B) A zero-time iteration to resolve signal events", "(C) One clock cycle", "(D) The time for a signal to propagate through a gate"],
      ans: "(B) Delta cycles are zero-time simulation steps used to propagate concurrent signal events until stability is reached"
    }
  },
  tips: [
    "Latch inference is one of the most common GATE questions. Remember: combinational process (no clock) + incomplete if/case = latch.",
    "Signal last-assignment-wins is a fundamental VHDL semantics rule — multiple assignments in a process collapse to the LAST one.",
    "For GATE, know the exact difference: inertial delay (default, filters glitches shorter than delay) vs transport delay (passes all transitions).",
    "Review state machine questions carefully — examiners often ask about Moore vs Mealy output timing differences."
  ]
},

{
  day: 30, weekColor: COLORS.week4,
  title: "VHDL Capstone Project: 4-bit CPU Design in VHDL — Putting It All Together",
  seoKeyword: "VHDL CPU design project 4-bit processor",
  overview: "Day 30 is the capstone — combining everything from Weeks 1-4 into a simple 4-bit CPU. This article shows how ALU, registers, multiplexers, and control FSM come together to form a programmable processor. This project is ideal for college mini-projects and internship portfolios.",
  theory: [
    "CPU architecture: datapath + control unit (Harvard vs Von Neumann)",
    "4-bit CPU components: ALU, register file, instruction register, PC, multiplexers",
    "Instruction set design: 4-bit opcodes for 16 instructions (LOAD, ADD, SUB, AND, JMP, etc.)",
    "Datapath signal flow: fetch → decode → execute",
    "Control unit FSM: one state per pipeline stage",
    "Putting it together: TOP-LEVEL VHDL with structural connections",
    "Future expansion: adding more instructions, interrupts, and memory"
  ],
  keyDefs: ["CPU", "Datapath", "Control Unit", "Instruction Register", "Program Counter", "Register File", "Harvard Architecture"],
  analogy: "Analogy: A CPU is like a chef following a recipe (program) — the recipe book (memory) lists instructions, the chef's brain (control unit) decides what to do next, the cutting board (datapath) is where the actual work happens, and the chef's hands (ALU) perform the operations.",
  codeTitle: "4-bit CPU Top-Level: ALU + Register + Control FSM structural connection",
  codeStyle: "Structural + Behavioral",
  testbench: true,
  code: [
    "-- Day 30: Simple 4-bit CPU -- Top Level",
    "-- Supports: NOP, LOAD, ADD, SUB, AND, OR, OUT",
    "",
    "library IEEE;",
    "use IEEE.STD_LOGIC_1164.ALL;",
    "use IEEE.NUMERIC_STD.ALL;",
    "",
    "entity CPU_4bit is",
    "    Port(",
    "        clk, rst   : in  STD_LOGIC;",
    "        CPU_Output : out STD_LOGIC_VECTOR(3 downto 0)",
    "    );",
    "end CPU_4bit;",
    "",
    "architecture Structural of CPU_4bit is",
    "",
    "    -- ── Simple Program ROM (4-bit instructions, 16 locations) ──",
    "    type InstrMem is array(0 to 15) of STD_LOGIC_VECTOR(7 downto 0);",
    "    constant PROG : InstrMem := (",
    "        -- Format: [7:4]=Opcode, [3:0]=Operand/Data",
    "        0 => x\"10\",  -- LOAD 0000 (load 0 into accumulator)",
    "        1 => x\"20\",  -- ADD  immediate 0 (add 0)",
    "        2 => x\"11\",  -- LOAD 0001 (load value 1)",
    "        3 => x\"21\",  -- ADD  0001 (acc = acc + 1 = 2)",
    "        4 => x\"21\",  -- ADD  0001 (acc = acc + 1 = 3)",
    "        5 => x\"50\",  -- OUT  (output accumulator = 3)",
    "        6 => x\"00\",  -- NOP",
    "        others => x\"00\"",
    "    );",
    "",
    "    -- ── Signals ─────────────────────────────────────────────────",
    "    signal PC       : UNSIGNED(3 downto 0) := \"0000\";",
    "    signal IR       : STD_LOGIC_VECTOR(7 downto 0);",
    "    signal ACC      : STD_LOGIC_VECTOR(3 downto 0) := \"0000\";",
    "    signal ALU_Out  : STD_LOGIC_VECTOR(3 downto 0);",
    "    signal Opcode   : STD_LOGIC_VECTOR(3 downto 0);",
    "    signal Operand  : STD_LOGIC_VECTOR(3 downto 0);",
    "",
    "    -- ── Control FSM States ───────────────────────────────────────",
    "    type CPU_State is (FETCH, DECODE, EXECUTE);",
    "    signal cpu_state : CPU_State := FETCH;",
    "",
    "begin",
    "    IR      <= PROG(to_integer(PC));",
    "    Opcode  <= IR(7 downto 4);",
    "    Operand <= IR(3 downto 0);",
    "",
    "    -- ── ALU (combinational) ──────────────────────────────────────",
    "    with Opcode select",
    "        ALU_Out <=",
    "            STD_LOGIC_VECTOR(UNSIGNED(ACC) + UNSIGNED(Operand)) when x\"2\",  -- ADD",
    "            STD_LOGIC_VECTOR(UNSIGNED(ACC) - UNSIGNED(Operand)) when x\"3\",  -- SUB",
    "            ACC AND Operand                                      when x\"4\",  -- AND",
    "            ACC                                                  when others;",
    "",
    "    -- ── CPU Control FSM ─────────────────────────────────────────",
    "    process(clk, rst)",
    "    begin",
    "        if rst = '1' then",
    "            PC <= \"0000\"; ACC <= \"0000\"; cpu_state <= FETCH;",
    "        elsif rising_edge(clk) then",
    "            case cpu_state is",
    "                when FETCH   => cpu_state <= DECODE;",
    "                when DECODE  => cpu_state <= EXECUTE;",
    "                when EXECUTE =>",
    "                    cpu_state <= FETCH;",
    "                    PC <= PC + 1;",
    "                    case Opcode is",
    "                        when x\"1\" => ACC <= Operand;   -- LOAD",
    "                        when x\"2\" => ACC <= ALU_Out;   -- ADD",
    "                        when x\"3\" => ACC <= ALU_Out;   -- SUB",
    "                        when x\"4\" => ACC <= ALU_Out;   -- AND",
    "                        when x\"5\" => CPU_Output <= ACC; -- OUT",
    "                        when others => null;              -- NOP",
    "                    end case;",
    "            end case;",
    "        end if;",
    "    end process;",
    "",
    "end Structural;",
  ],
  simOutput: "Cycle 1-3: FETCH/DECODE/EXECUTE NOP. Cycle 4-6: LOAD 0001 → ACC=0001. Cycle 7-9: ADD 0001 → ACC=0010. Cycle 10-12: ADD 0001 → ACC=0011. Cycle 13-15: OUT → CPU_Output=0011 (decimal 3). The program adds 1+1+1=3 and outputs the result.",
  questions: {
    conceptual: "The CPU designed here uses a 3-cycle pipeline (FETCH, DECODE, EXECUTE). How would you modify it to execute one instruction per cycle (single-cycle CPU)?",
    coding: "Add a JMP instruction (opcode 0x6) to the CPU: when executed, it sets PC to the operand value instead of incrementing. Modify both the control FSM and opcode decoder.",
    mcq: {
      q: "In the simple CPU designed, the Program Counter (PC) is incremented during which state?",
      opts: ["(A) FETCH", "(B) DECODE", "(C) EXECUTE", "(D) Simultaneously in all states"],
      ans: "(C) EXECUTE — PC increments after the instruction is executed, pointing to the next instruction"
    }
  },
  tips: [
    "This CPU is a starting point — real CPUs have pipelining, hazard detection, and caches. But the fundamental FETCH-DECODE-EXECUTE cycle is the same.",
    "Your Day 30 CPU project is portfolio-ready — add it to your GitHub, LinkedIn, and internship applications.",
    "Next steps after this course: study advanced topics — pipelining, cache design, AXI bus protocols, and SystemVerilog (VHDL's modern cousin).",
    "For GATE: this 30-day journey covers ~80% of the VHDL-related questions. Revise Days 1, 3, 5, 15, 18 most thoroughly — they carry the most marks."
  ]
}

];

// ─── BUILD DOCUMENT ──────────────────────────────────────────────────────────

const weekColors = [null, COLORS.week1, COLORS.week2, COLORS.week3, COLORS.week4];
const weekTitles = [null,
  "WEEK 1 (Days 1–7): Absolute Basics — Syntax, Structure, Data Types & First Programs",
  "WEEK 2 (Days 8–14): Combinational Circuits — Gates, Adders, MUX, Encoders, Decoders",
  "WEEK 3 (Days 15–21): Sequential Circuits — Flip-Flops, Registers, Counters, FSM",
  "WEEK 4 (Days 22–30): Advanced Topics — FSM, Memory, FPGA, Protocols & Project"
];

function getWeek(day) {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

const children = [];

// ── COVER PAGE ──────────────────────────────────────────────────────────────
children.push(
  new Paragraph({ spacing: { before: 1440 }, children: [] }),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: noBorders,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
        margins: { top: 480, bottom: 480, left: 480, right: 480 },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "VHDL MASTERY", bold: true, font: "Arial", size: 64, color: COLORS.white })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "30-Day Complete Study Plan", bold: true, font: "Arial", size: 40, color: "D6E4F0" })] }),
          new Paragraph({ spacing: { before: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Beginner to Advanced", font: "Arial", size: 28, color: "A0C4E8" })] }),
          new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "For ECE/EEE Students in India", font: "Arial", size: 24, color: "A0C4E8" })] }),
        ]
      })]
    })]
  }),
  new Paragraph({ spacing: { before: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Covering: GATE Preparation  |  FPGA Design  |  Digital Circuits  |  Projects", font: "Arial", size: 20, color: COLORS.secondary })] }),
  new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Week 1: Basics  |  Week 2: Combinational  |  Week 3: Sequential  |  Week 4: Advanced", font: "Arial", size: 18, color: COLORS.primary })] }),
  pageBreak()
);

// ── INTRO ───────────────────────────────────────────────────────────────────
children.push(
  heading1("How to Use This Study Plan"),
  para("This 30-day guide is designed for ECE/EEE students in India who want to master VHDL from scratch. Each day corresponds to a blog article that you can write or study from. The content progresses systematically from syntax basics to building a working 4-bit CPU."),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [
      new TableRow({ children: [
        new TableCell({ borders, width:{size:2340,type:WidthType.DXA}, shading:{fill:COLORS.week1,type:ShadingType.CLEAR}, margins:{top:80,bottom:80,left:120,right:120}, children: [new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"WEEK 1",bold:true,font:"Arial",size:20,color:COLORS.white})]}) ]}),
        new TableCell({ borders, width:{size:2340,type:WidthType.DXA}, shading:{fill:COLORS.week2,type:ShadingType.CLEAR}, margins:{top:80,bottom:80,left:120,right:120}, children: [new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"WEEK 2",bold:true,font:"Arial",size:20,color:COLORS.white})]}) ]}),
        new TableCell({ borders, width:{size:2340,type:WidthType.DXA}, shading:{fill:COLORS.week3,type:ShadingType.CLEAR}, margins:{top:80,bottom:80,left:120,right:120}, children: [new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"WEEK 3",bold:true,font:"Arial",size:20,color:COLORS.white})]}) ]}),
        new TableCell({ borders, width:{size:2340,type:WidthType.DXA}, shading:{fill:COLORS.week4,type:ShadingType.CLEAR}, margins:{top:80,bottom:80,left:120,right:120}, children: [new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"WEEK 4",bold:true,font:"Arial",size:20,color:COLORS.white})]}) ]}),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders, width:{size:2340,type:WidthType.DXA}, margins:{top:80,bottom:80,left:120,right:120}, children: [new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"Days 1–7\nAbsolute Basics",font:"Arial",size:18,color:COLORS.darkText})]}) ]}),
        new TableCell({ borders, width:{size:2340,type:WidthType.DXA}, margins:{top:80,bottom:80,left:120,right:120}, children: [new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"Days 8–14\nCombinational",font:"Arial",size:18,color:COLORS.darkText})]}) ]}),
        new TableCell({ borders, width:{size:2340,type:WidthType.DXA}, margins:{top:80,bottom:80,left:120,right:120}, children: [new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"Days 15–21\nSequential",font:"Arial",size:18,color:COLORS.darkText})]}) ]}),
        new TableCell({ borders, width:{size:2340,type:WidthType.DXA}, margins:{top:80,bottom:80,left:120,right:120}, children: [new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"Days 22–30\nAdvanced",font:"Arial",size:18,color:COLORS.darkText})]}) ]}),
      ]}),
    ]
  }),
  spacer(),
  pageBreak()
);

// ── DAY ENTRIES ─────────────────────────────────────────────────────────────
let currentWeek = 0;

for (const d of days) {
  const week = getWeek(d.day);
  if (week !== currentWeek) {
    currentWeek = week;
    children.push(sectionHeader(weekTitles[week], weekColors[week]), spacer());
  }

  // Day header
  children.push(dayHeader(d.day, d.title, d.weekColor), spacer());

  // SEO Note
  children.push(
    new Paragraph({ spacing:{before:40,after:20}, children:[
      new TextRun({text:"SEO Keyword: ", bold:true, font:"Arial", size:19, color:COLORS.secondary}),
      new TextRun({text:d.seoKeyword, font:"Arial", size:19, color:COLORS.darkText, italics:true})
    ]}), spacer()
  );

  // Topic Overview
  children.push(heading3("1. TOPIC OVERVIEW"));
  children.push(para(d.overview));
  children.push(spacer());

  // Theory points
  children.push(heading3("2. THEORY EXPLANATION POINTS"));
  for (const t of d.theory) children.push(bullet(t));
  children.push(spacer());

  // Key Definitions
  children.push(
    new Paragraph({ spacing:{before:60,after:40}, children:[
      new TextRun({text:"Key Definitions: ", bold:true, font:"Arial", size:20, color:COLORS.primary}),
      new TextRun({text:d.keyDefs.join("  |  "), font:"Arial", size:20, color:COLORS.darkText})
    ]})
  );
  children.push(spacer());

  // Analogy
  children.push(colorBox("Real-World Application / Analogy", d.analogy, "EAF4FF", COLORS.secondary));
  children.push(spacer());

  // VHDL Code Section
  children.push(heading3("3. VHDL CODE TO INCLUDE"));
  children.push(new Paragraph({ spacing:{before:40,after:40}, children:[
    new TextRun({text:"Code Topic: ", bold:true, font:"Arial", size:20, color:COLORS.primary}),
    new TextRun({text:d.codeTitle, font:"Arial", size:20, color:COLORS.darkText})
  ]}));
  children.push(new Paragraph({ spacing:{before:20,after:40}, children:[
    new TextRun({text:"Modeling Style: ", bold:true, font:"Arial", size:20, color:COLORS.primary}),
    new TextRun({text:d.codeStyle, font:"Arial", size:20, color:COLORS.darkText}),
    new TextRun({text:"   |   Testbench: ", bold:true, font:"Arial", size:20, color:COLORS.primary}),
    new TextRun({text:d.testbench ? "Yes" : "No", bold:true, font:"Arial", size:20, color:d.testbench ? COLORS.week1 : COLORS.accent})
  ]}));

  // Code block
  const codeTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: noBorders,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: COLORS.codeBg, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        children: d.code.map(line => new Paragraph({
          spacing:{before:18,after:18},
          children:[new TextRun({text:line, font:"Courier New", size:17, color:"1A1A6B"})]
        }))
      })]
    })]
  });
  children.push(codeTable);
  children.push(spacer());

  // Simulation output
  children.push(colorBox("Expected Simulation Output", d.simOutput, "E8F5E9", COLORS.week1));
  children.push(spacer());

  // Practice Questions
  children.push(heading3("4. PRACTICE QUESTIONS"));
  children.push(new Paragraph({ spacing:{before:40,after:20}, numbering:{reference:"numbers",level:0}, children:[
    new TextRun({text:"[Conceptual] "+d.questions.conceptual, font:"Arial", size:20, color:COLORS.darkText})
  ]}));
  children.push(new Paragraph({ spacing:{before:20,after:20}, numbering:{reference:"numbers",level:0}, children:[
    new TextRun({text:"[Code-Writing] "+d.questions.coding, font:"Arial", size:20, color:COLORS.darkText})
  ]}));
  children.push(spacer());
  children.push(mcqBox(d.questions.mcq.q, d.questions.mcq.opts, d.questions.mcq.ans));
  children.push(spacer());

  // Tips
  children.push(tipBox(d.tips));
  children.push(spacer());

  // Page break between days (except last)
  if (d.day < 30) children.push(pageBreak());
}

// ── FINAL PAGE: RESOURCES ───────────────────────────────────────────────────
children.push(pageBreak());
children.push(sectionHeader("RECOMMENDED RESOURCES & NEXT STEPS", COLORS.primary));
children.push(spacer());
children.push(heading2("Free Tools for VHDL Practice"));
children.push(bullet("ModelSim Student Edition (Mentor Graphics) — Best simulator for beginners"));
children.push(bullet("Xilinx Vivado ML Edition (Free) — Complete FPGA toolchain for Artix/Spartan/Zynq"));
children.push(bullet("Intel Quartus Prime Lite (Free) — FPGA toolchain for Cyclone/MAX series"));
children.push(bullet("EDA Playground (edaplayground.com) — Online VHDL simulator, no installation required"));
children.push(bullet("GHDL + GTKWave — Free, open-source VHDL simulation on any OS"));
children.push(spacer());
children.push(heading2("FPGA Development Boards Available in India"));
children.push(bullet("Basys 3 (Xilinx Artix-7) — ~₹6,000 | Best board for beginners, Digilent"));
children.push(bullet("Nexys A7 (Xilinx Artix-7) — ~₹12,000 | More I/O, used in colleges"));
children.push(bullet("DE10-Lite (Intel Cyclone V) — ~₹5,000 | Available from SiliconSystems India"));
children.push(bullet("Spartan-7 Mini (Xilinx) — ~₹3,500 | Budget option for FPGA practice"));
children.push(spacer());
children.push(heading2("GATE Syllabus Coverage Map"));
children.push(para("Days 1-7 cover: Digital Logic gates, Boolean algebra (GATE DA syllabus)"));
children.push(para("Days 8-14 cover: Combinational circuits — MUX, encoder, decoder, adders"));
children.push(para("Days 15-21 cover: Sequential circuits — flip-flops, counters, shift registers"));
children.push(para("Days 22-30 cover: FSM design, memory, digital design project techniques"));
children.push(spacer());
children.push(colorBox("Pro Tip for Blog Writers", "Each Day's article should be 1500-2500 words. Include the code with syntax highlighting (use Prism.js or Carbon.now.sh screenshots). Add a YouTube video link for ModelSim simulation walkthrough. Target keywords: 'VHDL [circuit name] code', 'VHDL [circuit name] with testbench'. These rank well for Indian ECE student searches.", "FFF8E1", "856404"));

// ─── ASSEMBLE AND SAVE ───────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: COLORS.primary },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: COLORS.secondary },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: COLORS.accent },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.secondary, space: 1 } },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "VHDL 30-Day Study Plan", bold: true, font: "Arial", size: 18, color: COLORS.primary }),
            new TextRun({ text: "  |  Blog Content Writing Guide for ECE/EEE Students", font: "Arial", size: 18, color: COLORS.secondary }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.secondary, space: 1 } },
          spacing: { before: 60 },
          children: [
            new TextRun({ text: "VHDL Mastery | 30-Day Plan  ", font: "Arial", size: 16, color: COLORS.secondary }),
            new TextRun({ text: "Page ", font: "Arial", size: 16, color: COLORS.darkText }),
            new PageNumber()
          ]
        })]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/VHDL_30Day_Study_Plan.docx', buffer);
  console.log('SUCCESS: VHDL_30Day_Study_Plan.docx created');
}).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
