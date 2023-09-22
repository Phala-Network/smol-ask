import MenuTransition from '@components/Shared/MenuTransition';
import { Menu } from '@headlessui/react';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import type { AnyPublication } from '@lenster/lens';
import humanize from '@lenster/lib/humanize';
import nFormatter from '@lenster/lib/nFormatter';
import { isMirrorPublication } from '@lenster/lib/publicationHelpers';
import stopEventPropagation from '@lenster/lib/stopEventPropagation';
import { Spinner, Tooltip } from '@lenster/ui';
import cn from '@lenster/ui/cn';
import { t } from '@lingui/macro';
import type { FC } from 'react';
import { Fragment, useState } from 'react';

import Mirror from './Mirror';
import Quote from './Quote';

interface PublicationMenuProps {
  publication: AnyPublication;
  showCount: boolean;
}

const ShareMenu: FC<PublicationMenuProps> = ({ publication, showCount }) => {
  const [isLoading, setIsLoading] = useState(false);

  const targetPublication = isMirrorPublication(publication)
    ? publication?.mirrorOn
    : publication;

  const count = targetPublication.stats.mirrors;
  const mirrored = targetPublication.operations.hasMirrored;
  const iconClassName = 'w-[15px] sm:w-[18px]';

  return (
    <div className="flex items-center space-x-1">
      <Menu as="div" className="relative">
        <Menu.Button as={Fragment}>
          <button
            className={cn(
              mirrored ? 'text-green-500' : 'text-brand',
              'rounded-full p-1.5 hover:bg-gray-300/20'
            )}
            onClick={stopEventPropagation}
            aria-label="Mirror"
          >
            {isLoading ? (
              <Spinner
                variant={mirrored ? 'success' : 'primary'}
                size="xs"
                className="mr-0.5"
              />
            ) : (
              <Tooltip
                placement="top"
                content={count > 0 ? t`${humanize(count)} Mirrors` : t`Mirror`}
                withDelay
              >
                <ArrowsRightLeftIcon className={iconClassName} />
              </Tooltip>
            )}
          </button>
        </Menu.Button>
        <MenuTransition>
          <Menu.Items
            className="absolute z-[5] mt-1 w-max rounded-xl border bg-white shadow-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            static
          >
            <Mirror
              publication={publication}
              setIsLoading={setIsLoading}
              isLoading={isLoading}
            />
            <Quote publication={publication} />
          </Menu.Items>
        </MenuTransition>
      </Menu>
      {count > 0 && !showCount ? (
        <span
          className={cn(
            mirrored ? 'text-green-500' : 'text-brand',
            'text-[11px] sm:text-xs'
          )}
        >
          {nFormatter(count)}
        </span>
      ) : null}
    </div>
  );
};

export default ShareMenu;
