import { LifebuoyIcon } from '@heroicons/react/24/outline';
import { LifebuoyIcon as LifebuoyIconSolid } from '@heroicons/react/24/solid';
import { PUBLICATION } from '@lenster/data/tracking';
import type { ElectedMirror, Publication } from '@lenster/lens';
import humanize from '@lenster/lib/humanize';
import nFormatter from '@lenster/lib/nFormatter';
import { Modal, Tooltip } from '@lenster/ui';
import { Leafwatch } from '@lib/leafwatch';
import { plural, t } from '@lingui/macro';
import { motion } from 'framer-motion';
import type { FC } from 'react';
import { useState } from 'react';

interface FillProps {
  publication: Publication;
  token: string;
  fillAmount: number;
  electedMirror?: ElectedMirror;
  showCount: boolean;
}

const Fill: FC<FillProps> = ({ publication, token, fillAmount }) => {
  const [count, setCount] = useState(0);
  const [showFillModal, setShowFillModal] = useState(false);
  const showCount = false;
  const hasFilled = false;

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
                <LifebuoyIconSolid className={iconClassName} />
              ) : (
                <LifebuoyIcon className={iconClassName} />
              )}
            </Tooltip>
          </div>
        </motion.button>
        {count > 0 && false ? (
          <span className="text-[11px] sm:text-xs">{nFormatter(count)}</span>
        ) : null}
      </div>
      <Modal
        title={t`Fill`}
        icon={<LifebuoyIcon className="text-brand h-5 w-5" />}
        show={showFillModal}
        onClose={() => setShowFillModal(false)}
      >
        <div className="create-ask">
          <div className="div">
            <div className="group">
              <div className="frame">
                <div className="text-wrapper">Transaction Details</div>
              </div>
            </div>
            <div className="overlap-wrapper">
              <div className="overlap">
                <div className="overlap-group-wrapper">
                  <div className="overlap-group">
                    <div className="frame-wrapper">
                      <div className="div-wrapper">
                        <div className="text-wrapper-2">🔥 60 seconds...</div>
                      </div>
                    </div>
                    <div className="frame-2">
                      <div className="text-wrapper-3">120s</div>
                    </div>
                  </div>
                </div>
                <div className="frame-3">
                  <div className="text-wrapper-2">Smol Ask Details</div>
                </div>
                <div className="group-2">
                  <div className="approve-funds">APPROVE FUNDS</div>
                  <div className="text-wrapper-4">1000 $PHA ERC20</div>
                  <div className="element-sdfasasf">0X.....SDFASASF</div>
                  <div className="element-xcvx">0X.....XCVX</div>
                  <div className="USDC">?&nbsp;&nbsp;$USDC</div>
                  <div className="TOP-bidder">TOP BIDDER</div>
                  <div className="to-AA-contract">TO AA CONTRACT</div>
                  <div className="to-get">TO GET</div>
                  <div className="with">WITH</div>
                  <img className="image" alt="Image" src="image-1.png" />
                  <img className="img" alt="Image" src="image.png" />
                </div>
              </div>
            </div>
            <div className="frame-4">
              <div className="frame-5">
                <div className="text-wrapper">solver-1</div>
              </div>
              <div className="tx">TX</div>
              <div className="approve-funds-2">APPROVE FUNDS</div>
              <div className="text-wrapper-5">1000 $PHA ERC20</div>
              <div className="offer">OFFER</div>
              <div className="element-usdc">800 USDC</div>
              <div className="element-sdsdf">0X...SDSDF</div>
            </div>
            <div className="frame-6">
              <div className="frame-5">
                <div className="text-wrapper">solver-2</div>
              </div>
              <div className="tx">TX</div>
              <div className="approve-funds-2">APPROVE FUNDS</div>
              <div className="text-wrapper-5">1000 $PHA ERC20</div>
              <div className="offer">OFFER</div>
              <div className="element-usdc">800 USDC</div>
              <div className="element-sdsdf">0X...SDSDF</div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Fill;
