import { chakra } from '@chakra-ui/react';
import BigNumber from 'bignumber.js';
import React from 'react';

import config from 'configs/app';
import getNetworkUtilizationParams from 'lib/networks/getNetworkUtilizationParams';
import { Tooltip } from 'toolkit/chakra/tooltip';

import GasUsedToTargetRatio from '../GasUsedToTargetRatio';
import TextSeparator from '../TextSeparator';
import Utilization from '../Utilization/Utilization';

const rollupFeature = config.features.rollup;

interface Props {
  className?: string;
  gasUsed?: string;
  gasLimit: string;
  gasTarget?: number;
  isLoading?: boolean;
}

const BlockGasUsed = ({ className, gasUsed, gasLimit, gasTarget, isLoading }: Props) => {
  const hasGasUtilization =
    gasUsed && gasUsed !== '0' &&
    (!rollupFeature.isEnabled || rollupFeature.type === 'optimistic' || rollupFeature.type === 'shibarium');

  if (!hasGasUtilization) {
    return null;
  }

  const utilization = BigNumber(gasUsed).dividedBy(BigNumber(gasLimit)).toNumber();

  // A gas target only says something when the block's usage is measurable
  // against its limit. VinuChain's gas limit is 2^48-1, so a block carrying a
  // couple of transfers uses about 7e-09% of it and the API returns
  // gas_target_percentage -99.9999999850786 on essentially every block. That
  // renders as a flat "-100% of Gas Target" chain-wide: an artifact of the
  // limit, not a fact about the block. Gate it on the same measurability floor
  // the gas tracker, home page and blocks tab already share, so a chain with a
  // real EIP-1559 target is unaffected.
  const hasMeaningfulTarget = getNetworkUtilizationParams(utilization * 100).isMeasurable;

  return (
    <>
      <Tooltip content="Gas Used %" disabled={ isLoading }>
        <Utilization
          colorScheme="gray"
          value={ utilization }
          isLoading={ isLoading }
          className={ className }
        />
      </Tooltip>
      { gasTarget && hasMeaningfulTarget && (
        <>
          <TextSeparator/>
          <GasUsedToTargetRatio value={ gasTarget } isLoading={ isLoading }/>
        </>
      ) }
    </>
  );
};

export default React.memo(chakra(BlockGasUsed));
