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

// test story: a controlled tooltip that starts closed and is opened later by the caller
export const TooltipControlledStory = () => {
  const [ open, setOpen ] = React.useState(false);
  const handleOpen = React.useCallback(() => setOpen(true), []);
  return (
    <>
      <button onClick={ handleOpen }>open it</button>
      <Tooltip content="tip text" open={ open }><span>trigger</span></Tooltip>
    </>
  );
};

// test story: counts how many times the trigger subtree has been mounted
export const TooltipMountCountStory = ({ disableOnMobile, eager }: { disableOnMobile?: boolean; eager?: boolean }) => {
  const [ mounts, setMounts ] = React.useState(0);
  const Counter = React.useMemo(() => function Counter() {
    React.useEffect(() => setMounts((c) => c + 1), []);
    return <button>trigger</button>;
  }, []);
  return (
    <>
      <div>mounts: { mounts }</div>
      <Tooltip content="tip text" disableOnMobile={ disableOnMobile } eager={ eager }><span><Counter/></span></Tooltip>
    </>
  );
};

// test story: a tooltip that the caller disables and re-enables while focus moves elsewhere
export const TooltipToggleStory = () => {
  const [ disabled, setDisabled ] = React.useState(false);
  const handleToggle = React.useCallback(() => setDisabled((value) => !value), []);
  return (
    <>
      <Tooltip content="tip text" disabled={ disabled }><button>trigger</button></Tooltip>
      <input aria-label="other input"/>
      <button onClick={ handleToggle }>toggle</button>
    </>
  );
};
