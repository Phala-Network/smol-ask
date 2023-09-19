import { STATIC_IMAGES_URL } from '@lenster/data/constants';
import type { Profile } from '@lenster/lens';
import { Tooltip } from '@lenster/ui';
import { Trans } from '@lingui/macro';
import type { FC } from 'react';

interface EnsProps {
  profile: Profile;
}

const Ens: FC<EnsProps> = ({ profile }) => {
  if (!profile.onchainIdentity.ens?.name) {
    return null;
  }

  return (
    <Tooltip
      content={
        <span>
          <Trans>ENS name:</Trans> <b>{profile.onchainIdentity.ens.name}</b>
        </span>
      }
      placement="top"
    >
      <img
        className="drop-shadow-xl"
        height={75}
        width={75}
        src={`${STATIC_IMAGES_URL}/badges/ens.png`}
        alt="ENS Badge"
        data-testid="profile-ens-badge"
      />
    </Tooltip>
  );
};

export default Ens;
