// Initial taxonomy for the one-time SQLite migration and legacy JSON tooling.
export const boardCategories = [
  { id: "adapter-board", label: "Adapter Boards", description: "Connector adapters and signal routing boards." },
  { id: "filter-board", label: "Filter Boards", description: "Analog, RF, and cryogenic filter designs." },
  { id: "sample-device-board", label: "Sample / Device Boards", description: "Boards for mounting and connecting samples or devices." },
  { id: "interface-board", label: "Interface Boards", description: "Control, communication, and instrument interfaces." },
  { id: "rf-board", label: "RF Boards", description: "Radio-frequency and microwave circuit designs." },
  { id: "cryogenic-board", label: "Cryogenic Boards", description: "Boards intended for low-temperature systems." },
  { id: "power-board", label: "Power Boards", description: "Power supply, distribution, and regulation boards." },
  { id: "test-board", label: "Test Boards", description: "Test fixtures and circuit evaluation boards." },
  { id: "miscellaneous", label: "Miscellaneous", description: "Other PCB designs in the archive." },
] as const;
