import React from 'react';

import type { FormSubmitResult } from './types';

import PublicTagsSubmitResult from './PublicTagsSubmitResult';

interface Props {
  data: FormSubmitResult;
}

const PublicTagsSubmitResultRecovery = ({ data }: Props) => {
  const [ showResult, setShowResult ] = React.useState(true);
  const handleEditClick = React.useCallback(() => setShowResult(false), []);

  return showResult ? (
    <PublicTagsSubmitResult data={ data } onEditClick={ handleEditClick }/>
  ) : (
    <div>Locked update form restored</div>
  );
};

export default PublicTagsSubmitResultRecovery;
