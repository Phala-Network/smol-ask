import {
  ExclamationTriangleIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { SETTINGS } from '@lenster/data/tracking';
import type { ApprovedAllowanceAmount } from '@lenster/lens';
import { useGenerateModuleCurrencyApprovalDataLazyQuery } from '@lenster/lens';
import { Button, Input, Modal, Spinner, WarningMessage } from '@lenster/ui';
import errorToast from '@lib/errorToast';
import getAllowanceModule from '@lib/getAllowanceModule';
import { Leafwatch } from '@lib/leafwatch';
import { t, Trans } from '@lingui/macro';
import type { Dispatch, FC, SetStateAction } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSendTransaction, useWaitForTransaction } from 'wagmi';

interface AllowanceButtonProps {
  title?: string;
  module: ApprovedAllowanceAmount;
  allowed: boolean;
  setAllowed: Dispatch<SetStateAction<boolean>>;
}

const AllowanceButton: FC<AllowanceButtonProps> = ({
  title = t`Allow`,
  module,
  allowed,
  setAllowed
}) => {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [generateAllowanceQuery, { loading: queryLoading }] =
    useGenerateModuleCurrencyApprovalDataLazyQuery();

  const onError = (error: any) => {
    errorToast(error);
  };

  const {
    data: txData,
    isLoading: transactionLoading,
    sendTransaction
  } = useSendTransaction({
    onError
  });

  const { isLoading: waitLoading } = useWaitForTransaction({
    hash: txData?.hash,
    onSuccess: () => {
      toast.success(
        allowed
          ? t`Module disabled successfully!`
          : t`Module enabled successfully!`
      );
      setShowWarningModal(false);
      setAllowed(!allowed);
      Leafwatch.track(SETTINGS.ALLOWANCE.TOGGLE, {
        module: module.module,
        currency: module.currency,
        allowed: !allowed
      });
    },
    onError
  });

  const handleAllowance = (
    currencies: string,
    value: string,
    selectedModule: string
  ) => {
    generateAllowanceQuery({
      variables: {
        request: {
          currency: currencies,
          value: value,
          [getAllowanceModule(module.module).field]: selectedModule
        }
      }
    }).then((res) => {
      const data = res?.data?.generateModuleCurrencyApprovalData;
      sendTransaction?.({
        account: data?.from,
        to: data?.to,
        data: data?.data
      });
    });
  };

  return allowed ? (
    <Button
      variant="warning"
      icon={
        queryLoading || transactionLoading || waitLoading ? (
          <Spinner variant="warning" size="xs" />
        ) : (
          <MinusIcon className="h-4 w-4" />
        )
      }
      onClick={() => handleAllowance(module.currency, '0', module.module)}
    >
      <Trans>Revoke</Trans>
    </Button>
  ) : (
    <>
      <Button
        icon={<PlusIcon className="h-4 w-4" />}
        onClick={() => setShowWarningModal(!showWarningModal)}
      >
        {title}
      </Button>
      <Modal
        title={t`Warning`}
        icon={<ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />}
        show={showWarningModal}
        onClose={() => setShowWarningModal(false)}
      >
        <div className="space-y-3 p-5">
          <WarningMessage
            title={t`Handle with care!`}
            message={
              <div className="leading-6">
                <Trans>
                  Please be aware that by allowing this module, the amount
                  indicated will be automatically deducted when you{' '}
                  <b>Collect</b> and <b>Super follow</b>.
                </Trans>
              </div>
            }
          />
          <div className="flex pt-2">
            <Input
              label={t`Allow amount (MATIC)`}
              type="number"
              step="1"
              min="0"
              placeholder="100"
              max={Number.MAX_SAFE_INTEGER.toString()}
              value={allowanceAmount}
              onChange={(e) => {
                setAllowanceAmount(e.target.value);
              }}
            />
            <Button
              className="ml-2 self-center whitespace-nowrap"
              onClick={() =>
                setAllowanceAmount(Number.MAX_SAFE_INTEGER.toString())
              }
            >
              <Trans>Use max</Trans>
            </Button>
          </div>
          <Button
            disabled={!allowanceAmount || Number(allowanceAmount) == 0}
            icon={
              queryLoading || transactionLoading || waitLoading ? (
                <Spinner size="xs" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )
            }
            onClick={() =>
              handleAllowance(module.currency, allowanceAmount, module.module)
            }
          >
            {title}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default AllowanceButton;
