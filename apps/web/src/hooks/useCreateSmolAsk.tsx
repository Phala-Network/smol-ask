import { INTENTS_MUMBAI, IS_MAINNET } from '@lenster/data/constants';
// import { Localstorage } from '@lenster/data/storage';
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
  const response = JSON.stringify({
    description: publicationContent,
    choices: smolAskConfig.choices,
    length: smolAskConfig.length,
    isMainnet: IS_MAINNET
  });

  const nowMs = Date.now();

  const createSmolAsk = async (): Promise<CreateSmolAskResponse> => {
    try {
      //  TODO REPLACE with Phat Contract
      const response = await axios.post(
        `${INTENTS_MUMBAI}add-intent`,
        {
          owner: `${currentProfile?.ownedBy}`,
          sellAmount: 1000000000000000000,
          sellToken: 'ommitted',
          buyToken: 'ommitted',
          deadline: nowMs + 20000
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return `Smol ask by @${currentProfile?.handle}\n\n${response}`;
    } catch (error) {
      throw error;
    }
  };

  return [createSmolAsk];
};

export default useCreateSmolAsk;
