import { Box } from '@chakra-ui/react';
import React from 'react';

import config from 'configs/app';
import { currencyUnits } from 'lib/units';
import { AccordionRoot } from 'toolkit/chakra/accordion';
import { Heading } from 'toolkit/chakra/heading';

import GasTrackerFaqItem from './GasTrackerFaqItem';

const FAQ_ITEMS = [
  {
    question: 'What does gas refer to on the blockchain?',
    answer: 'Gas is the amount of native tokens required to perform a transaction on the blockchain.',
  },
  {
    question: `How can I check ${ config.chain.name } gas fees?`,
    // eslint-disable-next-line max-len
    answer: `You can check live ${ config.chain.name } gas fees on VinuExplorer by visiting the gas tracker. It displays current raw gas prices in ${ currencyUnits.gwei } for ${ config.chain.name } transactions.`,
  },
  {
    question: `What is the average gas fee for ${ config.chain.name } transactions?`,
    // eslint-disable-next-line max-len
    answer: `The average gas fee for ${ config.chain.name } transactions depends on network congestion and transaction complexity. VinuExplorer provides real-time gas fee estimations to help users understand the raw network fee before any Payback refund.`,
  },
  {
    question: 'How does VinuExplorer calculate gas fees?',
    answer: 'VinuExplorer calculates gas fees based on the average price of gas fees spent for the last 200 blocks.',
  },
  {
    question: 'How do Payback refunds affect transaction fees?',
    // eslint-disable-next-line max-len
    answer: 'Gross gas is still measured on-chain, and Payback quota can refund all or part of the transaction fee. When fee refund data is present, transaction pages show whether the transaction was Gas-Free or Quota-Subsidized, plus the refund amount and net transaction fee.',
  },
  {
    question: 'Why are gas tracker prices still useful on VinuChain?',
    // eslint-disable-next-line max-len
    answer: 'Gas tracker prices show the raw network fee before Payback refunds. That baseline is still useful for understanding congestion, transaction complexity, and the difference between gross gas cost and net fee after refunds.',
  },
];

const GasTrackerFaq = () => {
  return (
    <Box mt={ 12 }>
      <Heading level="2" mb={ 4 }>FAQ</Heading>
      <AccordionRoot variant="faq">
        { FAQ_ITEMS.map((item, index) => (
          <GasTrackerFaqItem key={ index } question={ item.question } answer={ item.answer }/>
        )) }
      </AccordionRoot>
    </Box>
  );
};

export default GasTrackerFaq;
