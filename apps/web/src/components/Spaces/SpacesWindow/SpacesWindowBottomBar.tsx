import {
  EmojiHappyIcon,
  MicrophoneIcon,
  MusicNoteIcon,
  UserIcon
} from '@heroicons/react/outline';
import { useAppUtils } from '@huddle01/react/app-utils';
import {
  useAudio,
  useEventListener,
  useHuddle01,
  usePeers
} from '@huddle01/react/hooks';
import { Trans } from '@lingui/macro';
import type { FC } from 'react';
import React from 'react';
import { useSpacesStore } from 'src/store/spaces';

import { Icons } from '../Common/assets/Icons';
import Dropdown from '../Common/Dropdown';
import EmojiTray from '../Common/EmojiTray';
import MusicTray from '../Common/MusicTray';
import { SpacesEvents } from 'src/enums';

const SpacesWindowBottomBar: FC = () => {
  const { peers } = usePeers();
  const { me } = useHuddle01();
  const {
    isAudioOn,
    fetchAudioStream,
    stopAudioStream,
    produceAudio,
    stopProducingAudio
  } = useAudio();
  const setSidebarView = useSpacesStore((state) => state.setSidebarView);
  const sidebarView = useSpacesStore((state) => state.sidebar.sidebarView);
  const { sendData } = useAppUtils();

  useEventListener(SpacesEvents.APP_MIC_ON, (stream) => {
    produceAudio(stream);
  });

  useEventListener(SpacesEvents.APP_MIC_OFF, () => {
    stopProducingAudio();
  });

  const sendSpeakerRequest = () => {
    const peerIds = Object.values(peers)
      .filter(({ role }) => role === 'host' || role === 'coHost')
      .map(({ peerId }) => peerId);
    sendData(peerIds, {
      'request-to-speak': me.meId
    });
  };

  return (
    <div className="flex justify-between border-t border-gray-300 pt-4 dark:border-gray-700">
      {['speaker', 'coHost', 'host'].includes(me.role) ? (
        <button
          onClick={() => {
            if (isAudioOn) {
              stopAudioStream();
            } else {
              fetchAudioStream();
            }
          }}
          className="bg-brand-100 text-brand-500 rounded-lg dark:bg-gray-800 dark:text-gray-400"
        >
          {isAudioOn ? Icons.mic.true : Icons.mic.false}
        </button>
      ) : (
        <button
          className="bg-brand-500 inline-flex h-5 items-center justify-start gap-1 rounded-lg px-2 py-4 dark:bg-brand-950"
          onClick={sendSpeakerRequest}
        >
          <MicrophoneIcon className="dark:text-brand-400 relative h-4 w-4 text-gray-50" />

          <div className="dark:text-brand-400 text-xs font-medium leading-none text-gray-50">
            <Trans>Request to speak</Trans>
          </div>
        </button>
      )}
      <div className="flex gap-2">
        {['host', 'coHost'].includes(me.role) && (
          <Dropdown
            triggerChild={
              <div className="bg-brand-100 rounded-lg p-1.5 dark:bg-gray-800">
                <MusicNoteIcon className="text-brand-500 h-5 w-5 dark:text-gray-400" />
              </div>
            }
          >
            <div className="absolute -right-4 bottom-4 w-48 translate-x-1/2">
              <MusicTray />
            </div>
          </Dropdown>
        )}
        <Dropdown
          triggerChild={
            <div className="bg-brand-100 rounded-lg p-1.5 dark:bg-gray-800">
              <EmojiHappyIcon className="text-brand-500 h-5 w-5 dark:text-gray-400" />
            </div>
          }
        >
          <div className="absolute -right-4 bottom-4 w-48 translate-x-1/2">
            <EmojiTray />
          </div>
        </Dropdown>
        <button
          className="bg-brand-100 text-brand-500 flex h-full items-center gap-2 rounded-lg px-2 font-normal dark:bg-gray-800 dark:text-gray-400"
          onClick={() => {
            setSidebarView(sidebarView === 'peers' ? 'close' : 'peers');
          }}
        >
          <UserIcon className="h-5 w-5" />
          {Object.keys(peers).filter((peerId) => peerId !== me.meId).length + 1}
        </button>
      </div>
    </div>
  );
};

export default SpacesWindowBottomBar;
