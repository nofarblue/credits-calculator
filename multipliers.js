// Harness Cloud Credits - Resource Class Multipliers
// Update these values to adjust pricing without modifying the main webpage
// RAM based on GCP C4D (AMD/Windows) and T2A (ARM) machine specs

// Structured catalog: os -> arch -> sizes[]
export const RESOURCE_CATALOG = {
  linux: {
    amd: [
      { label: 'XSmall', vcpus: 2, ram: 7, multiplier: 1 },
      { label: 'Small', vcpus: 4, ram: 15, multiplier: 2 },
      { label: 'Medium', vcpus: 8, ram: 31, multiplier: 4 },
      { label: 'Large', vcpus: 16, ram: 62, multiplier: 8 },
      { label: 'XLarge', vcpus: 32, ram: 124, multiplier: 16 },
      { label: '2XL', vcpus: 64, ram: 248, multiplier: 32 },
      { label: '3XL', vcpus: 96, ram: 372, multiplier: 48 },
    ],
    arm: [
      { label: 'XSmall', vcpus: 2, ram: 8, multiplier: 1 },
      { label: 'Small', vcpus: 4, ram: 16, multiplier: 2 },
      { label: 'Medium', vcpus: 8, ram: 32, multiplier: 4 },
      { label: 'Large', vcpus: 16, ram: 64, multiplier: 8 },
      { label: 'XLarge', vcpus: 32, ram: 128, multiplier: 16 },
      { label: '2XL', vcpus: 48, ram: 192, multiplier: 24 },
    ],
  },
  windows: {
    amd: [
      { label: 'Small', vcpus: 4, ram: 15, multiplier: 4 },
      { label: 'Medium', vcpus: 8, ram: 31, multiplier: 8 },
      { label: 'Large', vcpus: 16, ram: 62, multiplier: 16 },
      { label: 'XLarge', vcpus: 32, ram: 124, multiplier: 32 },
      { label: '2XL', vcpus: 64, ram: 248, multiplier: 64 },
      { label: '3XL', vcpus: 96, ram: 372, multiplier: 96 },
    ],
  },
  macos: {
    arm: [
      { label: 'Medium', vcpus: 6, ram: 14, multiplier: 60 },
    ],
  },
};

export const PRICING = {
  FREE_CREDITS_MONTHLY: 2000,
  COST_PER_CREDIT: 0.005,
  CREDITS_PER_MINUTE_BASE: 1,
};
