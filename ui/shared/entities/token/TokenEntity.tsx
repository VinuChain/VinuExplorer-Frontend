import type { BoxProps } from '@chakra-ui/react';
import { chakra } from '@chakra-ui/react';
import React from 'react';

import type { TokenInfo } from 'types/api/token';

import { route } from 'nextjs/routes';

import config from 'configs/app';
import { useMultichainContext } from 'lib/contexts/multichain';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { Tooltip } from 'toolkit/chakra/tooltip';
import { TruncatedTextTooltip } from 'toolkit/components/truncation/TruncatedTextTooltip';
import * as EntityBase from 'ui/shared/entities/base/components';
import getChainTooltipText from 'ui/shared/externalChains/getChainTooltipText';
import IconSvg from 'ui/shared/IconSvg';
import TokenLogoPlaceholder from 'ui/shared/TokenLogoPlaceholder';

import { distributeEntityProps, getIconProps } from '../base/utils';

type LinkProps = EntityBase.LinkBaseProps & Pick<EntityProps, 'token'>;

const Link = chakra((props: LinkProps) => {
  const defaultHref = route(
    { pathname: '/token/[hash]', query: { ...props.query, hash: props.token.address_hash } },
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

type IconProps = Pick<EntityProps, 'token' | 'className'> & EntityBase.IconBaseProps;

// Negative cache for vinuchain-lists icons, so scrolling a token list does not
// re-request raw.githubusercontent.com for the same missing token on every
// mount.
//
// It expires, because an <img> error event carries no HTTP status: a transient
// network failure, a GitHub 5xx and a real 404 are indistinguishable here.
// Remembering them forever meant one blip hid that token's icon for the rest of
// the session. A short TTL keeps the request saving for a genuine 404 while
// letting a transient failure heal itself.
// ponytail: TTL map, a registry-backed allowlist would remove the first request too.
const MISSING_ICON_TTL_MS = 5 * 60 * 1000;
const missingListIcons = new Map<string, number>();

function isListIconMissing(addressHash: string) {
  const seenAt = missingListIcons.get(addressHash);

  if (seenAt === undefined) {
    return false;
  }

  if (Date.now() - seenAt < MISSING_ICON_TTL_MS) {
    return true;
  }

  missingListIcons.delete(addressHash);
  return false;
}

function markListIconMissing(addressHash: string) {
  // Sweep on write as well as on read. isListIconMissing/1 drops an entry only
  // when that same address is rendered again, so a token list whose icons all
  // fail once would hold every one of those addresses for the rest of the
  // session even after the TTL passed - the TTL bounded staleness but not
  // memory. Writes only happen on an icon error, so this scan is rare and the
  // map it walks is small.
  const now = Date.now();

  for (const [ hash, seenAt ] of missingListIcons) {
    if (now - seenAt >= MISSING_ICON_TTL_MS) {
      missingListIcons.delete(hash);
    }
  }

  missingListIcons.set(addressHash, now);
}

const Icon = (props: IconProps) => {
  const addressHash = props.token.address_hash;
  const handleListIconError = React.useCallback(() => {
    markListIconMissing(addressHash);
  }, [ addressHash ]);

  if (props.noIcon) {
    return null;
  }

  const styles = {
    ...getIconProps(props, Boolean(props.shield ?? props.chain)),
    borderRadius: props.token.type === 'ERC-20' ? 'full' : 'base',
  };

  const vinuchainListsUrl = isListIconMissing(addressHash) ?
    undefined :
    `https://raw.githubusercontent.com/VinuChain/vinuchain-lists/main/tokens/${ addressHash }/${ addressHash }.png`;
  const iconSrc = props.token.icon_url ?? vinuchainListsUrl;

  return (
    <EntityBase.Icon
      { ...styles }
      className={ props.className }
      src={ iconSrc }
      onError={ props.token.icon_url ? undefined : handleListIconError }
      alt={ `${ props.token.name || 'token' } logo` }
      fallback={ <TokenLogoPlaceholder/> }
      shield={ props.shield ?? (props.chain ? { src: props.chain.logo } : undefined) }
      hint={ props.chain && props.shield !== false ? getChainTooltipText(props.chain, 'Token on ') : undefined }
      { ...props }
    />
  );
};

type ContentProps = Omit<EntityBase.ContentBaseProps, 'text'> & Pick<EntityProps, 'token' | 'jointSymbol' | 'onlySymbol'>;

const Content = chakra((props: ContentProps) => {
  const nameString = [
    !props.onlySymbol && (props.token.name ?? 'Unnamed token'),
    props.onlySymbol && (props.token.symbol ?? props.token.name ?? 'Unnamed token'),
    props.token.symbol && props.jointSymbol && !props.onlySymbol && `(${ props.token.symbol })`,
  ].filter(Boolean).join(' ');

  return (
    <EntityBase.Content
      { ...props }
      text={ nameString }
      truncation="tail"
    />
  );
});

type SymbolProps = Pick<EntityProps, 'token' | 'isLoading' | 'noSymbol' | 'jointSymbol' | 'onlySymbol'>;

const Symbol = (props: SymbolProps) => {
  const symbol = props.token.symbol;

  if (!symbol || props.noSymbol || props.jointSymbol || props.onlySymbol) {
    return null;
  }

  return (
    <Skeleton
      loading={ props.isLoading }
      display="inline-flex"
      alignItems="center"
      maxW="20%"
      ml={ 2 }
      color="text.secondary"
    >
      <div>(</div>
      <TruncatedTextTooltip label={ symbol }>
        <chakra.span
          display="inline-block"
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
          height="fit-content"
        >
          { symbol }
        </chakra.span>
      </TruncatedTextTooltip>
      <div>)</div>
    </Skeleton>
  );
};

type CopyProps = Omit<EntityBase.CopyBaseProps, 'text'> & Pick<EntityProps, 'token'>;

const Copy = (props: CopyProps) => {
  return (
    <EntityBase.Copy
      { ...props }
      text={ props.token.address_hash }
    />
  );
};

const Container = EntityBase.Container;

interface ReputationProps extends BoxProps {
  value: TokenInfo['reputation'];
}

const Reputation = ({ value, ...rest }: ReputationProps) => {
  if (config.UI.views.token.hideScamTokensEnabled && value === 'scam') {
    return (
      <Tooltip content="This token has been flagged as a potential scam. You enabled the display of flagged tokens in the explorer — proceed with caution.">
        <IconSvg name="scam" boxSize={ 5 } ml={ 2 } { ...rest }/>
      </Tooltip>
    );
  }

  return null;
};

export interface EntityProps extends EntityBase.EntityBaseProps {
  token: Pick<TokenInfo, 'address_hash' | 'icon_url' | 'name' | 'symbol' | 'type' | 'reputation'>;
  noSymbol?: boolean;
  jointSymbol?: boolean;
  onlySymbol?: boolean;
}

const TokenEntity = (props: EntityProps) => {
  const multichainContext = useMultichainContext();
  const partsProps = distributeEntityProps(props, multichainContext);

  const content = <Content { ...partsProps.content }/>;

  return (
    <Container w="100%" { ...partsProps.container }>
      <Icon { ...partsProps.icon }/>
      { props.noLink ? content : <Link { ...partsProps.link }>{ content }</Link> }
      <Symbol { ...partsProps.symbol }/>
      <Copy { ...partsProps.copy }/>
      <Reputation value={ props.token.reputation }/>
    </Container>
  );
};

export default React.memo(chakra(TokenEntity));

export {
  Container,
  Link,
  Icon,
  Content,
  Copy,
  Reputation,
};
