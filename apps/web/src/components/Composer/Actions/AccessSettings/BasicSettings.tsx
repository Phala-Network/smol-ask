import ToggleWithHelper from '@components/Shared/ToggleWithHelper';
import { RectangleStackIcon, UsersIcon } from '@heroicons/react/24/outline';
import { CollectModules } from '@lenster/lens';
import { Button, Card } from '@lenster/ui';
import { t, Trans } from '@lingui/macro';
import type { Dispatch, FC, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { useAccessSettingsStore } from 'src/store/access-settings';
import { useCollectModuleStore } from 'src/store/collect-module';

interface BasicSettingsProps {
  setShowModal: Dispatch<SetStateAction<boolean>>;
}

const BasicSettings: FC<BasicSettingsProps> = ({ setShowModal }) => {
  const restricted = useAccessSettingsStore((state) => state.restricted);
  const setRestricted = useAccessSettingsStore((state) => state.setRestricted);
  const followToView = useAccessSettingsStore((state) => state.followToView);
  const setFollowToView = useAccessSettingsStore(
    (state) => state.setFollowToView
  );
  const collectToView = useAccessSettingsStore((state) => state.collectToView);
  const setCollectToView = useAccessSettingsStore(
    (state) => state.setCollectToView
  );
  const hasConditions = useAccessSettingsStore((state) => state.hasConditions);
  const reset = useAccessSettingsStore((state) => state.reset);
  const collectModule = useCollectModuleStore((state) => state.collectModule);

  const onSave = () => {
    if (!hasConditions()) {
      reset();
    }
    setShowModal(false);
  };

  return (
    <div className="p-5">
      <ToggleWithHelper
        on={restricted}
        setOn={() => {
          if (!restricted) {
            reset();
          }
          setRestricted(!restricted);
        }}
        description={t`Add restrictions on who can view this post`}
      />
      {restricted ? (
        <>
          <Card className="mt-5 p-5">
            <ToggleWithHelper
              on={collectToView}
              setOn={() => {
                if (
                  !collectToView &&
                  collectModule.type === CollectModules.RevertCollectModule
                ) {
                  return toast.error(
                    t`Enable collect first to use collect based token gating`
                  );
                }
                setCollectToView(!collectToView);
              }}
              heading={t`Collectors can view`}
              description={t`People need to collect it first to be able to view it`}
              icon={<RectangleStackIcon className="h-4 w-4" />}
            />
          </Card>
          <Card className="mt-5 p-5">
            <ToggleWithHelper
              on={followToView}
              setOn={() => setFollowToView(!followToView)}
              heading={t`Followers can view`}
              description={t`People need to follow you to be able to view it`}
              icon={<UsersIcon className="h-4 w-4" />}
            />
          </Card>
        </>
      ) : null}
      <div className="flex space-x-2 pt-5">
        <Button className="ml-auto" variant="danger" outline onClick={onSave}>
          <Trans>Cancel</Trans>
        </Button>
        <Button onClick={onSave}>
          <Trans>Save</Trans>
        </Button>
      </div>
    </div>
  );
};

export default BasicSettings;
