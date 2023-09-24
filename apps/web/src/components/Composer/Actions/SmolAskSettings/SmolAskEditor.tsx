import { ClockIcon } from '@heroicons/react/24/outline';
import { SparklesIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { Button, Card, Input, Modal, Tooltip } from '@lenster/ui';
import { Plural, t, Trans } from '@lingui/macro';
import type { FC } from 'react';
import { useState } from 'react';
import { usePublicationStore } from 'src/store/publication';

const SmolAskEditor: FC = () => {
  const setShowSmolAskEditor = usePublicationStore(
    (state) => state.setShowSmolAskEditor
  );
  const smolAskConfig = usePublicationStore((state) => state.smolAskConfig);
  const setSmolAskConfig = usePublicationStore(
    (state) => state.setSmolAskConfig
  );
  const resetSmolAskConfig = usePublicationStore(
    (state) => state.resetSmolAskConfig
  );
  const [showSmolAskLengthModal, setShowSmolAskLengthModal] = useState(false);

  return (
    <Card className="m-5 px-5 py-3" forceRounded>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm">
          <SparklesIcon className="text-brand h-4 w-4" />
          <b>Smol ask</b>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            size="sm"
            icon={<ClockIcon className="h-4 w-4" />}
            onClick={() => setShowSmolAskLengthModal(true)}
            outline
          >
            {smolAskConfig.length}{' '}
            <Plural
              value={smolAskConfig.length}
              zero="minute"
              one="minute"
              other="minutes"
            />
          </Button>
          <Modal
            title={t`Smol ask length`}
            icon={<ClockIcon className="text-brand h-5 w-5" />}
            show={showSmolAskLengthModal}
            onClose={() => setShowSmolAskLengthModal(false)}
          >
            <div className="p-5">
              <Input
                label={t`Smol ask length (minutes)`}
                type="number"
                value={smolAskConfig.length}
                min={1}
                max={86400}
                onChange={(e) =>
                  setSmolAskConfig({
                    ...smolAskConfig,
                    length: Number(e.target.value)
                  })
                }
              />
              <div className="flex space-x-2 pt-5">
                <Button
                  className="ml-auto"
                  variant="danger"
                  onClick={() => {
                    setSmolAskConfig({ ...smolAskConfig, length: 2 });
                    setShowSmolAskLengthModal(false);
                  }}
                  outline
                >
                  <Trans>Cancel</Trans>
                </Button>
                <Button
                  className="ml-auto"
                  variant="primary"
                  onClick={() => setShowSmolAskLengthModal(false)}
                >
                  <Trans>Save</Trans>
                </Button>
              </div>
            </div>
          </Modal>
          <Tooltip placement="top" content={t`Delete`}>
            <button
              className="flex"
              onClick={() => {
                resetSmolAskConfig();
                setShowSmolAskEditor(false);
              }}
            >
              <XCircleIcon className="h-5 w-5 text-red-400" />
            </button>
          </Tooltip>
        </div>
      </div>
      <div className="mt-3 space-y-4">
        <div key={0} className="flex items-center space-x-2 text-sm">
          <Input
            placeholder={t`CHAIN: MUMBAI, POLYGONZKEVM, LINEA, SCROLL`}
            value={smolAskConfig.choices[0]}
            onChange={(event) => {
              const choices = [event.target.value, smolAskConfig.choices[1]];
              setSmolAskConfig({ ...smolAskConfig, choices });
            }}

          />
        </div>
        <div key={1} className="flex items-center space-x-2 text-sm">
          <Input
            placeholder={t`ACTION: BUY, SELL, LEND, BORROW`}
            value='SELL'
            disabled={true}
          />
        </div>
        <div key={2} className="flex items-center space-x-2 text-sm">
          <Input
            placeholder={t`SELL ASSETS: ERC20, NFT`}
            value='MATIC'
            disabled={true}
          />
        </div>
        <div key={3} className="flex items-center space-x-2 text-sm">
          <Input
            placeholder={t`AMOUNT`}
            value={smolAskConfig.choices[1]}
            onChange={(event) => {
              const choices = [smolAskConfig.choices[0], event.target.value];
              setSmolAskConfig({ ...smolAskConfig, choices });
            }}
          />
        </div>
        <div key={4} className="flex items-center space-x-2 text-sm">
          <Input
            placeholder={t`BUY ASSETS: ERC20, NFT`}
            value='USDC'
            disabled={true}
          />
        </div>
        <div key={5} className="flex items-center space-x-2 text-sm">
          <Input
            placeholder={t`CONDITION: TTL, @LENS, MYFOLLOWERS`}
            // value=
            disabled={true}
          />
        </div>
      </div>
    </Card>
  );
};

export default SmolAskEditor;
