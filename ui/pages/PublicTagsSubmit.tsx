import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import React from 'react';

import type { TabItemRegular } from 'toolkit/components/AdaptiveTabs/types';
import type { PublicTagType } from 'types/api/addressMetadata';
import type { FormSubmitResult } from 'ui/publicTags/submit/types';

import appConfig from 'configs/app';
import useApiQuery from 'lib/api/useApiQuery';
import { ContentLoader } from 'toolkit/components/loaders/ContentLoader';
import RoutedTabs from 'toolkit/components/RoutedTabs/RoutedTabs';
import PublicTagApplicationsList from 'ui/publicTags/list/PublicTagApplicationsList';
import PublicTagsSubmitForm from 'ui/publicTags/submit/PublicTagsSubmitForm';
import PublicTagsSubmitResult from 'ui/publicTags/submit/PublicTagsSubmitResult';
import { isUpdateMode } from 'ui/publicTags/submit/utils';
import AccountPageDescription from 'ui/shared/AccountPageDescription';
import PageTitle from 'ui/shared/Page/PageTitle';
import useProfileQuery from 'ui/snippets/auth/useProfileQuery';
import useRedirectForInvalidAuthToken from 'ui/snippets/auth/useRedirectForInvalidAuthToken';

// Fallback tag types when the metadata service is not configured.
//
// Keep in lockstep with vinuexplorer-backend
// Explorer.Account.PublicTagSubmission.TagTypes — the metadata service
// may be down or disabled at boot, in which case this fallback is the
// *only* source of allowed tag_types. Missing an entry here silently
// drops the matching curated dropdown option
// (PublicTagsSubmitFieldTagType intersects ALLOWED_CATEGORY_TYPES
// against the resolved tagTypes).
const DEFAULT_TAG_TYPES: Array<PublicTagType> = [
  { id: 'generic', type: 'generic', description: 'General tag' },
  { id: 'protocol', type: 'protocol', description: 'Protocol or dApp tag' },
  { id: 'project', type: 'project', description: 'Project or ecosystem tag' },
  { id: 'smart_contract', type: 'smart_contract', description: 'Smart contract category tag' },
  { id: 'meme', type: 'meme', description: 'Meme token or community project tag' },
  { id: 'stablecoin', type: 'stablecoin', description: 'Stablecoin token tag' },
  { id: 'layer_1', type: 'layer_1', description: 'Layer 1 token tag' },
  { id: 'layer_2', type: 'layer_2', description: 'Layer 2 token tag' },
  { id: 'exchange', type: 'exchange', description: 'Exchange address tag' },
  { id: 'liquidity_pool', type: 'liquidity_pool', description: 'Liquidity pool contract tag' },
  { id: 'defi', type: 'defi', description: 'DeFi protocol address tag' },
  { id: 'burn', type: 'burn', description: 'Burn address tag' },
];

const PublicTagsSubmit = () => {
  const [ submitResult, setSubmitResult ] = React.useState<FormSubmitResult>();

  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useProfileQuery();
  useRedirectForInvalidAuthToken();
  const updateMode = isUpdateMode(router.query);
  const pageTitle = updateMode ? 'Request a name tag update' : 'Request a public tag/label';

  const configQuery = useApiQuery('metadata:public_tag_types', {
    queryOptions: {
      enabled: !profileQuery.isLoading && appConfig.features.addressMetadata.isEnabled,
    },
  });

  const handleFormSubmitResult = React.useCallback(async(result: FormSubmitResult) => {
    setSubmitResult(result);

    if (result.every((r) => r.status === 'ok')) {
      try {
        await queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'admin:public_tag_applications_list',
        });
      } catch { /* non-fatal — list query refetches on tab mount anyway */ }
      router.push(
        { pathname: '/public-tags/submit', query: { tab: 'my-requests' } },
        undefined,
        { shallow: true },
      );
    }
  }, [ queryClient, router ]);

  const handleTabsValueChange = React.useCallback(({ value }: { value: string }) => {
    if (value === 'submit-tag') {
      setSubmitResult(undefined);
    }
  }, []);

  const handleAddNewTagClick = React.useCallback(() => {
    handleTabsValueChange({ value: 'submit-tag' });
  }, [ handleTabsValueChange ]);

  const handleEditFailedSubmission = React.useCallback(() => {
    setSubmitResult(undefined);
  }, []);

  const tagTypes = configQuery.data?.tagTypes ?? DEFAULT_TAG_TYPES;

  const tabs: Array<TabItemRegular> = React.useMemo(() => [
    {
      id: 'submit-tag',
      title: updateMode ? 'Update name tag' : 'Submit new tag',
      component: submitResult ? (
        <PublicTagsSubmitResult
          data={ submitResult }
          onAddNewTagClick={ handleAddNewTagClick }
          onEditClick={ handleEditFailedSubmission }
        />
      ) : (
        <PublicTagsSubmitForm
          config={{ tagTypes }}
          onSubmitResult={ handleFormSubmitResult }
          userInfo={ profileQuery.data }
        />
      ),
    },
    {
      id: 'my-requests',
      title: 'My requests',
      component: <PublicTagApplicationsList/>,
    },
  ], [
    submitResult,
    handleAddNewTagClick,
    handleEditFailedSubmission,
    tagTypes,
    handleFormSubmitResult,
    profileQuery.data,
    updateMode,
  ]);

  if (router.isReady === false || profileQuery.isLoading || (appConfig.features.addressMetadata.isEnabled && configQuery.isPending)) {
    return (
      <>
        <PageTitle title={ pageTitle }/>
        <ContentLoader/>
      </>
    );
  }

  if (!profileQuery.data) {
    return (
      <>
        <PageTitle title={ pageTitle }/>
        <AccountPageDescription>
          Please sign in to { updateMode ? 'request this name tag update' : 'submit a public tag/label request' } and see your prior submissions.
        </AccountPageDescription>
      </>
    );
  }

  return (
    <>
      <PageTitle title={ pageTitle }/>
      <RoutedTabs
        tabs={ tabs }
        defaultTabId="submit-tag"
        onValueChange={ handleTabsValueChange }
      />
    </>
  );
};

export default PublicTagsSubmit;
