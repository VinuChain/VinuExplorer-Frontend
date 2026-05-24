import { debounce } from 'es-toolkit';
import { useEffect, useState } from 'react';

export function useViewportSize(debounceTime = 100) {
  const [ viewportSize, setViewportSize ] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setViewportSize({ width: window.innerWidth, height: window.innerHeight });

    const resizeHandler = debounce(() => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    }, debounceTime);

    window.addEventListener('resize', resizeHandler);
    return function cleanup() {
      window.removeEventListener('resize', resizeHandler);
    };
  }, [ debounceTime ]);

  return viewportSize;
}
