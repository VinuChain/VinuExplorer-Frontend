export default function getNetworkUtilizationParams(value: number) {
  const load = (() => {
    if (value > 80) {
      return 'high';
    }

    if (value > 50) {
      return 'medium';
    }

    return 'low';
  })();

  const colors = {
    high: 'red.600',
    medium: 'orange.600',
    low: 'green.600',
  };
  const color = colors[load];

  return {
    load,
    color,
    // Callers print value.toFixed(2), so anything under 0.01 renders as
    // "0.00%" next to a green "Low load" - a health claim about a number too
    // small to have measured. VinuChain mainnet sits around 1.6e-08%. The gas
    // tracker page already hid the metric on this threshold while the home
    // page and the blocks tab did not, so it lives here now and all three
    // agree.
    isMeasurable: value >= 0.01,
  };
}
