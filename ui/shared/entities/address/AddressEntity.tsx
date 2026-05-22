import { Box, Flex, chakra, VStack } from '@chakra-ui/react';
import React from 'react';

import type { AddressParam } from 'types/api/addressParams';

import { route } from 'nextjs/routes';

import { toBech32Address } from 'lib/address/bech32';
import { useAddressHighlightContext } from 'lib/contexts/addressHighlight';
import { useSettingsContext } from 'lib/contexts/settings';
import { Image } from 'toolkit/chakra/image';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { Tooltip } from 'toolkit/chakra/tooltip';
import * as EntityBase from 'ui/shared/entities/base/components';
import FittedTagName from 'ui/shared/EntityTags/FittedTagName';
import { getTagName } from 'ui/shared/EntityTags/utils';
import getChainTooltipText from 'ui/shared/externalChains/getChainTooltipText';
import type { IconName } from 'ui/shared/IconSvg';

import { distributeEntityProps, getContentProps, getIconProps } from '../base/utils';
import AddressEntityContentProxy from './AddressEntityContentProxy';
import AddressIconDelegated from './AddressIconDelegated';
import AddressIdenticon from './AddressIdenticon';

type LinkProps = EntityBase.LinkBaseProps & Pick<EntityProps, 'address'>;

const getDisplayedAddress = (address: AddressProp, altHash?: string) => {
  return address.filecoin?.robust ?? address.filecoin?.id ?? altHash ?? address.hash;
};

const Link = chakra((props: LinkProps) => {
  const defaultHref = route(
    { pathname: '/address/[hash]', query: { ...props.query, hash: props.address.hash } },
    { chain: props.chain, external: props.external },
  );

  return (
    <EntityBase.Link
      { ...props }
      href={ props.href ?? defaultHref }
    >
      { props.children }
    </EntityBase.Link>
  );
});

type IconProps = Pick<EntityProps, 'address' | 'isSafeAddress'> & EntityBase.IconBaseProps;

const Icon = (props: IconProps) => {
  if (props.noIcon) {
    return null;
  }

  const shield = props.shield ?? (props.chain ? { src: props.chain.logo } : undefined);
  const hintPostfix: string = props.hintPostfix ?? (props.chain && props.shield !== false ? getChainTooltipText(props.chain, ' on') : '');

  const styles = getIconProps(props, Boolean(shield));

  if (props.isLoading) {
    return <Skeleton { ...styles } loading borderRadius="full" flexShrink={ 0 }/>;
  }

  const isDelegatedAddress = props.address.proxy_type === 'eip7702';

  if (props.address.is_contract && !isDelegatedAddress) {
    if (props.isSafeAddress) {
      return (
        <EntityBase.Icon
          { ...props }
          shield={ shield }
          name="brands/safe"
        />
      );
    }

    const isProxy = Boolean(props.address.implementations?.length);
    const isVerified = isProxy ? props.address.is_verified && props.address.implementations?.every(({ name }) => Boolean(name)) : props.address.is_verified;
    const contractIconName: IconName = props.address.is_verified ? 'contracts/verified' : 'contracts/regular';
    const label = (isVerified ? 'verified ' : '') + (isProxy ? 'proxy contract' : 'contract') + hintPostfix;

    return (
      <EntityBase.Icon
        { ...props }
        shield={ shield }
        name={ isProxy ? 'contracts/proxy' : contractIconName }
        color={ isVerified ? 'green.500' : undefined }
        borderRadius={ 0 }
        hint={ label.slice(0, 1).toUpperCase() + label.slice(1) }
      />
    );
  }

  const label = (() => {
    if (isDelegatedAddress) {
      return (props.address.is_verified ? 'EOA + verified code' : 'EOA + code') + hintPostfix;
    }

    if (props.chain) {
      return 'Address' + hintPostfix;
    }

    return props.hint;
  })();

  // Prefer a public-tag's uploaded `tagIcon` over the generative
  // identicon when present — same logic AddressEntity.Content uses to
  // pick the name. Falling back to the identicon when no tag image is
  // available keeps the existing visual for un-curated addresses.
  const nameTag =
    props.address.metadata?.tags?.find((tag) => tag.tagType === 'name' && tag.name) ??
    props.address.metadata?.tags?.find((tag) => Boolean(tag.name));
  const nameTagIcon = nameTag?.meta?.tagIcon;
  const iconBoxPx = props.size ?? (props.variant === 'heading' ? 30 : 20);

  return (
    <Tooltip
      content={ label }
      disabled={ !label }
      interactive={ props.tooltipInteractive }
      positioning={ shield ? { offset: { mainAxis: 8 } } : undefined }
    >
      <Flex marginRight={ styles.marginRight } position="relative">
        { nameTagIcon ? (
          <Image
            src={ nameTagIcon }
            alt={ `${ nameTag?.name ?? 'address' } icon` }
            boxSize={ `${ iconBoxPx }px` }
            borderRadius="full"
            objectFit="cover"
            flexShrink={ 0 }
            // Tag icons come from user submissions and can rot
            // (host moves, hotlink protection, expired CDN, etc.).
            // Without a fallback the local Image wrapper renders
            // nothing on error, dropping the address's only visual
            // identifier in dense list views. Fall through to the
            // generative identicon so the row still has SOMETHING.
            fallback={ (
              <AddressIdenticon
                size={ iconBoxPx }
                hash={ getDisplayedAddress(props.address) }
              />
            ) }
          />
        ) : (
          <AddressIdenticon
            size={ iconBoxPx }
            hash={ getDisplayedAddress(props.address) }
          />
        ) }
        { shield && <EntityBase.IconShield { ...shield }/> }
        { isDelegatedAddress && <AddressIconDelegated isVerified={ Boolean(props.address.is_verified) }/> }
      </Flex>
    </Tooltip>
  );
};

export type ContentProps = Omit<EntityBase.ContentBaseProps, 'text'> & Pick<EntityProps, 'address'> & { altHash?: string };

const Content = chakra((props: ContentProps) => {
  const displayedAddress = getDisplayedAddress(props.address, props.altHash);
  // Pick the tag that will REPLACE the hex hash. Preference order:
  //   1. an explicit `tagType === 'name'` tag (legacy Blockscout shape)
  //   2. any tag carrying a display name (the new VinuExplorer model —
  //      every /public-tags/submit submission stores its Tag name in
  //      `display_name` regardless of the chosen Category Label, so all
  //      submitted tags replace the address).
  // The category badge column (TokenHoldersTableItem / AddressesTableItem)
  // continues to filter tagType !== 'name' to render the Label, so a
  // submission with category=exchange + name="Coinbase Hot Wallet"
  // surfaces BOTH the replaced name and an "Exchange" badge.
  const tags = props.address.metadata?.tags;
  const nameTagData = tags?.find(tag => tag.tagType === 'name' && tag.name) ??
    tags?.find(tag => Boolean(tag.name));
  const nameTag = nameTagData ? getTagName(nameTagData, props.address.hash) : undefined;
  const nameText = nameTag || props.address.ens_domain_name || props.address.name;

  const isProxy = props.address.implementations && props.address.implementations.length > 0 && props.address.proxy_type !== 'eip7702';

  if (isProxy) {
    return <AddressEntityContentProxy { ...props }/>;
  }

  if (nameText) {
    const styles = getContentProps(props.variant);

    const label = (
      <VStack gap={ 0 } py={ 1 } color="inherit">
        <Box fontWeight={ 600 } whiteSpace="pre-wrap" wordBreak="break-word">{ nameText }</Box>
        <Box whiteSpace="pre-wrap" wordBreak="break-word">
          { displayedAddress }
        </Box>
      </VStack>
    );

    return (
      <Tooltip
        content={ label }
        contentProps={{ maxW: { base: 'calc(100vw - 8px)', lg: '400px' } }}
        triggerProps={{ minW: 0 }}
        interactive={ props.tooltipInteractive }
        disabled={ props.noTooltip }
      >
        <Skeleton loading={ props.isLoading } overflow="hidden" { ...styles }>
          <FittedTagName text={ nameText }/>
        </Skeleton>
      </Tooltip>
    );
  }

  return (
    <EntityBase.Content
      { ...props }
      text={ displayedAddress }
    />
  );
});

type CopyProps = Omit<EntityBase.CopyBaseProps, 'text'> & Pick<EntityProps, 'address'> & { altHash?: string };

const Copy = (props: CopyProps) => {
  return (
    <EntityBase.Copy
      { ...props }
      text={ getDisplayedAddress(props.address, props.altHash) }
    />
  );
};

const Container = EntityBase.Container;

interface AddressProp extends Partial<AddressParam> {
  hash: string;
}

export interface EntityProps extends EntityBase.EntityBaseProps {
  address: AddressProp;
  isSafeAddress?: boolean;
  noHighlight?: boolean;
  noAltHash?: boolean;
}

const AddressEntity = (props: EntityProps) => {
  const partsProps = distributeEntityProps(props);
  const highlightContext = useAddressHighlightContext(props.noHighlight);
  const settingsContext = useSettingsContext();

  const altHash = !props.noAltHash && settingsContext?.addressFormat === 'bech32' ? toBech32Address(props.address.hash) : undefined;

  // inside highlight context all tooltips should be interactive
  // because non-interactive ones will not pass 'onMouseLeave' event to the parent component
  // see issue - https://github.com/chakra-ui/chakra-ui/issues/9939#issuecomment-2810567024
  const content = <Content { ...partsProps.content } altHash={ altHash } tooltipInteractive={ Boolean(highlightContext) }/>;

  return (
    <Container
      // we have to use the global classnames here, see theme/global.ts
      // otherwise, if we use sx prop, Chakra will generate the same styles for each instance of the component on the page
      className={ `${ props.className } address-entity ${ props.noCopy ? 'address-entity_no-copy' : '' }` }
      data-hash={ highlightContext && !props.isLoading ? props.address.hash : undefined }
      onMouseEnter={ highlightContext?.onMouseEnter }
      onMouseLeave={ highlightContext?.onMouseLeave }
      position="relative"
      zIndex={ 0 }
    >
      <Icon { ...partsProps.icon } tooltipInteractive={ Boolean(highlightContext) }/>
      { props.noLink ? content : <Link { ...partsProps.link }>{ content }</Link> }
      <Copy { ...partsProps.copy } altHash={ altHash } tooltipInteractive={ Boolean(highlightContext) }/>
    </Container>
  );
};

export default React.memo(chakra(AddressEntity));

export {
  Container,
  Link,
  Icon,
  Content,
  Copy,
};
