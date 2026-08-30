import type { HTMLChakraProps } from '@chakra-ui/react';
import { Box } from '@chakra-ui/react';
import React from 'react';

import type { TabItemRegular } from './types';

import useIsMobile from 'lib/hooks/useIsMobile';

import { Skeleton } from '../../chakra/skeleton';
import type { TabsProps } from '../../chakra/tabs';
import { TabsCounter, TabsList, TabsTrigger } from '../../chakra/tabs';
import { useIsSticky } from '../../hooks/useIsSticky';
import AdaptiveTabsMenu from './AdaptiveTabsMenu';
import useAdaptiveTabs from './useAdaptiveTabs';
import useScrollToActiveTab from './useScrollToActiveTab';
import { menuButton, getTabValue } from './utils';

export interface SlotProps extends HTMLChakraProps<'div'> {
  widthAllocation?: 'available' | 'fixed';
}

export interface BaseProps {
  tabs: Array<TabItemRegular>;
  // styles the tabs row - the element holding the tabs and both slots - not the trigger list
  listProps?: HTMLChakraProps<'div'> | (({ isSticky, activeTab }: { isSticky: boolean; activeTab: string }) => HTMLChakraProps<'div'>);
  // styles only the `role="tablist"` element, for callers that need to lay the triggers out
  tabsListProps?: HTMLChakraProps<'div'>;
  rightSlot?: React.ReactNode;
  rightSlotProps?: SlotProps;
  leftSlot?: React.ReactNode;
  leftSlotProps?: SlotProps;
  stickyEnabled?: boolean;
  isLoading?: boolean;
}

interface Props extends BaseProps {
  activeTab: string;
  variant: TabsProps['variant'];
}

const HIDDEN_ITEM_STYLES: HTMLChakraProps<'button'> = {
  position: 'absolute',
  top: '-9999px',
  left: '-9999px',
  visibility: 'hidden',
};

const getItemStyles = (index: number, tabsCut: number | undefined, isLoading: boolean | undefined) => {
  if (tabsCut === undefined || isLoading) {
    return HIDDEN_ITEM_STYLES as never;
  }

  return index < tabsCut ? {} : HIDDEN_ITEM_STYLES as never;
};

const getMenuStyles = (tabsLength: number, tabsCut: number | undefined, isLoading: boolean | undefined) => {
  if (tabsCut === undefined || isLoading) {
    return HIDDEN_ITEM_STYLES;
  }

  return tabsCut >= tabsLength ? HIDDEN_ITEM_STYLES : {};
};

const AdaptiveTabsList = (props: Props) => {

  const {
    tabs,
    activeTab,
    listProps,
    rightSlot,
    rightSlotProps,
    leftSlot,
    leftSlotProps,
    tabsListProps,
    stickyEnabled,
    isLoading,
    variant,
  } = props;

  const isMobile = useIsMobile();

  const tabsList = React.useMemo(() => {
    return [ ...tabs, menuButton ];
  }, [ tabs ]);

  const { tabsCut, tabsRefs, listRef, rightSlotRef, leftSlotRef } = useAdaptiveTabs(tabsList, isLoading || isMobile);
  const isSticky = useIsSticky(listRef, 5, stickyEnabled);
  const activeTabIndex = tabsList.findIndex((tab) => getTabValue(tab) === activeTab) ?? 0;
  useScrollToActiveTab({ activeTabIndex, listRef, tabsRefs, isMobile, isLoading });

  if (tabs.length === 1 && !leftSlot && !rightSlot) {
    return null;
  }

  const isReady = !isLoading && tabsCut !== undefined;

  return (
    // `role="tablist"` may only contain tabs, and the slots hold links, navs and pagination
    // controls. axe flagged the block page with `aria-required-children`:
    // "Element has children which are not allowed: a[tabindex], nav[tabindex]". Only focusable
    // descendants trip the rule, so the fix is to keep the slots out of the tablist rather than
    // to relabel them - `role="presentation"`, `aria-owns` listing only the tabs, and
    // `tabindex="-1"` were each measured against the rule and all three still failed.
    //
    // Every row-level style therefore moves from `TabsList` up to this wrapper, which keeps the
    // three things that measure the row pointing at the same element they did before: the width
    // `useAdaptiveTabs` cuts tabs against, the scroll container `useScrollToActiveTab` scrolls,
    // and the element `useIsSticky` watches. `TabsList` is left holding only the tab triggers.
    <Box
      ref={ listRef }
      // the two AddressContract tests screenshot this row; the tablist they used to target no
      // longer holds the slots, so it is no longer the element that shows what they check
      data-testid="tabs-row"
      display="flex"
      // `secondary` is the only variant whose recipe gaps the list, and the slots used to sit
      // inside it and inherit that gap. They are siblings of the list now, so the row repeats it
      // rather than letting the space between the tabs and the slots silently close up.
      columnGap={ variant === 'secondary' ? 2 : undefined }
      // Hidden tabs and the hidden menu trigger are parked at `left: -9999px`, and the recipe
      // makes `TabsList` `position: relative`, so it was their containing block. The wrapper takes
      // that over now that they are no longer all inside the list, so they keep resolving against
      // the tabs row.
      position={ props.stickyEnabled ? 'sticky' : 'relative' }
      flexWrap="nowrap"
      alignItems="center"
      whiteSpace="nowrap"
      bgColor="bg.primary"
      marginBottom={ 6 }
      mx={{ base: '-12px', lg: 'unset' }}
      px={{ base: '12px', lg: 'unset' }}
      w={{ base: 'calc(100% + 24px)', lg: '100%' }}
      overflowX={{ base: 'auto', lg: 'initial' }}
      overscrollBehaviorX="contain"
      css={{
        scrollSnapType: 'x mandatory',
        scrollPaddingInline: '12px', // mobile page padding
        // hide scrollbar
        '&::-webkit-scrollbar': { /* Chromiums */
          display: 'none',
        },
        '-ms-overflow-style': 'none', /* IE and Edge */
        scrollbarWidth: 'none', /* Firefox */
      }}
      {
        ...(props.stickyEnabled ? {
          boxShadow: { base: isSticky ? 'md' : 'none', lg: 'none' },
          top: 0,
          zIndex: { base: 'sticky2', lg: 'docked' },
        } : { })
      }
      {
        ...(typeof listProps === 'function' ? listProps({ isSticky, activeTab }) : listProps)
      }
    >
      { leftSlot && (
        <Box
          ref={ leftSlotRef }
          { ...leftSlotProps }
          flexGrow={ leftSlotProps?.widthAllocation === 'available' && tabsCut !== undefined ? 1 : undefined }
        >
          { leftSlot }
        </Box>
      )
      }
      { /* The recipe gives the list `width: 100%`, which would push the slots out of the row now
         * that they are siblings rather than children, so it sizes to its tabs instead.
         *
         * With a single tab and a slot the list mounts with no triggers, because they are gated on
         * more than one tab. That is deliberate: axe lists `tablist` in the `reviewEmpty` set for
         * `aria-required-children`, so an empty one is reported as incomplete rather than as a
         * violation - a strict improvement on the invalid children it used to hold. */ }
      <TabsList w="auto" flexShrink={ 0 } flexWrap="nowrap" alignItems="center" { ...tabsListProps }>
        { tabs.length > 1 && tabs.map((tab, index) => {
          const value = getTabValue(tab);
          const ref = tabsRefs[index];

          return (
            <TabsTrigger
              key={ value }
              value={ value }
              ref={ ref }
              scrollSnapAlign="start"
              flexShrink={ 0 }
              { ...getItemStyles(index, tabsCut, isLoading) }
            >
              { typeof tab.title === 'function' ? tab.title() : tab.title }
              <TabsCounter count={ tab.count }/>
            </TabsTrigger>
          );
        }) }
        { tabs.slice(0, isReady ? 0 : 5).map((tab, index) => {
          const value = `${ getTabValue(tab) }-pre`;
          return (
            <TabsTrigger
              key={ value }
              value={ value }
              flexShrink={ 0 }
              bgColor={
                activeTabIndex === index && (variant === 'solid' || variant === undefined) ?
                  { _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' } :
                  undefined
              }
            >
              <Skeleton loading>
                { typeof tab.title === 'function' ? tab.title() : tab.title }
                <TabsCounter count={ tab.count }/>
              </Skeleton>
            </TabsTrigger>
          );
        }) }
      </TabsList>
      { /* The menu trigger is a Popover control rendered as a focusable div, not a `role="tab"`,
         * so it trips the same `aria-required-children` rule as the slots whenever the tabs
         * overflow and it becomes visible. Rendering it as a sibling keeps it in the same
         * position in the row - the list sizes to its tabs - and keeps `tabsRefs[tabs.length]`,
         * which is the width `useAdaptiveTabs` cuts against. */ }
      { tabs.length > 1 && (
        <AdaptiveTabsMenu
          ref={ tabsRefs[tabs.length] }
          tabs={ tabs }
          tabsCut={ tabsCut ?? 0 }
          isActive={ activeTabIndex > 0 && tabsCut !== undefined && tabsCut > 0 && activeTabIndex >= tabsCut }
          { ...getMenuStyles(tabs.length, tabsCut, isLoading) }
        />
      ) }
      {
        rightSlot ? (
          <Box
            ref={ rightSlotRef }
            ml="auto"
            { ...rightSlotProps }
            flexGrow={ rightSlotProps?.widthAllocation === 'available' && tabsCut !== undefined ? 1 : undefined }
          >
            { rightSlot }
          </Box>
        ) :
          null
      }
    </Box>
  );
};

export default React.memo(AdaptiveTabsList);
