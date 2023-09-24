import Slug from '@components/Shared/Slug';
import { UsersIcon } from '@heroicons/react/24/outline';
import { Card } from '@lenster/ui';
import cn from '@lenster/ui/cn';
import type { FC } from 'react';

interface FillWarningProps {
  handle: string;
}

const FillWarning: FC<FillWarningProps> = ({ handle }) => {
  return (
    <Card
      className={cn(
        'flex items-center space-x-1.5 p-5 text-sm font-bold text-gray-500'
      )}
    >
      {
        <>
          <UsersIcon className="text-brand h-4 w-4" />
          <span>Only </span>
          <Slug slug={`${handle}'s`} prefix="@" />
          <span> followers can fill</span>
        </>
      }
    </Card>
  );
};

export default FillWarning;
