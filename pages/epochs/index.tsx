import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import React from 'react';

import PageNextJs from 'nextjs/PageNextJs';

import config from 'configs/app';

const Epochs = dynamic(() => import('ui/pages/Epochs'), { ssr: false });
const VinuEpochs = dynamic(() => import('ui/pages/VinuEpochs'), { ssr: false });

// Both chains call this concept "epochs" but the data models share nothing -
// Celo's are election rewards, VinuChain's are SFC staking snapshots. They are
// mutually exclusive features, so one canonical /epochs URL serves whichever
// is enabled rather than inventing a second path.
const Page: NextPage = () => {
  return (
    <PageNextJs pathname="/epochs">
      { config.features.vinuEpochs.isEnabled ? <VinuEpochs/> : <Epochs/> }
    </PageNextJs>
  );
};

export default Page;

export { base as getServerSideProps } from 'nextjs/getServerSideProps/main';
