import { Box, chakra, Flex, SimpleGrid, Text } from '@chakra-ui/react';
import React from 'react';

import type { LabelDirectoryCategory } from 'types/api/labelDirectory';
import type { EntityTag as TEntityTag, EntityTagType } from 'ui/shared/EntityTags/types';

import { route } from 'nextjs-routes';

import useApiQuery from 'lib/api/useApiQuery';
import { Link } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import DataListDisplay from 'ui/shared/DataListDisplay';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import { CATEGORY_BROWSE_SLUG, getCategoryLabel } from 'ui/shared/EntityTags/utils';
import PageTitle from 'ui/shared/Page/PageTitle';

// Placeholder rendered while the categories list is loading so the
// page reserves layout space identical to the loaded state.
const SKELETON_CATEGORIES: Array<LabelDirectoryCategory> = [
  { tag_type: 'project', display_name: 'Project', count: 0 },
  { tag_type: 'meme', display_name: 'Meme', count: 0 },
  { tag_type: 'stablecoin', display_name: 'Stablecoin', count: 0 },
  { tag_type: 'liquidity_pool', display_name: 'Liquidity Pool', count: 0 },
  { tag_type: 'exchange', display_name: 'Exchange', count: 0 },
  { tag_type: 'protocol', display_name: 'Protocol', count: 0 },
];

interface LabelCardProps {
  category: LabelDirectoryCategory;
  isLoading: boolean;
}

const LabelCard = ({ category, isLoading }: LabelCardProps) => {
  const displayName = getCategoryLabel(category.tag_type as EntityTagType) || category.display_name;
  const href = route({
    pathname: '/accounts/label/[slug]',
    query: {
      slug: CATEGORY_BROWSE_SLUG,
      tagType: category.tag_type,
      tagName: displayName,
    },
  });

  const tagData: TEntityTag = {
    tagType: category.tag_type as EntityTagType,
    slug: CATEGORY_BROWSE_SLUG,
    name: displayName,
    ordinal: 0,
  };

  return (
    <Link
      href={ href }
      _hover={{ textDecoration: 'none', borderColor: 'border.divider.hover' }}
      borderWidth="1px"
      borderColor="border.divider"
      borderRadius="md"
      p={ 4 }
      display="block"
      transition="border-color 120ms"
    >
      <Flex direction="column" rowGap={ 3 }>
        <Flex alignItems="center" columnGap={ 2 } flexWrap="wrap">
          <EntityTag data={ tagData } isLoading={ isLoading } noLink renderMode="name"/>
        </Flex>
        <Skeleton loading={ isLoading } display="inline-block">
          <Text color="text.secondary" textStyle="sm">
            { category.count } { category.count === 1 ? 'address' : 'addresses' }
          </Text>
        </Skeleton>
      </Flex>
    </Link>
  );
};

const LabelsDirectory = () => {
  const { data, isError, isPlaceholderData } = useApiQuery('general:labels_categories', {
    queryOptions: {
      placeholderData: { categories: SKELETON_CATEGORIES },
    },
  });

  const categories = data?.categories ?? [];

  const content = categories.length ? (
    <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} gap={ 4 }>
      { categories.map((category) => (
        <LabelCard
          key={ category.tag_type }
          category={ category }
          isLoading={ isPlaceholderData }
        />
      )) }
    </SimpleGrid>
  ) : null;

  const subtitle = (
    <Box maxW="760px" textStyle="sm" color="text.secondary" mt={ 1 }>
      <chakra.p>
        Browse addresses by category label. Click a label to see every address tagged with it
        — exchanges, liquidity pools, projects, and more. Submit a new tag via{ ' ' }
        <Link href={ route({ pathname: '/public-tags/submit' }) } variant="underlaid">
          Public tags
        </Link>.
      </chakra.p>
    </Box>
  );

  return (
    <>
      <PageTitle title="Labels" withTextAd/>
      { subtitle }
      <Box mt={ 6 }>
        <DataListDisplay
          isError={ isError }
          itemsNum={ categories.length }
          emptyText="No label categories are configured yet."
        >
          { content }
        </DataListDisplay>
      </Box>
    </>
  );
};

export default LabelsDirectory;
