import {
  CheckBadgeIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';
import { FollowUnfollowSource } from '@lenster/data/tracking';
import type { Profile } from '@lenster/lens';
import { useProfileLazyQuery } from '@lenster/lens';
import formatHandle from '@lenster/lib/formatHandle';
import getAvatar from '@lenster/lib/getAvatar';
import hasMisused from '@lenster/lib/hasMisused';
import nFormatter from '@lenster/lib/nFormatter';
import sanitizeDisplayName from '@lenster/lib/sanitizeDisplayName';
import stopEventPropagation from '@lenster/lib/stopEventPropagation';
import truncateByWords from '@lenster/lib/truncateByWords';
import { Image } from '@lenster/ui';
import cn from '@lenster/ui/cn';
import isVerified from '@lib/isVerified';
import { Plural, Trans } from '@lingui/macro';
import Tippy from '@tippyjs/react';
import type { FC, ReactNode } from 'react';
import { useState } from 'react';

import Markup from './Markup';
import Follow from './Profile/Follow';
import Slug from './Slug';
import SuperFollow from './SuperFollow';

interface UserPreviewProps {
  profile: Profile;
  children: ReactNode;
  isBig?: boolean;
  followStatusLoading?: boolean;
  showUserPreview?: boolean;
}

const UserPreview: FC<UserPreviewProps> = ({
  profile,
  isBig,
  followStatusLoading,
  children,
  showUserPreview = true
}) => {
  const [lazyProfile, setLazyProfile] = useState(profile);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(profile?.isFollowedByMe);

  const [loadProfile] = useProfileLazyQuery({
    fetchPolicy: 'cache-first'
  });

  const UserAvatar = () => (
    <Image
      src={getAvatar(lazyProfile)}
      loading="lazy"
      className={cn(
        isBig ? 'h-14 w-14' : 'h-10 w-10',
        'rounded-full border bg-gray-200 dark:border-gray-700'
      )}
      height={isBig ? 56 : 40}
      width={isBig ? 56 : 40}
      alt={formatHandle(lazyProfile?.handle)}
    />
  );

  const UserName = () => (
    <>
      <div className="flex max-w-sm items-center gap-1 truncate">
        <div className={cn(isBig ? 'font-bold' : 'text-md')}>
          {sanitizeDisplayName(lazyProfile?.name) ??
            formatHandle(lazyProfile?.handle)}
        </div>
        {isVerified(lazyProfile.id) ? (
          <CheckBadgeIcon className="text-brand h-4 w-4" />
        ) : null}
        {hasMisused(lazyProfile.id) ? (
          <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
        ) : null}
      </div>
      <Slug
        className="text-sm"
        slug={formatHandle(lazyProfile?.handle)}
        prefix="@"
      />
    </>
  );

  const Preview = () => {
    if (loading) {
      return (
        <div className="flex flex-col">
          <div className="horizontal-loader w-full">
            <div />
          </div>
          <div className="flex p-3">
            <div>{lazyProfile.handle}</div>
          </div>
        </div>
      );
    }

    if (!lazyProfile.id) {
      return (
        <div className="flex h-12 items-center px-3">
          <Trans>No profile found</Trans>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between px-3.5 pb-1 pt-4">
          <UserAvatar />
          <div onClick={stopEventPropagation} aria-hidden="false">
            {!lazyProfile.isFollowedByMe ? (
              followStatusLoading ? (
                <div className="shimmer h-8 w-10 rounded-lg" />
              ) : following ? null : lazyProfile?.followModule?.__typename ===
                'FeeFollowModuleSettings' ? (
                <SuperFollow
                  profile={lazyProfile}
                  setFollowing={setFollowing}
                  followUnfollowSource={FollowUnfollowSource.PROFILE_POPOVER}
                />
              ) : (
                <Follow
                  profile={lazyProfile}
                  setFollowing={setFollowing}
                  followUnfollowSource={FollowUnfollowSource.PROFILE_POPOVER}
                />
              )
            ) : null}
          </div>
        </div>
        <div className="space-y-3 p-4 pt-0">
          <UserName />
          <div>
            {lazyProfile?.bio ? (
              <div
                className={cn(
                  isBig ? 'text-base' : 'text-sm',
                  'mt-2',
                  'linkify break-words leading-6'
                )}
              >
                <Markup>{truncateByWords(lazyProfile?.bio, 20)}</Markup>
              </div>
            ) : null}
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className="text-base">
                {nFormatter(lazyProfile?.stats?.totalFollowing)}
              </div>
              <div className="lt-text-gray-500 text-sm">
                <Plural
                  value={lazyProfile?.stats?.totalFollowing}
                  zero="Following"
                  one="Following"
                  other="Following"
                />
              </div>
            </div>
            <div className="text-md flex items-center space-x-1">
              <div className="text-base">
                {nFormatter(lazyProfile?.stats?.totalFollowers)}
              </div>
              <div className="lt-text-gray-500 text-sm">
                <Plural
                  value={lazyProfile?.stats?.totalFollowers}
                  zero="Follower"
                  one="Follower"
                  other="Followers"
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const onPreviewStart = async () => {
    if (!lazyProfile.id) {
      setLoading(true);
      const { data } = await loadProfile({
        variables: {
          request: { handle: formatHandle(lazyProfile?.handle, true) }
        }
      });

      const getProfile = data?.profile;

      if (getProfile) {
        setLazyProfile(getProfile as Profile);
      }

      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  return showUserPreview ? (
    <span onMouseOver={onPreviewStart} onFocus={onPreviewStart}>
      <Tippy
        placement="bottom-start"
        delay={[100, 0]}
        hideOnClick={false}
        content={<Preview />}
        arrow={false}
        interactive
        zIndex={1000}
        className="preview-tippy-content hidden w-64 !rounded-xl border !bg-white !text-black dark:border-gray-700 dark:!bg-black dark:!text-white md:block"
        appendTo={() => document.body}
      >
        <span>{children}</span>
      </Tippy>
    </span>
  ) : (
    <span>{children}</span>
  );
};

export default UserPreview;
