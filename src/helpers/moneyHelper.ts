/**
 * Money Helper Utility for Enterprise Integer Paise Financial Calculations
 */

export function rupeesToPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

export function paiseToRupees(paise: bigint | number): number {
  return Number(paise) / 100;
}

export function calculateGstPaise(taxablePaise: bigint, ratePercent: number): {
  cgstPaise: bigint;
  sgstPaise: bigint;
  igstPaise: bigint;
  totalTaxPaise: bigint;
  grandTotalPaise: bigint;
} {
  const taxAmount = (Number(taxablePaise) * ratePercent) / 100;
  const totalTaxPaise = BigInt(Math.round(taxAmount));

  // 50-50 split for Intra-State CGST + SGST
  const cgstPaise = totalTaxPaise / BigInt(2);
  const sgstPaise = totalTaxPaise - cgstPaise;

  return {
    cgstPaise,
    sgstPaise,
    igstPaise: totalTaxPaise,
    totalTaxPaise,
    grandTotalPaise: taxablePaise + totalTaxPaise,
  };
}
