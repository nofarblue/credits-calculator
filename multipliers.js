// Harness Cloud Credits - Resource Class Multipliers
// Update these values to adjust pricing without modifying the main webpage

// Structured catalog: os -> arch -> sizes[]
export const RESOURCE_CATALOG = {
  linux: {
    amd: [
      { label: 'XSmall', vcpus: 2, multiplier: 1 },
      { label: 'Small', vcpus: 4, multiplier: 2 },
      { label: 'Medium', vcpus: 8, multiplier: 4 },
      { label: 'Large', vcpus: 16, multiplier: 8 },
      { label: 'XLarge', vcpus: 32, multiplier: 16 },
      { label: '2XL', vcpus: 64, multiplier: 32 },
      { label: '3XL', vcpus: 96, multiplier: 48 },
    ],
    arm: [
      { label: 'XSmall', vcpus: 2, multiplier: 1 },
      { label: 'Small', vcpus: 4, multiplier: 2 },
      { label: 'Medium', vcpus: 8, multiplier: 4 },
      { label: 'Large', vcpus: 16, multiplier: 8 },
      { label: 'XLarge', vcpus: 32, multiplier: 16 },
      { label: '2XL', vcpus: 48, multiplier: 24 },
    ],
  },
  windows: {
    amd: [
      { label: 'Small', vcpus: 4, multiplier: 4 },
      { label: 'Medium', vcpus: 8, multiplier: 8 },
      { label: 'Large', vcpus: 16, multiplier: 16 },
      { label: 'XLarge', vcpus: 32, multiplier: 32 },
      { label: '2XL', vcpus: 64, multiplier: 64 },
      { label: '3XL', vcpus: 96, multiplier: 96 },
    ],
  },
  macos: {
    arm: [
      { label: 'Medium', vcpus: 6, multiplier: 60 },
    ],
  },
};

export const PRICING = {
  FREE_CREDITS_MONTHLY: 2000,
  COST_PER_CREDIT: 0.005,
  CREDITS_PER_MINUTE_BASE: 1,
};
