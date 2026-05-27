import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import React from 'react';

import PageNextJs from 'nextjs/PageNextJs';

const LabelsDirectory = dynamic(() => import('ui/pages/LabelsDirectory'), { ssr: false });

const Page: NextPage = () => {
  return (
    <PageNextJs pathname="/labels">
      <LabelsDirectory/>
    </PageNextJs>
  );
};

export default Page;

export { base as getServerSideProps } from 'nextjs/getServerSideProps/main';
