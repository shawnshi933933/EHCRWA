/** Official company resources, not fabricated quarterly report URLs. */
export const companyResources: Record<number, {
  description: string; investorRelationsUrl: string; financialsUrl: string;
}> = {
  14: {
    description: "Tesla designs and manufactures electric vehicles and energy generation and storage systems.",
    investorRelationsUrl: "https://ir.tesla.com/",
    financialsUrl: "https://ir.tesla.com/#quarterly-disclosure",
  },
  3: {
    description: "Apple designs and markets consumer electronics, software and digital services.",
    investorRelationsUrl: "https://investor.apple.com/",
    financialsUrl: "https://investor.apple.com/sec-filings/default.aspx",
  },
  2: {
    description: "NVIDIA develops accelerated computing platforms, graphics processors and related software.",
    investorRelationsUrl: "https://investor.nvidia.com/",
    financialsUrl: "https://investor.nvidia.com/financial-info/financial-reports-and-sec-filings/default.aspx",
  },
};
