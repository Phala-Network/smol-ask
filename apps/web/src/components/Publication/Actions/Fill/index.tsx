import Loader from '@components/Shared/Loader';
import { RectangleStackIcon } from '@heroicons/react/24/outline';
import { RectangleStackIcon as RectangleStackIconSolid } from '@heroicons/react/24/solid';
import { PUBLICATION } from '@lenster/data/tracking';
import type { ElectedMirror, Publication } from '@lenster/lens';
import humanize from '@lenster/lib/humanize';
import nFormatter from '@lenster/lib/nFormatter';
import { Modal, Tooltip } from '@lenster/ui';
import { Leafwatch } from '@lib/leafwatch';
import { plural, t } from '@lingui/macro';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { FC } from 'react';
import { useEffect, useState } from 'react';

const FillModule = dynamic(() => import('./FillModule'), {
  loading: () => <Loader message={t`Loading smol ask...`} />
});

interface FillProps {
  publication: Publication;
  // TODO change to Fill
  electedMirror?: ElectedMirror;
  showCount: boolean;
}

const Fill: FC<FillProps> = ({ publication, electedMirror, showCount }) => {
  const [count, setCount] = useState(0);
  const [showFillModal, setShowFillModal] = useState(false);
  const isMirror = publication.__typename === 'Mirror';
  // TODO change to isFill
  const hasFilled = isMirror
    ? publication?.mirrorOf?.hasCollectedByMe
    : publication?.hasCollectedByMe;

  useEffect(() => {
    if (
      isMirror
        ? publication?.mirrorOf?.stats?.totalAmountOfCollects
        : publication?.stats?.totalAmountOfCollects
    ) {
      setCount(
        publication.__typename === 'Mirror'
          ? publication?.mirrorOf?.stats?.totalAmountOfCollects
          : publication?.stats?.totalAmountOfCollects
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publication]);

  const iconClassName = showCount
    ? 'w-[17px] sm:w-[20px]'
    : 'w-[15px] sm:w-[18px]';

  return (
    <>
      <div className="flex items-center space-x-1 text-red-500">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setShowFillModal(true);
            Leafwatch.track(PUBLICATION.FILL_MODULE.OPEN_FILL);
          }}
          aria-label="Fill smol ask"
        >
          <div className="rounded-full p-1.5 hover:bg-red-300/20">
            <Tooltip
              placement="top"
              content={`${humanize(count)} ${plural(count, {
                zero: 'Fill',
                one: 'Fill',
                other: 'Fills'
              })}`}
              withDelay
            >
              {hasFilled ? (
                <RectangleStackIconSolid className={iconClassName} />
              ) : (
                <RectangleStackIcon className={iconClassName} />
              )}
            </Tooltip>
          </div>
        </motion.button>
        {count > 0 && !showCount ? (
          <span className="text-[11px] sm:text-xs">{nFormatter(count)}</span>
        ) : null}
      </div>
      <Modal
        title={t`Fill`}
        icon={<RectangleStackIcon className="text-brand h-5 w-5" />}
        show={showFillModal}
        onClose={() => setShowFillModal(false)}
      >
        <FillModule
          electedMirror={electedMirror}
          publication={publication}
          count={count}
          setCount={setCount}
        />
      </Modal>
    </>
  );
};

export default Fill;
