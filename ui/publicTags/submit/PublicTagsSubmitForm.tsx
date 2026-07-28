import { Box, chakra, Grid, GridItem, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import React from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm, FormProvider } from 'react-hook-form';

import type { FormFields, FormSubmitResult } from './types';
import type { UserInfo } from 'types/api/account';
import type { PublicTagTypesResponse } from 'types/api/addressMetadata';
import type { PublicTagApplicationRow } from 'types/api/publicTagSubmissions';

import appConfig from 'configs/app';
import useApiFetch from 'lib/api/useApiFetch';
import getErrorObj from 'lib/errors/getErrorObj';
import getErrorObjPayload from 'lib/errors/getErrorObjPayload';
import useIsMobile from 'lib/hooks/useIsMobile';
import { Alert } from 'toolkit/chakra/alert';
import { Button } from 'toolkit/chakra/button';
import { Heading } from 'toolkit/chakra/heading';
import { FormFieldEmail } from 'toolkit/components/forms/fields/FormFieldEmail';
import { FormFieldRadio } from 'toolkit/components/forms/fields/FormFieldRadio';
import { FormFieldText } from 'toolkit/components/forms/fields/FormFieldText';
import { FormFieldUrl } from 'toolkit/components/forms/fields/FormFieldUrl';
import { Hint } from 'toolkit/components/Hint/Hint';
import ReCaptcha from 'ui/shared/reCaptcha/ReCaptcha';
import useReCaptcha from 'ui/shared/reCaptcha/useReCaptcha';

import PublicTagsSubmitFieldAddresses from './fields/PublicTagsSubmitFieldAddresses';
import PublicTagsSubmitFieldTags from './fields/PublicTagsSubmitFieldTags';
import PublicTagsUpdateFields from './fields/PublicTagsUpdateFields';
import {
  convertFormDataToRequestsBody,
  convertUpdateFormDataToRequestBody,
  getFormDefaultValues,
  getUpdateTarget,
  isUpdateMode,
} from './utils';

interface Props {
  config?: PublicTagTypesResponse | undefined;
  userInfo?: UserInfo | undefined;
  onSubmitResult: (result: FormSubmitResult) => void;
}

const PublicTagsSubmitForm = ({ config, userInfo, onSubmitResult }: Props) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const apiFetch = useApiFetch();
  const recaptcha = useReCaptcha();
  const updateMode = isUpdateMode(router.query);
  const updateTarget = getUpdateTarget(router.query);
  const updateTargetAddress = updateTarget?.address;
  const updateTargetDisplayName = updateTarget?.displayName;
  const updateTargetLabel = updateTarget?.label;

  const formApi = useForm<FormFields>({
    mode: 'onBlur',
    defaultValues: getFormDefaultValues(router.query, userInfo),
  });

  const ownership = formApi.watch('ownership');
  const showAddressSource = ownership === 'not_owner';

  // React Hook Form retains values for unmounted fields by default
  // (shouldUnregister=false). Without this, a user who selects
  // "not owner", types into addressSource, then switches back to
  // "owner" would silently submit the hidden value as moderator
  // metadata even though the UI implies it has been excluded.
  React.useEffect(() => {
    if (!showAddressSource) {
      formApi.unregister('addressSource');
    }
  }, [ showAddressSource, formApi ]);

  React.useEffect(() => {
    if (
      router.query.addresses ||
      router.query.requesterName ||
      router.query.requesterEmail ||
      router.query.companyName ||
      router.query.companyWebsite
    ) {
      router.replace({
        pathname: '/public-tags/submit',
        query: updateTargetAddress && updateTargetDisplayName && updateTargetLabel ? {
          submissionType: 'update',
          address: updateTargetAddress,
          tagLabel: updateTargetLabel,
          tagName: updateTargetDisplayName,
        } : undefined,
      }, undefined, { shallow: true });
    }
  }, [ router, updateTargetAddress, updateTargetDisplayName, updateTargetLabel ]);

  const onFormSubmit: SubmitHandler<FormFields> = React.useCallback(async(data) => {
    formApi.clearErrors('root');
    const requestsBody = updateTarget ?
      [ convertUpdateFormDataToRequestBody(data, updateTarget) ] :
      convertFormDataToRequestsBody(data);

    if (updateTarget && Object.keys(requestsBody[0].meta).length === 0) {
      formApi.setError('root', {
        type: 'validate',
        message: 'Enter at least one visual change before sending your request.',
      });
      return;
    }

    const result: FormSubmitResult = [];

    for (const body of requestsBody) {
      const token = await recaptcha.executeAsync();

      if (!token) {
        throw new Error('ReCaptcha is not solved');
      }

      const item = await apiFetch<'admin:public_tag_application', PublicTagApplicationRow, { message: string }>(
        'admin:public_tag_application', {
          pathParams: { chainId: appConfig.chain.id },
          fetchParams: {
            method: 'POST',
            body: { submission: body, recaptcha_response: token },
            headers: { 'recaptcha-v2-response': token },
          },
        })
        .then((result) => {
          const submission = result as PublicTagApplicationRow;
          return { status: 'ok' as const, payload: body, submission };
        })
        .catch((error: unknown) => {
          const errorObj = getErrorObj(error);
          const messageFromPayload = getErrorObjPayload<{ message?: string }>(errorObj)?.message;
          const messageFromError = errorObj && 'message' in errorObj && typeof errorObj.message === 'string' ? errorObj.message : undefined;
          const message = messageFromPayload || messageFromError || 'Something went wrong.';
          return { status: 'error' as const, payload: body, error: message };
        });

      result.push(item);
    }

    onSubmitResult(result);
  }, [ apiFetch, formApi, onSubmitResult, recaptcha, updateTarget ]);

  if (!appConfig.services.reCaptchaV2.siteKey) {
    return null;
  }

  if (updateMode && !updateTarget) {
    return (
      <Alert status="error">
        This update link is incomplete. Return to the address page and choose the tag update action again.
      </Alert>
    );
  }

  return (
    <FormProvider { ...formApi }>
      <chakra.form
        noValidate
        onSubmit={ formApi.handleSubmit(onFormSubmit) }
      >
        <Grid
          columnGap={ 3 }
          rowGap={ 3 }
          templateColumns={{ base: '1fr', lg: '1fr 1fr minmax(0, 200px)', xl: '1fr 1fr minmax(0, 250px)' }}
        >
          <GridItem colSpan={{ base: 1, lg: 3 }}>
            <Heading level="2">
              { updateTarget ? 'Your details' : 'Company info' }
            </Heading>
          </GridItem>
          <FormFieldText<FormFields> name="requesterName" required placeholder="Your name"/>
          <FormFieldEmail<FormFields> name="requesterEmail" required/>

          { !isMobile && <div/> }
          <FormFieldText<FormFields> name="companyName" placeholder="Company name"/>
          <FormFieldUrl<FormFields> name="companyWebsite" placeholder="Company website"/>
          { !isMobile && <div/> }

          { updateTarget ? (
            <>
              <GridItem colSpan={{ base: 1, lg: 3 }} mt={{ base: 3, lg: 5 }}>
                <Heading level="2">Name tag to update</Heading>
              </GridItem>
              <GridItem colSpan={{ base: 1, lg: 3 }}>
                <Box
                  borderWidth="1px"
                  borderColor="border.divider"
                  borderRadius="base"
                  px={{ base: 3, lg: 4 }}
                  py={ 3 }
                  data-testid="public-tag-update-target"
                >
                  <Text fontWeight={ 600 }>{ updateTarget.displayName }</Text>
                  { updateTarget.displayName !== updateTarget.label && (
                    <Text color="text.secondary" fontSize="sm">Tag label: { updateTarget.label }</Text>
                  ) }
                  <Text color="text.secondary" fontSize="sm" overflowWrap="anywhere">
                    { updateTarget.address }
                  </Text>
                </Box>
              </GridItem>
              <GridItem colSpan={{ base: 1, lg: 3 }} mt={{ base: 3, lg: 5 }}>
                <Heading level="2">Visual changes</Heading>
              </GridItem>
              <PublicTagsUpdateFields/>
            </>
          ) : (
            <>
              <GridItem colSpan={{ base: 1, lg: 3 }} mt={{ base: 3, lg: 5 }}>
                <Heading level="2" display="flex" alignItems="center" columnGap={ 1 }>
                  Public tags/labels
                  <Hint label="Submit a public tag proposal for our moderation team to review"/>
                </Heading>
              </GridItem>
              <GridItem colSpan={{ base: 1, lg: 3 }}>
                <chakra.div fontSize="sm" fontWeight={ 500 } mb={ 2 }>
                  Do you own this address? <chakra.span color="red.500">*</chakra.span>
                </chakra.div>
                <FormFieldRadio<FormFields, 'ownership'>
                  name="ownership"
                  rules={{ required: 'Please answer the ownership question' }}
                  options={ [
                    { value: 'owner', label: 'This is my personal/project address' },
                    { value: 'not_owner', label: 'This is not my address' },
                  ] }
                />
              </GridItem>
              { showAddressSource && (
                <>
                  <GridItem colSpan={{ base: 1, lg: 2 }} minW={ 0 }>
                    <FormFieldText<FormFields>
                      name="addressSource"
                      placeholder="Where did you discover this address? (optional — paste a link or describe)"
                      rules={{ maxLength: 500 }}
                    />
                  </GridItem>
                  { !isMobile && <div/> }
                </>
              ) }
              <PublicTagsSubmitFieldAddresses/>
              <PublicTagsSubmitFieldTags tagTypes={ config?.tagTypes }/>
              <GridItem colSpan={{ base: 1, lg: 2 }}>
                <FormFieldText<FormFields>
                  name="description"
                  required
                  placeholder={
                    isMobile ?
                      'Confirm the connection between addresses and tags' :
                      'Provide a comment to confirm the connection between addresses and tags (max 500 characters)'
                  }
                  maxH="160px"
                  rules={{ maxLength: 500 }}
                  asComponent="Textarea"
                  size="2xl"
                />
              </GridItem>
            </>
          ) }

          { formApi.formState.errors.root?.message && (
            <GridItem colSpan={{ base: 1, lg: 3 }}>
              <Alert status="error">{ formApi.formState.errors.root.message }</Alert>
            </GridItem>
          ) }

          <GridItem colSpan={{ base: 1, lg: 2 }}>
            <ReCaptcha { ...recaptcha }/>
          </GridItem>
          { !isMobile && <div/> }

          <Button
            variant="solid"
            type="submit"
            mt={ 3 }
            loading={ formApi.formState.isSubmitting }
            loadingText={ updateTarget ? 'Sending update request' : 'Send request' }
            w="min-content"
            disabled={ recaptcha.isInitError }
          >
            { updateTarget ? 'Send update request' : 'Send request' }
          </Button>
        </Grid>
      </chakra.form>
    </FormProvider>
  );
};

export default React.memo(PublicTagsSubmitForm);
