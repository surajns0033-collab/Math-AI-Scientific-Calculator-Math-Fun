import { PhysicsFormula, UnitCategory } from "../types";

export const PHYSICAL_CONSTANTS = [
  { name: "Speed of Light (c)", symbol: "c", value: 299792458, unit: "m/s", desc: "Vacuum speed of electromagnetic radiation" },
  { name: "Gravitational Constant (G)", symbol: "G", value: 6.6743e-11, unit: "N·m²/kg²", desc: "Universal gravitation constant" },
  { name: "Standard Gravity (g)", symbol: "g", value: 9.80665, unit: "m/s²", desc: "Earth surface acceleration due to gravity" },
  { name: "Planck Constant (h)", symbol: "h", value: 6.62607015e-34, unit: "J·s", desc: "Quantum action proportionality" },
  { name: "Elementary Charge (e)", symbol: "q_e", value: 1.602176634e-19, unit: "C", desc: "Magnitude of electric charge" },
  { name: "Boltzmann Constant (k)", symbol: "k_B", value: 1.380649e-23, unit: "J/K", desc: "Relates kinetic energy to temperature" },
  { name: "Ideal Gas Constant (R)", symbol: "R", value: 8.314462, unit: "J/(mol·K)", desc: "Molar gas constant" },
  { name: "Vacuum Permittivity (ε₀)", symbol: "ε₀", value: 8.8541878128e-12, unit: "F/m", desc: "Electric constant of space" },
  { name: "Vacuum Permeability (μ₀)", symbol: "μ₀", value: 1.25663706212e-6, unit: "N/A²", desc: "Magnetic constant of space" },
  { name: "Electron Mass (m_e)", symbol: "m_e", value: 9.1093837e-31, unit: "kg", desc: "Rest mass of an electron" },
  { name: "Proton Mass (m_p)", symbol: "m_p", value: 1.67262192e-27, unit: "kg", desc: "Rest mass of a proton" },
];

export const PRESET_FORMULAS: PhysicsFormula[] = [
  // Kinematics
  {
    id: "kin-1",
    category: "Kinematics",
    name: "Final Velocity (v = v₀ + at)",
    formula: "v = v₀ + at",
    templateExpression: "v0 + a * t",
    description: "Calculates final velocity under uniform acceleration.",
    variables: [
      { name: "Initial Velocity", symbol: "v0", unit: "m/s" },
      { name: "Acceleration", symbol: "a", unit: "m/s²" },
      { name: "Time", symbol: "t", unit: "s" },
    ],
  },
  {
    id: "kin-2",
    category: "Kinematics",
    name: "Displacement (Δx = v₀t + ½at²)",
    formula: "Δx = v₀t + 0.5at²",
    templateExpression: "v0 * t + 0.5 * a * (t^2)",
    description: "Position under constant linear acceleration.",
    variables: [
      { name: "Initial Velocity", symbol: "v0", unit: "m/s" },
      { name: "Time", symbol: "t", unit: "s" },
      { name: "Acceleration", symbol: "a", unit: "m/s²" },
    ],
  },
  {
    id: "kin-3",
    category: "Kinematics",
    name: "Torricelli Equation (v² = v₀² + 2aΔx)",
    formula: "v = √(v₀² + 2aΔx)",
    templateExpression: "sqrt((v0^2) + 2 * a * dx)",
    description: "Relates velocities and displacement independent of time.",
    variables: [
      { name: "Initial Velocity", symbol: "v0", unit: "m/s" },
      { name: "Acceleration", symbol: "a", unit: "m/s²" },
      { name: "Displacement", symbol: "dx", unit: "m" },
    ],
  },

  // Dynamics & Energy
  {
    id: "dyn-1",
    category: "Dynamics & Energy",
    name: "Newton's Second Law (F = ma)",
    formula: "F = m * a",
    templateExpression: "m * a",
    description: "Net force equals mass times acceleration.",
    variables: [
      { name: "Mass", symbol: "m", unit: "kg" },
      { name: "Acceleration", symbol: "a", unit: "m/s²" },
    ],
  },
  {
    id: "dyn-2",
    category: "Dynamics & Energy",
    name: "Kinetic Energy (E_k = ½mv²)",
    formula: "E_k = 0.5 * m * v²",
    templateExpression: "0.5 * m * (v^2)",
    description: "Energy possessed by a body due to motion.",
    variables: [
      { name: "Mass", symbol: "m", unit: "kg" },
      { name: "Velocity", symbol: "v", unit: "m/s" },
    ],
  },
  {
    id: "dyn-3",
    category: "Dynamics & Energy",
    name: "Gravitational Potential (U = mgh)",
    formula: "U = m * g * h",
    templateExpression: "m * 9.80665 * h",
    description: "Potential energy in Earth's gravitational field.",
    variables: [
      { name: "Mass", symbol: "m", unit: "kg" },
      { name: "Height", symbol: "h", unit: "m" },
    ],
  },
  {
    id: "dyn-4",
    category: "Dynamics & Energy",
    name: "Mass-Energy Equivalence (E = mc²)",
    formula: "E = m * c²",
    templateExpression: "m * (299792458^2)",
    description: "Einstein's relativistic mass-energy equivalence.",
    variables: [{ name: "Mass", symbol: "m", unit: "kg" }],
  },

  // Waves & Trigonometry
  {
    id: "trig-1",
    category: "Trigonometry",
    name: "Pythagorean Identity (sin²θ + cos²θ = 1)",
    formula: "sin²(θ) + cos²(θ) = 1",
    templateExpression: "(sin(theta))^2 + (cos(theta))^2",
    description: "Fundamental trigonometric unit circle identity.",
    variables: [{ name: "Angle θ", symbol: "theta", unit: "deg/rad" }],
  },
  {
    id: "trig-2",
    category: "Trigonometry",
    name: "Law of Cosines (c² = a² + b² - 2ab cos(C))",
    formula: "c = √(a² + b² - 2ab·cos(C))",
    templateExpression: "sqrt(a^2 + b^2 - 2 * a * b * cos(C))",
    description: "Calculates third side of any triangle given two sides and included angle.",
    variables: [
      { name: "Side a", symbol: "a", unit: "length" },
      { name: "Side b", symbol: "b", unit: "length" },
      { name: "Angle C", symbol: "C", unit: "deg" },
    ],
  },
  {
    id: "wave-1",
    category: "Waves & Optics",
    name: "Wave Velocity (v = fλ)",
    formula: "v = f * λ",
    templateExpression: "f * lambda",
    description: "Velocity equals frequency times wavelength.",
    variables: [
      { name: "Frequency", symbol: "f", unit: "Hz" },
      { name: "Wavelength", symbol: "lambda", unit: "m" },
    ],
  },
  {
    id: "wave-2",
    category: "Waves & Optics",
    name: "Snell's Law (n₁ sin θ₁ = n₂ sin θ₂)",
    formula: "θ₂ = asin((n₁/n₂) * sin(θ₁))",
    templateExpression: "asin((n1 / n2) * sin(theta1))",
    description: "Refraction of light across optical interfaces.",
    variables: [
      { name: "Refractive Index 1", symbol: "n1", unit: "index" },
      { name: "Refractive Index 2", symbol: "n2", unit: "index" },
      { name: "Incident Angle", symbol: "theta1", unit: "deg" },
    ],
  },

  // Calculus
  {
    id: "calc-1",
    category: "Calculus",
    name: "Derivative Power Rule [ d/dx(xⁿ) = n·xⁿ⁻¹ ]",
    formula: "d/dx(x^n) = n * x^(n-1)",
    templateExpression: "n * (x^(n - 1))",
    description: "Power rule for differentiation.",
    variables: [
      { name: "Base variable value", symbol: "x", unit: "value" },
      { name: "Exponent", symbol: "n", unit: "power" },
    ],
  },
  {
    id: "calc-2",
    category: "Calculus",
    name: "Definite Integral Power Rule [ ∫ xⁿ dx = xⁿ⁺¹/(n+1) ]",
    formula: "∫ x^n dx = (x^(n+1))/(n+1)",
    templateExpression: "(x^(n + 1)) / (n + 1)",
    description: "Indefinite integral power rule.",
    variables: [
      { name: "Integration point x", symbol: "x", unit: "value" },
      { name: "Exponent n (≠ -1)", symbol: "n", unit: "power" },
    ],
  },
];

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: "length",
    name: "Length",
    baseUnit: "m",
    units: [
      { id: "m", name: "Meter", symbol: "m", toBase: (v) => v, fromBase: (v) => v },
      { id: "km", name: "Kilometer", symbol: "km", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: "cm", name: "Centimeter", symbol: "cm", toBase: (v) => v * 0.01, fromBase: (v) => v / 0.01 },
      { id: "mm", name: "Millimeter", symbol: "mm", toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
      { id: "in", name: "Inch", symbol: "in", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { id: "ft", name: "Foot", symbol: "ft", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { id: "yd", name: "Yard", symbol: "yd", toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
      { id: "mi", name: "Mile", symbol: "mi", toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
      { id: "nmi", name: "Nautical Mile", symbol: "nmi", toBase: (v) => v * 1852, fromBase: (v) => v / 1852 },
    ],
  },
  {
    id: "mass",
    name: "Mass & Weight",
    baseUnit: "kg",
    units: [
      { id: "kg", name: "Kilogram", symbol: "kg", toBase: (v) => v, fromBase: (v) => v },
      { id: "g", name: "Gram", symbol: "g", toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
      { id: "mg", name: "Milligram", symbol: "mg", toBase: (v) => v * 1e-6, fromBase: (v) => v / 1e-6 },
      { id: "lb", name: "Pound", symbol: "lb", toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
      { id: "oz", name: "Ounce", symbol: "oz", toBase: (v) => v * 0.0283495231, fromBase: (v) => v / 0.0283495231 },
      { id: "t", name: "Metric Ton", symbol: "t", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    ],
  },
  {
    id: "velocity",
    name: "Speed & Velocity",
    baseUnit: "m/s",
    units: [
      { id: "mps", name: "Meters per second", symbol: "m/s", toBase: (v) => v, fromBase: (v) => v },
      { id: "kmh", name: "Kilometers per hour", symbol: "km/h", toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
      { id: "mph", name: "Miles per hour", symbol: "mph", toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
      { id: "fps", name: "Feet per second", symbol: "ft/s", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { id: "knot", name: "Knot", symbol: "kn", toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
    ],
  },
  {
    id: "temperature",
    name: "Temperature",
    baseUnit: "C",
    units: [
      { id: "C", name: "Celsius", symbol: "°C", toBase: (v) => v, fromBase: (v) => v },
      { id: "F", name: "Fahrenheit", symbol: "°F", toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: "K", name: "Kelvin", symbol: "K", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: "energy",
    name: "Energy & Work",
    baseUnit: "J",
    units: [
      { id: "J", name: "Joule", symbol: "J", toBase: (v) => v, fromBase: (v) => v },
      { id: "kJ", name: "Kilojoule", symbol: "kJ", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: "cal", name: "Calorie", symbol: "cal", toBase: (v) => v * 4.184, fromBase: (v) => v / 4.184 },
      { id: "kcal", name: "Kilocalorie (Food)", symbol: "kcal", toBase: (v) => v * 4184, fromBase: (v) => v / 4184 },
      { id: "Wh", name: "Watt-hour", symbol: "Wh", toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      { id: "kWh", name: "Kilowatt-hour", symbol: "kWh", toBase: (v) => v * 3.6e6, fromBase: (v) => v / 3.6e6 },
      { id: "eV", name: "Electronvolt", symbol: "eV", toBase: (v) => v * 1.602176634e-19, fromBase: (v) => v / 1.602176634e-19 },
    ],
  },
  {
    id: "pressure",
    name: "Pressure",
    baseUnit: "Pa",
    units: [
      { id: "Pa", name: "Pascal", symbol: "Pa", toBase: (v) => v, fromBase: (v) => v },
      { id: "kPa", name: "Kilopascal", symbol: "kPa", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: "bar", name: "Bar", symbol: "bar", toBase: (v) => v * 100000, fromBase: (v) => v / 100000 },
      { id: "psi", name: "PSI", symbol: "psi", toBase: (v) => v * 6894.757, fromBase: (v) => v / 6894.757 },
      { id: "atm", name: "Atmosphere", symbol: "atm", toBase: (v) => v * 101325, fromBase: (v) => v / 101325 },
      { id: "mmHg", name: "Millimeter of Mercury", symbol: "mmHg", toBase: (v) => v * 133.322, fromBase: (v) => v / 133.322 },
    ],
  },
  {
    id: "angle",
    name: "Angles",
    baseUnit: "deg",
    units: [
      { id: "deg", name: "Degree", symbol: "°", toBase: (v) => v, fromBase: (v) => v },
      { id: "rad", name: "Radian", symbol: "rad", toBase: (v) => (v * 180) / Math.PI, fromBase: (v) => (v * Math.PI) / 180 },
      { id: "grad", name: "Gradian", symbol: "grad", toBase: (v) => (v * 180) / 200, fromBase: (v) => (v * 200) / 180 },
    ],
  },
  {
    id: "time",
    name: "Time",
    baseUnit: "s",
    units: [
      { id: "s", name: "Second", symbol: "s", toBase: (v) => v, fromBase: (v) => v },
      { id: "ms", name: "Millisecond", symbol: "ms", toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
      { id: "min", name: "Minute", symbol: "min", toBase: (v) => v * 60, fromBase: (v) => v / 60 },
      { id: "hr", name: "Hour", symbol: "hr", toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      { id: "day", name: "Day", symbol: "day", toBase: (v) => v * 86400, fromBase: (v) => v / 86400 },
    ],
  },
];
