import UserPreview from '@components/Shared/UserPreview';
import { UserPlusIcon } from '@heroicons/react/24/solid';
import type { NewFollowerNotification } from '@lenster/lens';
import { formatTime, getTimeFromNow } from '@lib/formatTime';
import { defineMessage } from '@lingui/macro';
import { Trans } from '@lingui/react';
import type { FC } from 'react';
import { memo } from 'react';
import { useAppStore } from 'src/store/app';

import { NotificationProfileAvatar, NotificationProfileName } from '../Profile';
import {
  NotificationWalletProfileAvatar,
  NotificationWalletProfileName
} from '../WalletProfile';

const messageFollow = defineMessage({
  id: '<0><1/> followed you</0>'
});

const messageSuperFollow = defineMessage({
  id: '<0><1/> super followed you</0>'
});

interface FollowerNotificationProps {
  notification: NewFollowerNotification;
}

const FollowerNotification: FC<FollowerNotificationProps> = ({
  notification
}) => {
  const currentProfile = useAppStore((state) => state.currentProfile);
  const isSuperFollow =
    currentProfile?.followModule?.__typename === 'FeeFollowModuleSettings';

  return (
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isSuperFollow ? (
              <UserPlusIcon className="h-6 w-6 text-pink-500/70" />
            ) : (
              <UserPlusIcon className="h-6 w-6 text-green-500/70" />
            )}
            {notification?.wallet?.defaultProfile ? (
              <UserPreview profile={notification?.wallet?.defaultProfile}>
                <NotificationProfileAvatar
                  profile={notification?.wallet?.defaultProfile}
                />
              </UserPreview>
            ) : (
              <NotificationWalletProfileAvatar wallet={notification?.wallet} />
            )}
          </div>
          <div
            className="min-w-fit text-[12px] text-gray-400"
            title={formatTime(notification?.createdAt)}
          >
            {getTimeFromNow(notification?.createdAt)}
          </div>
        </div>
        <div className="ml-9">
          <Trans
            id={
              (isSuperFollow ? messageSuperFollow.id : messageFollow.id) || ''
            }
            components={[
              <span className="text-gray-600 dark:text-gray-400" key="" />,
              notification?.wallet?.defaultProfile ? (
                <NotificationProfileName
                  profile={notification?.wallet?.defaultProfile}
                />
              ) : (
                <NotificationWalletProfileName wallet={notification?.wallet} />
              )
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(FollowerNotification);
