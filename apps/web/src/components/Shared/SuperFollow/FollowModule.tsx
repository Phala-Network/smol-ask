import AllowanceButton from '@components/Settings/Allowance/Button';
import { StarIcon, UserIcon } from '@heroicons/react/24/outline';
import { LensHub } from '@lenster/abis';
import { LENSHUB_PROXY, POLYGONSCAN_URL } from '@lenster/data/constants';
import { Errors } from '@lenster/data/errors';
import { PROFILE } from '@lenster/data/tracking';
import type { ApprovedAllowanceAmount, Profile } from '@lenster/lens';
import {
  FollowModules,
  useApprovedModuleAllowanceAmountQuery,
  useBroadcastMutation,
  useCreateFollowTypedDataMutation,
  useSuperFollowQuery
} from '@lenster/lens';
import formatAddress from '@lenster/lib/formatAddress';
import formatHandle from '@lenster/lib/formatHandle';
import getSignature from '@lenster/lib/getSignature';
import getTokenImage from '@lenster/lib/getTokenImage';
import { Button, Spinner, WarningMessage } from '@lenster/ui';
import errorToast from '@lib/errorToast';
import { Leafwatch } from '@lib/leafwatch';
import { t, Trans } from '@lingui/macro';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { Dispatch, FC, SetStateAction } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useHandleWrongNetwork from 'src/hooks/useHandleWrongNetwork';
import { useAppStore } from 'src/store/app';
import { useNonceStore } from 'src/store/nonce';
import { useBalance, useContractWrite, useSignTypedData } from 'wagmi';

import Loader from '../Loader';
import Slug from '../Slug';
import Uniswap from '../Uniswap';

interface FollowModuleProps {
  profile: Profile;
  setFollowing: (following: boolean) => void;
  setShowFollowModal: Dispatch<SetStateAction<boolean>>;
  again: boolean;

  // For data analytics
  followUnfollowPosition?: number;
  followUnfollowSource?: string;
}

const FollowModule: FC<FollowModuleProps> = ({
  profile,
  setFollowing,
  setShowFollowModal,
  again,
  followUnfollowPosition,
  followUnfollowSource
}) => {
  const { pathname } = useRouter();
  const userSigNonce = useNonceStore((state) => state.userSigNonce);
  const setUserSigNonce = useNonceStore((state) => state.setUserSigNonce);
  const currentProfile = useAppStore((state) => state.currentProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const handleWrongNetwork = useHandleWrongNetwork();

  const onCompleted = (__typename?: 'RelayError' | 'RelayerResult') => {
    if (__typename === 'RelayError') {
      return;
    }

    setIsLoading(false);
    setFollowing(true);
    setShowFollowModal(false);
    toast.success(t`Followed successfully!`);
    Leafwatch.track(PROFILE.SUPER_FOLLOW, {
      path: pathname,
      ...(followUnfollowSource && { source: followUnfollowSource }),
      ...(followUnfollowPosition && { position: followUnfollowPosition }),
      target: profile?.id
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
    functionName: 'follow',
    onSuccess: () => {
      onCompleted();
      setUserSigNonce(userSigNonce + 1);
    },
    onError: (error) => {
      onError(error);
      setUserSigNonce(userSigNonce - 1);
    }
  });

  const { data, loading } = useSuperFollowQuery({
    variables: { request: { profileId: profile?.id } },
    skip: !profile?.id
  });

  const followModule: any = data?.profile?.followModule;

  const { data: allowanceData, loading: allowanceLoading } =
    useApprovedModuleAllowanceAmountQuery({
      variables: {
        request: {
          currencies: followModule?.amount?.asset?.address,
          followModules: [FollowModules.FeeFollowModule],
          collectModules: [],
          referenceModules: []
        }
      },
      skip: !followModule?.amount?.asset?.address || !currentProfile,
      onCompleted: ({ approvedModuleAllowanceAmount }) => {
        setAllowed(approvedModuleAllowanceAmount[0]?.allowance !== '0x00');
      }
    });

  const { data: balanceData } = useBalance({
    address: currentProfile?.ownedBy,
    token: followModule?.amount?.asset?.address,
    formatUnits: followModule?.amount?.asset?.decimals,
    watch: true
  });
  let hasAmount = false;

  if (
    balanceData &&
    parseFloat(balanceData?.formatted) < parseFloat(followModule?.amount?.value)
  ) {
    hasAmount = false;
  } else {
    hasAmount = true;
  }

  const [broadcast] = useBroadcastMutation({
    onCompleted: ({ broadcast }) => onCompleted(broadcast.__typename)
  });
  const [createFollowTypedData] = useCreateFollowTypedDataMutation({
    onCompleted: async ({ createFollowTypedData }) => {
      const { id, typedData } = createFollowTypedData;
      const signature = await signTypedDataAsync(getSignature(typedData));
      const { data } = await broadcast({
        variables: { request: { id, signature } }
      });
      if (data?.broadcast.__typename === 'RelayError') {
        const { profileIds, datas } = typedData.value;
        return write?.({ args: [profileIds, datas] });
      }
    },
    onError
  });

  const createFollow = async () => {
    if (!currentProfile) {
      return toast.error(Errors.SignWallet);
    }

    if (handleWrongNetwork()) {
      return;
    }

    try {
      setIsLoading(true);
      return await createFollowTypedData({
        variables: {
          options: { overrideSigNonce: userSigNonce },
          request: {
            follow: [
              {
                profile: profile?.id,
                followModule: {
                  feeFollowModule: {
                    amount: {
                      currency: followModule?.amount?.asset?.address,
                      value: followModule?.amount?.value
                    }
                  }
                }
              }
            ]
          }
        }
      });
    } catch (error) {
      onError(error);
    }
  };

  if (loading) {
    return <Loader message={t`Loading Super follow`} />;
  }

  return (
    <div className="p-5">
      <div className="space-y-1.5 pb-2">
        <div className="text-lg font-bold">
          Super follow <Slug slug={formatHandle(profile?.handle)} prefix="@" />{' '}
          {again ? 'again' : ''}
        </div>
        <div className="lt-text-gray-500">
          Follow {again ? 'again' : ''} and get some awesome perks!
        </div>
      </div>
      <div className="flex items-center space-x-1.5 py-2">
        <img
          className="h-7 w-7"
          height={28}
          width={28}
          src={getTokenImage(followModule?.amount?.asset?.symbol)}
          alt={followModule?.amount?.asset?.symbol}
          title={followModule?.amount?.asset?.name}
        />
        <span className="space-x-1">
          <span className="text-2xl font-bold">
            {followModule?.amount?.value}
          </span>
          <span className="text-xs">{followModule?.amount?.asset?.symbol}</span>
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <UserIcon className="lt-text-gray-500 h-4 w-4" />
        <div className="space-x-1.5">
          <span>
            <Trans>Recipient:</Trans>
          </span>
          <Link
            href={`${POLYGONSCAN_URL}/address/${followModule?.recipient}`}
            target="_blank"
            className="font-bold text-gray-600"
            rel="noreferrer noopener"
          >
            {formatAddress(followModule?.recipient)}
          </Link>
        </div>
      </div>
      <div className="space-y-2 pt-5">
        <div className="text-lg font-bold">Perks you get</div>
        <ul className="lt-text-gray-500 space-y-1 text-sm">
          <li className="flex space-x-2 leading-6 tracking-normal">
            <div>•</div>
            <div>
              <Trans>
                You can comment on @{formatHandle(profile?.handle)}'s
                publications
              </Trans>
            </div>
          </li>
          <li className="flex space-x-2 leading-6 tracking-normal">
            <div>•</div>
            <div>
              <Trans>
                You can collect @{formatHandle(profile?.handle)}'s publications
              </Trans>
            </div>
          </li>
          <li className="flex space-x-2 leading-6 tracking-normal">
            <div>•</div>
            <div>
              <Trans>
                You will get Super follow badge in @
                {formatHandle(profile?.handle)}'s profile
              </Trans>
            </div>
          </li>
          <li className="flex space-x-2 leading-6 tracking-normal">
            <div>•</div>
            <div>
              <Trans>
                You will have high voting power if you followed multiple times
              </Trans>
            </div>
          </li>
          <li className="flex space-x-2 leading-6 tracking-normal">
            <div>•</div>
            <div>
              <Trans>More coming soon™</Trans>
            </div>
          </li>
        </ul>
      </div>
      {currentProfile ? (
        allowanceLoading ? (
          <div className="shimmer mt-5 h-[34px] w-28 rounded-lg" />
        ) : allowed ? (
          hasAmount ? (
            <Button
              className="mt-5 !px-3 !py-1.5 text-sm"
              variant="super"
              outline
              onClick={createFollow}
              disabled={isLoading}
              icon={
                isLoading ? (
                  <Spinner variant="super" size="xs" />
                ) : (
                  <StarIcon className="h-4 w-4" />
                )
              }
            >
              {again ? t`Super follow again` : t`Super follow now`}
            </Button>
          ) : (
            <WarningMessage
              className="mt-5"
              message={<Uniswap module={followModule} />}
            />
          )
        ) : (
          <div className="mt-5">
            <AllowanceButton
              title={t`Allow follow module`}
              module={
                allowanceData
                  ?.approvedModuleAllowanceAmount[0] as ApprovedAllowanceAmount
              }
              allowed={allowed}
              setAllowed={setAllowed}
            />
          </div>
        )
      ) : null}
    </div>
  );
};

export default FollowModule;
