import type {
  SkeletonProps as ChakraSkeletonProps,
  CircleProps,
} from '@chakra-ui/react';
import { Skeleton as ChakraSkeleton, Circle, Stack, chakra, mergeRefs } from '@chakra-ui/react';
import * as React from 'react';

export interface SkeletonCircleProps extends ChakraSkeletonProps {
  size?: CircleProps['size'];
}

export const SkeletonCircle = React.forwardRef<
  HTMLDivElement,
  SkeletonCircleProps
>(function SkeletonCircle(props, ref) {
  const { size, ...rest } = props;
  return (
    <Circle size={ size } asChild ref={ ref }>
      <ChakraSkeleton { ...rest }/>
    </Circle>
  );
});

export interface SkeletonTextProps extends ChakraSkeletonProps {
  noOfLines?: number;
}

export const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  function SkeletonText(props, ref) {
    const { noOfLines = 3, gap, ...rest } = props;
    return (
      <Stack gap={ gap } width="full" ref={ ref }>
        { Array.from({ length: noOfLines }).map((_, index) => (
          <ChakraSkeleton
            height="4"
            key={ index }
            { ...props }
            _last={{ maxW: '80%' }}
            { ...rest }
          />
        )) }
      </Stack>
    );
  },
);

export interface SkeletonProps extends Omit<ChakraSkeletonProps, 'loading'> {
  loading: boolean | undefined;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton(props, ref) {
    const { loading = false, ...rest } = props;

    // Idle skeleton (the common case: ~1000 instances per table page) contributes no visuals
    // (the "none" variant only sets `animation: none`), so skip the Chakra recipe resolution:
    // merge props into the only child with asChild, otherwise render a plain chakra.div.
    if (!loading) {
      const { asChild, children, ...styleProps } = rest;

      if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<Record<string, unknown>>;
        // skeleton props are forwarded from the call site and win over the child's own
        const mergedProps: Record<string, unknown> = { ...child.props, ...styleProps };

        if (styleProps.className && child.props.className) {
          mergedProps.className = `${ styleProps.className } ${ child.props.className }`;
        }
        if (styleProps.css && child.props.css) {
          mergedProps.css = [ child.props.css, styleProps.css ];
        }
        const childRef = child.props.ref as React.Ref<HTMLDivElement> | undefined;
        if (ref) {
          mergedProps.ref = childRef ? mergeRefs(ref, childRef) : ref;
        }
        return React.cloneElement(child, mergedProps);
      }

      return <chakra.div ref={ ref } { ...styleProps }>{ children }</chakra.div>;
    }

    return (
      <ChakraSkeleton
        ref={ ref }
        data-loading
        state="loading"
        { ...rest }
      />
    );
  },
);
