import React from 'react';

import { Tooltip } from './tooltip';

// test story: a trigger with its own click handler wrapped in a lazily mounted tooltip
export const TooltipClickStory = () => {
  const [ count, setCount ] = React.useState(0);
  const handleClick = React.useCallback(() => setCount((c) => c + 1), []);
  return (
    <Tooltip content="tip text">
      <button onClick={ handleClick }>clicks: { count }</button>
    </Tooltip>
  );
};
