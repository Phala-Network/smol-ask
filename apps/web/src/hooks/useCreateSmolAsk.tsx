import { IS_MAINNET, SNAPSHOR_RELAY_WORKER_URL } from '@lenster/data/constants';
import { Localstorage } from '@lenster/data/storage';
import axios from 'axios';
import { useAppStore } from 'src/store/app';
import { usePublicationStore } from 'src/store/publication';

type CreateSmolAskResponse = string;

const useCreateSmolAsk = (): [
  createSmolAsk: () => Promise<CreateSmolAskResponse>
] => {
  const currentProfile = useAppStore((state) => state.currentProfile);
  const smolAskConfig = usePublicationStore((state) => state.smolAskConfig);
  const publicationContent = usePublicationStore(
    (state) => state.publicationContent
  );

  const createSmolAsk = async (): Promise<CreateSmolAskResponse> => {
    try {
      const response = await axios.post(
        `${SNAPSHOR_RELAY_WORKER_URL}/createSmolAsk`,
        {
          title: `Smol ask by @${currentProfile?.handle}`,
          description: publicationContent,
          choices: smolAskConfig.choices,
          length: smolAskConfig.length,
          isMainnet: IS_MAINNET
        },
        {
          headers: {
            'X-Access-Token': localStorage.getItem(Localstorage.AccessToken)
          }
        }
      );

      return `${publicationContent}\n\n${response.data.snapshotUrl}`;
    } catch (error) {
      throw error;
    }
  };

  return [createSmolAsk];
};

export default useCreateSmolAsk;
