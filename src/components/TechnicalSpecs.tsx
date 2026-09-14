const labels: Record<string, string> = {
  dimensions: "Board dimensions", thickness: "PCB thickness", layers: "Layers", material: "Material", copperThickness: "Copper thickness", surfaceFinish: "Surface finish", minimumTraceSpace: "Minimum trace / space", connectors: "Connector types", impedance: "Impedance requirements", operatingTemperature: "Operating temperature", manufacturingNotes: "Manufacturing notes",
};

export function TechnicalSpecs({ specifications }: { specifications?: Record<string, string | number> }) {
  const entries = Object.entries(specifications || {}).filter(([, value]) => value !== "");
  if (!entries.length) return <p className="missing">Not recorded yet.</p>;
  return <dl className="spec-table">{entries.map(([key, value]) => <div key={key}><dt>{labels[key] || key.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl>;
}
