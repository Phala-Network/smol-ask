import AllowanceButton from '@components/Settings/Allowance/Button';
import FillWarning from '@components/Shared/FillWarning';
import Loader from '@components/Shared/Loader';
import Markup from '@components/Shared/Markup';
import Fillers from '@components/Shared/Modal/Fillers';
import ReferralAlert from '@components/Shared/ReferralAlert';
import Uniswap from '@components/Shared/Uniswap';
import {
  BanknotesIcon,
  ClockIcon,
  PhotoIcon,
  PuzzlePieceIcon,
  RectangleStackIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { LensHub } from '@lenster/abis';
import { LENSHUB_PROXY, POLYGONSCAN_URL } from '@lenster/data/constants';
import { Errors } from '@lenster/data/errors';
import { PUBLICATION } from '@lenster/data/tracking';
import type {
  ApprovedAllowanceAmount,
  ElectedMirror,
  Publication
} from '@lenster/lens';
import {
  CollectModules,
  useApprovedModuleAllowanceAmountQuery,
  useBroadcastMutation,
  useCollectModuleQuery,
  useCreateCollectTypedDataMutation,
  useProxyActionMutation,
  usePublicationRevenueQuery
} from '@lenster/lens';
import formatAddress from '@lenster/lib/formatAddress';
import formatHandle from '@lenster/lib/formatHandle';
import getAssetSymbol from '@lenster/lib/getAssetSymbol';
import getSignature from '@lenster/lib/getSignature';
import getTokenImage from '@lenster/lib/getTokenImage';
import humanize from '@lenster/lib/humanize';
import { Button, Modal, Spinner, Tooltip, WarningMessage } from '@lenster/ui';
import errorToast from '@lib/errorToast';
import { formatDate, formatTime } from '@lib/formatTime';
import getRedstonePrice from '@lib/getRedstonePrice';
import { Leafwatch } from '@lib/leafwatch';
import { Plural, t, Trans } from '@lingui/macro';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { Dispatch, FC, SetStateAction } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useHandleWrongNetwork from 'src/hooks/useHandleWrongNetwork';
import { useAppStore } from 'src/store/app';
import { useNonceStore } from 'src/store/nonce';
import { useUpdateEffect } from 'usehooks-ts';
import {
  useAccount,
  useBalance,
  useContractWrite,
  useSignTypedData
} from 'wagmi';

import Splits from './Splits';
// TODO change
interface FillModuleProps {
  count: number;
  setCount: Dispatch<SetStateAction<number>>;
  publication: Publication;
  electedMirror?: ElectedMirror;
}

const FillModule: FC<FillModuleProps> = ({
  count,
  setCount,
  publication,
  electedMirror
}) => {
  const userSigNonce = useNonceStore((state) => state.userSigNonce);
  const setUserSigNonce = useNonceStore((state) => state.setUserSigNonce);
  const currentProfile = useAppStore((state) => state.currentProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [hasFilledByMe, setHasFilledByMe] = useState(
    publication?.hasCollectedByMe
  );
  const [showFillersModal, setShowFillersModal] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const { address } = useAccount();
  const handleWrongNetwork = useHandleWrongNetwork();

  const { data, loading } = useCollectModuleQuery({
    variables: { request: { publicationId: publication?.id } }
  });

  const fillModule: any = data?.publication?.collectModule;

  const endTimestamp =
    fillModule?.endTimestamp ?? fillModule?.optionalEndTimestamp;
  const fillLimit = fillModule?.fillLimit ?? fillModule?.optionalFillLimit;
  const amount = fillModule?.amount?.value ?? fillModule?.fee?.amount?.value;
  const currency =
    fillModule?.amount?.asset?.symbol ?? fillModule?.fee?.amount?.asset?.symbol;
  const assetAddress =
    fillModule?.amount?.asset?.address ??
    fillModule?.fee?.amount?.asset?.address;
  const assetDecimals =
    fillModule?.amount?.asset?.decimals ??
    fillModule?.fee?.amount?.asset?.decimals;
  const referralFee = fillModule?.referralFee ?? fillModule?.fee?.referralFee;

  const isRevertFillModule =
    fillModule?.type === CollectModules.RevertCollectModule;
  const isMultirecipientFeeFillModule =
    fillModule?.type === CollectModules.MultirecipientFeeCollectModule;
  const isFreeFillModule =
    fillModule?.type === CollectModules.FreeCollectModule;
  const isSimpleFreeFillModule =
    fillModule?.type === CollectModules.SimpleCollectModule && !amount;

  const onCompleted = (__typename?: 'RelayError' | 'RelayerResult') => {
    if (__typename === 'RelayError') {
      return;
    }

    setIsLoading(false);
    setRevenue(revenue + parseFloat(amount));
    setCount(count + 1);
    setHasFilledByMe(true);
    toast.success(t`Filled successfully!`);
    Leafwatch.track(PUBLICATION.COLLECT_MODULE.COLLECT, {
      publication_id: publication?.id,
      fill_module: fillModule?.type,
      ...(!isRevertFillModule && {
        fill_amount: amount,
        fill_currency: currency,
        fill_limit: fillLimit
      })
    });
  };

  const onError = (error: any) => {
    setIsLoading(false);
    errorToast(error);
  };

  const { signTypedDataAsync } = useSignTypedData({ onError });

  const { write } = useContractWrite({
    address: LENSHUB_PROXY,
    abi: LensHub,
    functionName: 'fill',
    onSuccess: () => {
      onCompleted();
      setUserSigNonce(userSigNonce + 1);
    },
    onError: (error) => {
      onError(error);
      setUserSigNonce(userSigNonce - 1);
    }
  });

  const percentageFilled = (count / parseInt(fillLimit)) * 100;

  const { data: allowanceData, loading: allowanceLoading } =
    useApprovedModuleAllowanceAmountQuery({
      variables: {
        request: {
          currencies: assetAddress,
          followModules: [],
          collectModules: fillModule?.type,
          referenceModules: []
        }
      },
      skip: !assetAddress || !currentProfile,
      onCompleted: ({ approvedModuleAllowanceAmount }) => {
        setAllowed(approvedModuleAllowanceAmount[0]?.allowance !== '0x00');
      }
    });

  const { data: revenueData, loading: revenueLoading } =
    usePublicationRevenueQuery({
      variables: {
        request: {
          publicationId:
            publication.__typename === 'Mirror'
              ? publication?.mirrorOf?.id
              : publication?.id
        }
      },
      pollInterval: 5000,
      skip: !publication?.id || isFreeFillModule || isSimpleFreeFillModule
    });

  const { data: usdPrice } = useQuery(
    ['redstoneData'],
    () => getRedstonePrice(getAssetSymbol(currency)).then((res) => res),
    { enabled: Boolean(amount) }
  );

  useUpdateEffect(() => {
    setRevenue(
      parseFloat(
        (revenueData?.publicationRevenue?.revenue?.total?.value as any) ?? 0
      )
    );
  }, [revenueData]);

  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address,
    token: assetAddress,
    formatUnits: assetDecimals,
    watch: true
  });

  let hasAmount = false;
  if (balanceData && parseFloat(balanceData?.formatted) < parseFloat(amount)) {
    hasAmount = false;
  } else {
    hasAmount = true;
  }

  const [broadcast] = useBroadcastMutation({
    onCompleted: ({ broadcast }) => onCompleted(broadcast.__typename)
  });
  const [createFillTypedData] = useCreateCollectTypedDataMutation({
    onCompleted: async ({ createCollectTypedData }) => {
      const { id, typedData } = createCollectTypedData;
      const signature = await signTypedDataAsync(getSignature(typedData));
      const { data } = await broadcast({
        variables: { request: { id, signature } }
      });
      if (data?.broadcast.__typename === 'RelayError') {
        const { profileId, pubId, data: fillData } = typedData.value;
        return write?.({ args: [profileId, pubId, fillData] });
      }
    },
    onError
  });

  const [createFillProxyAction] = useProxyActionMutation({
    onCompleted: () => onCompleted(),
    onError
  });

  const createViaProxyAction = async (variables: any) => {
    const { data, errors } = await createFillProxyAction({ variables });

    if (
      errors?.toString().includes('You have already filled this publication')
    ) {
      return;
    }

    if (!data?.proxyAction) {
      return await createFillTypedData({
        variables: {
          request: { publicationId: publication?.id },
          options: { overrideSigNonce: userSigNonce }
        }
      });
    }
  };

  const createFill = async () => {
    if (!currentProfile) {
      return toast.error(Errors.SignWallet);
    }

    if (handleWrongNetwork()) {
      return;
    }

    try {
      setIsLoading(true);
      const canUseProxy =
        (isSimpleFreeFillModule || isFreeFillModule) &&
        !fillModule?.followerOnly;
      if (canUseProxy) {
        return await createViaProxyAction({
          request: {
            fill: { freeFill: { publicationId: publication?.id } }
          }
        });
      }

      return await createFillTypedData({
        variables: {
          options: { overrideSigNonce: userSigNonce },
          request: {
            publicationId: electedMirror
              ? electedMirror.mirrorId
              : publication?.id
          }
        }
      });
    } catch (error) {
      onError(error);
    }
  };

  if (loading || revenueLoading) {
    return <Loader message={t`Loading fill`} />;
  }

  const isLimitedFillAllFilled = fillLimit
    ? count >= parseInt(fillLimit)
    : false;
  const isFillExpired = endTimestamp
    ? new Date(endTimestamp).getTime() / 1000 < new Date().getTime() / 1000
    : false;

  return (
    <>
      {Boolean(fillLimit) ? (
        <Tooltip
          placement="top"
          content={`${percentageFilled.toFixed(0)}% Filled`}
        >
          <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700">
            <div
              className="bg-brand-500 h-2.5"
              style={{ width: `${percentageFilled}%` }}
            />
          </div>
        </Tooltip>
      ) : null}
      <div className="p-5">
        {fillModule?.followerOnly ? (
          <div className="pb-5">
            <FillWarning handle={formatHandle(publication?.profile?.handle)} />
          </div>
        ) : null}
        <div className="mb-4 space-y-1.5">
          {publication.metadata?.name ? (
            <div className="text-xl font-bold">{publication.metadata.name}</div>
          ) : null}
          {publication.metadata?.content ? (
            <Markup className="lt-text-gray-500 line-clamp-2">
              {publication.metadata.content}
            </Markup>
          ) : null}
          <ReferralAlert
            electedMirror={electedMirror}
            mirror={publication}
            referralFee={referralFee}
          />
        </div>
        {amount ? (
          <div className="flex items-center space-x-1.5 py-2">
            <img
              className="h-7 w-7"
              height={28}
              width={28}
              src={getTokenImage(currency)}
              alt={currency}
              title={currency}
            />
            <span className="space-x-1">
              <span className="text-2xl font-bold">{amount}</span>
              <span className="text-xs">{currency}</span>
              {usdPrice ? (
                <>
                  <span className="lt-text-gray-500 px-0.5">·</span>
                  <span className="lt-text-gray-500 text-xs font-bold">
                    ${(amount * usdPrice).toFixed(2)}
                  </span>
                </>
              ) : null}
            </span>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <div className="block items-center space-y-1 sm:flex sm:space-x-5">
            <div className="flex items-center space-x-2">
              <UsersIcon className="lt-text-gray-500 h-4 w-4" />
              <button
                className="font-bold"
                type="button"
                onClick={() => setShowFillersModal(!showFillersModal)}
              >
                {humanize(count)}{' '}
                <Plural
                  value={count}
                  zero="filler"
                  one="filler"
                  other="fillers"
                />
              </button>
              <Modal
                title={t`Filled by`}
                icon={<RectangleStackIcon className="text-brand h-5 w-5" />}
                show={showFillersModal}
                onClose={() => setShowFillersModal(false)}
              >
                <Fillers
                  publicationId={
                    publication.__typename === 'Mirror'
                      ? publication?.mirrorOf?.id
                      : publication?.id
                  }
                />
              </Modal>
            </div>
            {fillLimit ? (
              <div className="flex items-center space-x-2">
                <PhotoIcon className="lt-text-gray-500 h-4 w-4" />
                <div className="font-bold">
                  <Trans>{parseInt(fillLimit) - count} available</Trans>
                </div>
              </div>
            ) : null}
            {referralFee ? (
              <div className="flex items-center space-x-2">
                <BanknotesIcon className="lt-text-gray-500 h-4 w-4" />
                <div className="font-bold">
                  <Trans>{referralFee}% referral fee</Trans>
                </div>
              </div>
            ) : null}
          </div>
          {revenueData?.publicationRevenue ? (
            <div className="flex items-center space-x-2">
              <BanknotesIcon className="lt-text-gray-500 h-4 w-4" />
              <div className="flex items-center space-x-1.5">
                <span>
                  <Trans>Revenue:</Trans>
                </span>
                <span className="flex items-center space-x-1">
                  <img
                    src={getTokenImage(currency)}
                    className="h-5 w-5"
                    height={20}
                    width={20}
                    alt={currency}
                    title={currency}
                  />
                  <div className="flex items-baseline space-x-1.5">
                    <div className="font-bold">{revenue}</div>
                    <div className="text-[10px]">{currency}</div>
                    {usdPrice ? (
                      <>
                        <span className="lt-text-gray-500">·</span>
                        <span className="lt-text-gray-500 text-xs font-bold">
                          ${(revenue * usdPrice).toFixed(2)}
                        </span>
                      </>
                    ) : null}
                  </div>
                </span>
              </div>
            </div>
          ) : null}
          {endTimestamp ? (
            <div className="flex items-center space-x-2">
              <ClockIcon className="lt-text-gray-500 h-4 w-4" />
              <div className="space-x-1.5">
                <span>
                  <Trans>Sale Ends:</Trans>
                </span>
                <span
                  className="font-bold text-gray-600"
                  title={formatTime(endTimestamp)}
                >
                  {formatDate(endTimestamp, 'MMMM DD, YYYY')} at{' '}
                  {formatDate(endTimestamp, 'hh:mm a')}
                </span>
              </div>
            </div>
          ) : null}
          {data?.publication?.collectNftAddress ? (
            <div className="flex items-center space-x-2">
              <PuzzlePieceIcon className="lt-text-gray-500 h-4 w-4" />
              <div className="space-x-1.5">
                <span>
                  <Trans>Token:</Trans>
                </span>
                <Link
                  href={`${POLYGONSCAN_URL}/token/${data?.publication?.collectNftAddress}`}
                  target="_blank"
                  className="font-bold text-gray-600"
                  rel="noreferrer noopener"
                >
                  {formatAddress(data?.publication?.collectNftAddress)}
                </Link>
              </div>
            </div>
          ) : null}
          {isMultirecipientFeeFillModule ? (
            <Splits recipients={fillModule?.recipients} />
          ) : null}
        </div>
        <div className="flex items-center space-x-2">
          {currentProfile &&
          (!hasFilledByMe || (!isFreeFillModule && !isSimpleFreeFillModule)) ? (
            allowanceLoading || balanceLoading ? (
              <div className="shimmer mt-5 h-[34px] w-28 rounded-lg" />
            ) : allowed ? (
              hasAmount ? (
                !isLimitedFillAllFilled && !isFillExpired ? (
                  <Button
                    className="mt-5"
                    onClick={createFill}
                    disabled={isLoading}
                    icon={
                      isLoading ? (
                        <Spinner size="xs" />
                      ) : (
                        <RectangleStackIcon className="h-4 w-4" />
                      )
                    }
                  >
                    <Trans>Collect now</Trans>
                  </Button>
                ) : null
              ) : (
                <WarningMessage
                  className="mt-5 w-full"
                  message={<Uniswap module={fillModule} />}
                />
              )
            ) : (
              <span className="mt-5">
                <AllowanceButton
                  title="Allow fill module"
                  module={
                    allowanceData
                      ?.approvedModuleAllowanceAmount[0] as ApprovedAllowanceAmount
                  }
                  allowed={allowed}
                  setAllowed={setAllowed}
                />
              </span>
            )
          ) : null}
        </div>
        {publication?.hasCollectedByMe ? (
          <div className="mt-3 flex items-center space-x-1.5 font-bold text-green-500">
            <CheckCircleIcon className="h-5 w-5" />
            <div>
              <Trans>You already filled this</Trans>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default FillModule;
