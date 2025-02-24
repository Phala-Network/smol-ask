import { Menu } from '@headlessui/react';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { PUBLICATION } from '@lenster/data/tracking';
import type { Publication } from '@lenster/lens';
import stopEventPropagation from '@lenster/lib/stopEventPropagation';
import cn from '@lenster/ui/cn';
import { Leafwatch } from '@lib/leafwatch';
import { Trans } from '@lingui/macro';
import Link from 'next/link';
import type { FC } from 'react';

interface TranslateProps {
  publication: Publication;
}

const Translate: FC<TranslateProps> = ({ publication }) => {
  const getGoogleTranslateUrl = (text: string): string => {
    return encodeURI(
      `https://translate.google.com/#auto|en|${encodeURIComponent(text)}`
    );
  };

  return (
    <Menu.Item
      as={Link}
      className={({ active }) =>
        cn(
          { 'dropdown-active': active },
          'm-2 block cursor-pointer rounded-lg px-2 py-1.5 text-sm'
        )
      }
      href={getGoogleTranslateUrl(publication?.metadata?.content)}
      onClick={(event) => {
        stopEventPropagation(event);
        Leafwatch.track(PUBLICATION.TRANSLATE, {
          publication_id: publication.id
        });
      }}
      target="_blank"
    >
      <div className="flex items-center space-x-2">
        <LanguageIcon className="h-4 w-4" />
        <div>
          <Trans>Translate</Trans>
        </div>
      </div>
    </Menu.Item>
  );
};

export default Translate;
